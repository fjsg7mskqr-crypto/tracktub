-- supply: per-property consumable inventory (epic #148, issue #152).
-- Operational reference, NOT dispute evidence -> no audit trigger.
create table supply (
  id              uuid primary key default gen_random_uuid(),
  property_id     uuid not null references property(id) on delete cascade,
  org_id          uuid not null references org(id) on delete cascade,
  name            text not null,
  unit            text,            -- 'lb','tabs','cartridge','strips','bottle', etc.
  quantity        numeric,         -- current on-hand
  reorder_at      numeric,         -- low-stock threshold; low when quantity <= reorder_at
  last_restocked_at date,
  notes           text,
  created_at      timestamptz not null default now(),
  archived_at     timestamptz      -- soft delete
);
create index on supply (property_id);

alter table supply enable row level security;

-- supply: see when property visible; write when a capturer (operator/assigned tech).
create policy supply_select on supply for select to authenticated
  using (app_can_see_property(property_id));
create policy supply_write on supply for all to authenticated
  using (app_can_capture_property(property_id))
  with check (
    app_can_capture_property(property_id)
    and org_id = (select p.org_id from property p where p.id = property_id)
  );
