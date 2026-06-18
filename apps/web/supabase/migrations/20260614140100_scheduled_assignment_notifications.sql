-- Assignment notifications for scheduled work (issue #157). When a scheduled
-- item is assigned to a staff member, notify that assignee in-app, reusing the
-- #117 notification feed. Additive column + new enum value + a SECURITY-DEFINER
-- writer mirroring notify_turnover_ready. (Touches the SHARED notification table
-- + enum — flag for founder sign-off before the shared DB; see plan Task 9.)

alter type notification_type add value if not exists 'assigned';

alter table notification
  add column if not exists scheduled_item_id uuid
    references scheduled_item(id) on delete cascade;

-- Idempotent fan-out for assignment notifications (turnover_id is null for
-- these, so the existing recipient_turnover index doesn't apply).
create unique index if not exists notification_recipient_scheduled_idx
  on notification (user_id, scheduled_item_id, type)
  where scheduled_item_id is not null;

-- Writer: author one 'assigned' notification for the item's assignee. Gated on
-- the caller being able to capture the property (so it can't be abused to spam
-- arbitrary users), and skips self-assignment. SECURITY DEFINER so it can write
-- a row for another user and read profile/property despite RLS.
create or replace function notify_scheduled_assignment(p_scheduled_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_org_id uuid;
  v_property_name text;
  v_assignee uuid;
  v_kind scheduled_item_kind;
  v_title text;
  v_when date;
begin
  select si.property_id, si.org_id, p.name, si.assignee_user_id,
         si.kind, si.title, si.scheduled_for
    into v_property_id, v_org_id, v_property_name, v_assignee,
         v_kind, v_title, v_when
  from scheduled_item si
  join property p on p.id = si.property_id
  where si.id = p_scheduled_item_id;

  -- No-op unless the item has an assignee, the caller can capture the property,
  -- and the assignee isn't the caller assigning themselves.
  if v_assignee is null
     or v_property_id is null
     or not app_can_capture_property(v_property_id)
     or v_assignee = auth.uid() then
    return;
  end if;

  insert into notification (user_id, org_id, type, scheduled_item_id, property_id, message)
  values (
    v_assignee, v_org_id, 'assigned', p_scheduled_item_id, v_property_id,
    case when v_kind = 'turnover'
         then v_property_name || ' turnover — scheduled ' || to_char(v_when, 'FMMon FMDD')
         else v_property_name || ' — ' || v_title || ' scheduled ' || to_char(v_when, 'FMMon FMDD')
    end
  )
  on conflict (user_id, scheduled_item_id, type) where scheduled_item_id is not null
  do nothing;
end;
$$;

revoke execute on function public.notify_scheduled_assignment(uuid) from public, anon;
grant  execute on function public.notify_scheduled_assignment(uuid) to authenticated;
