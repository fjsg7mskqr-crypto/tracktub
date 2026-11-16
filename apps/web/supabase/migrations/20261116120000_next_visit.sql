-- next_visit: "check this tub again on <day>" scheduled from a visit's finish
-- step (issue #401). One row per tub: scheduling again replaces it. It shows
-- on the Calendar and Home until the next visit on that tub starts, which
-- stamps started_visit_id (the reason then shows in that visit's brief).
-- ADDITIVE ONLY: a new table with its own policies. No existing table,
-- function, trigger or policy changes.
create table next_visit (
  property_id        uuid primary key references property(id) on delete cascade,
  org_id             uuid not null references org(id) on delete cascade,
  due_on             date not null,
  reason             text check (reason is null or char_length(reason) <= 120),
  started_visit_id   uuid references turnover(id) on delete set null,
  set_at_visit_id    uuid references turnover(id) on delete set null,
  created_by         uuid default auth.uid() references auth.users(id) on delete set null,
  created_at         timestamptz not null default now()
);
create index on next_visit (org_id, due_on);

alter table next_visit enable row level security;

-- Same gate as route_stop / task: team logins who run visits on the tub.
create policy next_visit_select on next_visit for select to authenticated
  using (app_can_capture_property(property_id));
create policy next_visit_write on next_visit for all to authenticated
  using (app_can_capture_property(property_id))
  with check (
    app_can_capture_property(property_id)
    and exists (
      select 1 from property p
      where p.id = next_visit.property_id and p.org_id = next_visit.org_id
    )
  );
