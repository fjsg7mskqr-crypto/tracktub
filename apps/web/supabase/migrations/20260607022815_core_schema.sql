-- M1 core schema (PRD §10)
-- Applied to the live project (ref slkxwpiiludisrnwnxlg) via the Supabase MCP on 2026-06-07.
-- This file mirrors the remote migration `core_schema` (version 20260607022815).
create table profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table org (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  billing_ref text,
  created_at timestamptz not null default now()
);

create type member_role as enum ('operator', 'staff', 'owner');

create table membership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profile(id) on delete cascade,
  org_id uuid not null references org(id) on delete cascade,
  role member_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, org_id)
);

create table property (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  geofence_radius_m int not null default 150,
  tub_notes text,
  created_at timestamptz not null default now()
);

create table property_owner (
  property_id uuid not null references property(id) on delete cascade,
  owner_user_id uuid not null references profile(id) on delete cascade,
  primary key (property_id, owner_user_id)
);

create table staff_assignment (
  property_id uuid not null references property(id) on delete cascade,
  staff_user_id uuid not null references profile(id) on delete cascade,
  primary key (property_id, staff_user_id)
);

create type turnover_status as enum ('draft', 'submitted_locked');

create table turnover (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references property(id) on delete cascade,
  submitter_id uuid not null references profile(id),
  submitted_at_server timestamptz not null default now(),
  capture_lat double precision,
  capture_lng double precision,
  geofence_ok boolean,
  urgent boolean not null default false,
  notes text,
  status turnover_status not null default 'draft',
  version int not null default 1,
  share_token text unique,
  created_at timestamptz not null default now()
);

create type photo_slot as enum ('wide', 'waterline', 'panel', 'cover');

create table photo (
  id uuid primary key default gen_random_uuid(),
  turnover_id uuid not null references turnover(id) on delete cascade,
  storage_path text,
  slot photo_slot not null,
  captured_at timestamptz,
  ai_suggested_tags text[] not null default '{}',
  confirmed_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table issue_tag (
  id uuid primary key default gen_random_uuid(),
  turnover_id uuid not null references turnover(id) on delete cascade,
  tag text not null,
  source text not null check (source in ('ai', 'human')),
  confirmed_by uuid references profile(id),
  confirmed_at timestamptz
);

create table task (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references property(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  recurrence text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references profile(id),
  at timestamptz not null default now(),
  diff jsonb
);

create table invite (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id) on delete cascade,
  email text not null,
  role member_role not null,
  property_ids uuid[] not null default '{}',
  token text not null unique,
  invited_by uuid not null references profile(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index on membership (org_id);
create index on property (org_id);
create index on turnover (property_id);
create index on photo (turnover_id);
create index on staff_assignment (staff_user_id);
create index on property_owner (owner_user_id);
