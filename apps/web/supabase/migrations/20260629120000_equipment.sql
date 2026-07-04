-- equipment: per-property equipment records (epic #148, issue #151).
-- Reference data the tech keeps on hand; NOT dispute evidence -> no audit trigger.
create table equipment (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references property(id) on delete cascade,
  org_id        uuid not null references org(id) on delete cascade,
  type          text not null check (type in
                  ('tub_shell','pump','heater','cover','filter','control_pack','other')),
  make_model    text,
  installed_at  date,
  warranty_until date,
  notes         text,
  created_at    timestamptz not null default now(),
  archived_at   timestamptz   -- soft delete
);
create index on equipment (property_id);

-- org_note: single shared-notes blob per org (vendor contacts, account numbers).
create table org_note (
  org_id     uuid primary key references org(id) on delete cascade,
  body       text,
  updated_at timestamptz not null default now()
);

alter table equipment enable row level security;
alter table org_note  enable row level security;

-- equipment: see when property visible; write when a capturer (operator/assigned tech).
create policy equipment_select on equipment for select to authenticated
  using (app_can_see_property(property_id));
create policy equipment_write on equipment for all to authenticated
  using (app_can_capture_property(property_id))
  with check (
    app_can_capture_property(property_id)
    and org_id = (select p.org_id from property p where p.id = property_id)
  );

-- org_note: org members read; operator writes (mirrors org/membership RLS helpers).
create policy org_note_select on org_note for select to authenticated
  using (app_is_member(org_id));
create policy org_note_operator_write on org_note for all to authenticated
  using (app_has_role(org_id, 'operator'))
  with check (app_has_role(org_id, 'operator'));
