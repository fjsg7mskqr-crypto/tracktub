-- Operations Schedule backend (epic #156, issue #157). A unified "scheduled
-- work" row the ops calendar renders: manual turnovers, custom tasks, and
-- maintenance occurrences that have been ACTED ON (maintenance is otherwise
-- computed-on-read from maintenance_task — see lib/schedule.ts). Day-level
-- scheduling (scheduled_for is a date, no time-of-day). RLS mirrors
-- maintenance_task: visible to anyone who can see the property; writable by a
-- capturer (operator OR assigned staff/tech), not the host.

create type scheduled_item_kind   as enum ('turnover', 'maintenance', 'custom');
create type scheduled_item_status as enum ('scheduled', 'done', 'skipped');
create type scheduled_item_source as enum ('manual', 'auto');

create table scheduled_item (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references property(id) on delete cascade,
  org_id              uuid not null references org(id) on delete cascade, -- denormalized for capturer write check
  kind                scheduled_item_kind not null,
  title               text not null,
  scheduled_for       date not null,
  assignee_user_id    uuid references auth.users(id) on delete set null,
  status              scheduled_item_status not null default 'scheduled',
  source              scheduled_item_source not null default 'manual',
  maintenance_task_id uuid references maintenance_task(id) on delete set null,
  turnover_id         uuid references turnover(id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now(),
  done_at             timestamptz,
  archived_at         timestamptz
);

create index on scheduled_item (property_id, scheduled_for);

alter table scheduled_item enable row level security;

-- Anyone who can see the property reads; a capturer writes. org_id can't be
-- spoofed onto another property's org (mirrors maintenance_task_write).
create policy scheduled_item_select on scheduled_item for select to authenticated
  using (app_can_see_property(property_id));

create policy scheduled_item_write on scheduled_item for all to authenticated
  using (app_can_capture_property(property_id))
  with check (
    app_can_capture_property(property_id)
    and org_id = (select p.org_id from property p where p.id = property_id)
  );

-- Extend the audit writer to resolve org via property_id for scheduled_item
-- too. This only ADDS a new table to the existing property_id branch; behavior
-- for every existing table is unchanged. (SHARED OBJECT — flagged for founder
-- sign-off before applying to the shared/prod DB; out of scope for this task.)
create or replace function log_evidence_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_diff jsonb;
begin
  if tg_table_name in ('turnover', 'maintenance_task', 'maintenance_log', 'scheduled_item') then
    select p.org_id into v_org from property p where p.id = new.property_id;
  else
    -- issue_tag / photo / water_reading carry turnover_id
    select p.org_id into v_org
      from turnover t join property p on p.id = t.property_id
      where t.id = new.turnover_id;
  end if;

  if tg_op = 'INSERT' then
    v_diff := jsonb_build_object('new', to_jsonb(new));
  else
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;

  if v_org is not null then
    insert into audit_log(org_id, entity, entity_id, action, actor_id, diff)
    values (v_org, tg_table_name, new.id, tg_op, auth.uid(), v_diff);
  end if;

  return new;
end;
$$;

revoke execute on function public.log_evidence_change() from public;

create trigger audit_scheduled_item
  after insert or update on scheduled_item
  for each row execute function log_evidence_change();

-- Auto-fulfill: when a captured turnover locks, link it to a matching scheduled
-- turnover and flip that row to done. Deterministic single-row match: same
-- property, kind='turnover', still scheduled, not yet linked, scheduled_for
-- within ±2 days of the capture date; pick closest date, tie-break earliest
-- scheduled_for then earliest created_at. No match → ad-hoc turnover, no-op.
-- SECURITY DEFINER so the capturing staff member can flip a row the operator
-- created; authorization is gated on app_can_capture_property, exactly like
-- notify_turnover_ready.
create or replace function fulfill_scheduled_turnover(p_turnover_id uuid)
returns uuid                          -- the fulfilled scheduled_item id, or null
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_capture_date date;
  v_match uuid;
begin
  select t.property_id, (t.submitted_at_server)::date
    into v_property_id, v_capture_date
  from turnover t
  where t.id = p_turnover_id
    and t.status = 'submitted_locked';

  if v_property_id is null or not app_can_capture_property(v_property_id) then
    return null;
  end if;

  select si.id into v_match
  from scheduled_item si
  where si.property_id = v_property_id
    and si.kind = 'turnover'
    and si.status = 'scheduled'
    and si.turnover_id is null
    and abs(si.scheduled_for - v_capture_date) <= 2
  order by abs(si.scheduled_for - v_capture_date) asc,
           si.scheduled_for asc,
           si.created_at asc
  limit 1
  for update skip locked;

  if v_match is null then
    return null;
  end if;

  update scheduled_item
    set status = 'done', turnover_id = p_turnover_id, done_at = now()
    where id = v_match;

  return v_match;
end;
$$;

revoke execute on function public.fulfill_scheduled_turnover(uuid) from public, anon;
grant  execute on function public.fulfill_scheduled_turnover(uuid) to authenticated;
