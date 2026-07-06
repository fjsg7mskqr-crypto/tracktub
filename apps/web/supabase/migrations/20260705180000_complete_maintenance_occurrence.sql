-- Idempotent, atomic virtual-maintenance completion (#158, CodeRabbit).
create unique index if not exists scheduled_item_maint_date_uniq
  on scheduled_item (maintenance_task_id, scheduled_for)
  where maintenance_task_id is not null;

create or replace function complete_maintenance_occurrence(
  p_maintenance_task_id uuid, p_property_id uuid, p_org_id uuid,
  p_title text, p_scheduled_for date, p_note text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_item uuid; v_note text := nullif(btrim(p_note), '');
begin
  if not app_can_capture_property(p_property_id) then return null; end if;
  if p_org_id <> (select org_id from property where id = p_property_id) then return null; end if;

  -- idempotent: if this occurrence is already done, no-op
  select id into v_item from scheduled_item
    where maintenance_task_id = p_maintenance_task_id
      and scheduled_for = p_scheduled_for and status = 'done' limit 1;
  if v_item is not null then return v_item; end if;

  insert into scheduled_item (property_id, org_id, kind, title, scheduled_for,
    maintenance_task_id, source, status, done_at, notes)
  values (p_property_id, p_org_id, 'maintenance', p_title, p_scheduled_for,
    p_maintenance_task_id, 'auto', 'done', now(), v_note)
  on conflict (maintenance_task_id, scheduled_for) where maintenance_task_id is not null
    do update set status = 'done', done_at = now()
  returning id into v_item;

  insert into maintenance_log (task_id, property_id, done_by, note)
  values (p_maintenance_task_id, p_property_id, auth.uid(), v_note);
  update maintenance_task set last_done_at = now() where id = p_maintenance_task_id;
  return v_item;
end; $$;

revoke execute on function public.complete_maintenance_occurrence(uuid,uuid,uuid,text,date,text) from
  public, anon;
grant  execute on function public.complete_maintenance_occurrence(uuid,uuid,uuid,text,date,text) to
  authenticated;
