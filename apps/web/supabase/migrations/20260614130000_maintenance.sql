-- Maintenance schedules (epic #148, issue #150). Recurring per-property
-- maintenance the operator/tech tracks: filter clean (every N turnovers),
-- drain & refill / cover inspection (every N days/weeks/months). Surfaces
-- what is due/overdue in the Operations > Maintenance module and on the
-- dashboard attention signal.
--
-- RLS mirrors `water_reading`/`property`: visible to anyone who can see the
-- property; writable by a *capturer* (operator OR assigned staff/tech), NOT the
-- owner/host — the tech drives maintenance because the host doesn't know the
-- chemistry/filter state. `maintenance_log` is immutable completion evidence.

create type maintenance_recurrence_kind as enum ('time', 'turnover');
create type maintenance_recurrence_unit as enum ('day', 'week', 'month');

create table maintenance_task (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references property(id) on delete cascade,
  org_id           uuid not null references org(id) on delete cascade, -- denormalized for operator/capturer write check
  title            text not null,
  recurrence_kind  maintenance_recurrence_kind not null,
  recurrence_value integer not null check (recurrence_value > 0),
  recurrence_unit  maintenance_recurrence_unit,  -- non-null iff kind = 'time'
  last_done_at     timestamptz,                  -- null = never done yet
  notes            text,
  created_at       timestamptz not null default now(),
  archived_at      timestamptz,                  -- soft delete
  -- unit present exactly when the task is time-based
  constraint maintenance_task_unit_matches_kind check (
    (recurrence_kind = 'time'     and recurrence_unit is not null) or
    (recurrence_kind = 'turnover' and recurrence_unit is null)
  )
);

create index on maintenance_task (property_id);

create table maintenance_log (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references maintenance_task(id) on delete cascade,
  property_id uuid not null references property(id) on delete cascade, -- denormalized for RLS + cross-property guard
  done_at     timestamptz not null default now(),
  done_by     uuid references auth.users(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index on maintenance_log (task_id);

alter table maintenance_task enable row level security;
alter table maintenance_log  enable row level security;

-- maintenance_task: anyone who can see the property reads; capturer writes.
create policy maintenance_task_select on maintenance_task for select to authenticated
  using (app_can_see_property(property_id));

create policy maintenance_task_write on maintenance_task for all to authenticated
  using (app_can_capture_property(property_id))
  with check (
    app_can_capture_property(property_id)
    -- org_id can't be spoofed onto another property's org
    and org_id = (select p.org_id from property p where p.id = property_id)
  );

-- maintenance_log: readable when the property is visible; insert by a capturer
-- and only against a task that belongs to the SAME property (no cross-property
-- log injection). Immutable — no update/delete policy.
create policy maintenance_log_select on maintenance_log for select to authenticated
  using (app_can_see_property(property_id));

create policy maintenance_log_insert on maintenance_log for insert to authenticated
  with check (
    app_can_capture_property(property_id)
    and exists (
      select 1 from maintenance_task mt
      where mt.id = task_id and mt.property_id = maintenance_log.property_id
    )
  );

-- Extend the SECURITY DEFINER audit writer (20260608022512) to handle the
-- maintenance tables. The original resolved org via `new.turnover_id` for every
-- non-turnover table — but maintenance_task / maintenance_log have no
-- turnover_id (they carry property_id directly), so attaching the unchanged
-- trigger would raise "record new has no field turnover_id" on insert. Resolve
-- org via property_id for every table that carries it; keep the turnover_id
-- path for the evidence children (issue_tag / photo / water_reading).
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
  if tg_table_name in ('turnover', 'maintenance_task', 'maintenance_log') then
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

create trigger audit_maintenance_task
  after insert or update on maintenance_task
  for each row execute function log_evidence_change();

create trigger audit_maintenance_log
  after insert or update on maintenance_log
  for each row execute function log_evidence_change();
