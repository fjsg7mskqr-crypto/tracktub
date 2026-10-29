-- client: who a tub belongs to (app rebuild, Lane 1 task 1.1). Tubs are grouped
-- by client; one org (the operator's workspace) has many clients.
-- ADDITIVE ONLY: a new table, a new nullable column on property, a backfill.
-- No existing column, constraint, policy, function or trigger is changed.
create table client (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references org(id) on delete cascade,
  name          text not null,
  contact_email text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- target of property's (client_id, org_id) FK, so a tub can only point at a
  -- client in its own org.
  unique (id, org_id)
);
create index on client (org_id);

create or replace function client_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger client_touch_updated_at
  before update on client
  for each row execute function client_touch_updated_at();

alter table client enable row level security;

-- Mirrors property: org members read; the operator writes.
create policy client_select on client for select to authenticated
  using (app_is_member(org_id));
create policy client_operator_write on client for all to authenticated
  using (app_has_role(org_id, 'operator'))
  with check (app_has_role(org_id, 'operator'));

-- property.client_id: nullable. Deleting a client unlinks its tubs (client_id
-- only — org_id is untouched).
alter table property add column client_id uuid;
alter table property
  add constraint property_client_fk foreign key (client_id, org_id)
  references client (id, org_id) on delete set null (client_id);
create index on property (client_id);

-- Backfill: one client per existing org, named after the org; every property
-- is assigned to its org's client.
insert into client (org_id, name)
select o.id, o.name from org o;

update property p
set client_id = c.id
from client c
where c.org_id = p.org_id
  and p.client_id is null;
