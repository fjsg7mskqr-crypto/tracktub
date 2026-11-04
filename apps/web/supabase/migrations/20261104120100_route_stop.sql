-- route_stop: a tub the operator added to today's route by hand (Home status
-- board, 2026-11-04 design). Other stops are derived (visited today, a draft
-- open, care due); only hand-added ones are stored. One row per tub per day.
-- ADDITIVE ONLY: a new table with its own policies. Nothing existing changes.
create table route_stop (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references org(id) on delete cascade,
  property_id uuid not null references property(id) on delete cascade,
  day         date not null,
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (property_id, day)
);
create index on route_stop (org_id, day);

alter table route_stop enable row level security;

-- Mirrors task's write gate (team logins who run visits on the tub). Reads use
-- the same gate, not app_can_see_property: the route is the team's plan, not
-- something a tub's owner sees.
create policy route_stop_select on route_stop for select to authenticated
  using (app_can_capture_property(property_id));
create policy route_stop_write on route_stop for all to authenticated
  using (app_can_capture_property(property_id))
  with check (
    app_can_capture_property(property_id)
    and exists (
      select 1 from property p
      where p.id = route_stop.property_id and p.org_id = route_stop.org_id
    )
  );
