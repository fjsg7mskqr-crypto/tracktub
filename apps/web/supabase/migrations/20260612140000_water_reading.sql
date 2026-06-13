-- Water readings (epic #95, issue #99) — pH / sanitizer / temp captured with
-- every turnover, persisted into the immutable proof record and seeding the
-- chemistry dataset that the #100 chemistry-aware layer runs on.
--
-- A child table (not columns on turnover) keeps the #100 trend queries clean.
-- RLS mirrors `photo`: visible when the property is visible; writable only by a
-- capturer while the turnover is still `draft`; immutable once locked; readable
-- by anon through a locked + shared turnover's proof link.

create table water_reading (
  id uuid primary key default gen_random_uuid(),
  turnover_id uuid not null unique references turnover(id) on delete cascade,
  property_id uuid not null references property(id) on delete cascade, -- denormalized for #100 trend queries
  ph numeric,             -- nullable: a field may be skipped
  sanitizer_ppm numeric,  -- chlorine/bromine ppm
  temp_f numeric,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index on water_reading (property_id);

alter table water_reading enable row level security;

-- SELECT: the reading's property is visible to the member.
create policy water_reading_select on water_reading for select to authenticated
  using (app_can_see_property(property_id));

-- INSERT/UPDATE: a capturer, while the turnover is still draft, and the
-- denormalized property_id must match the turnover's property (no spoofing a
-- reading onto another property). Immutable once submitted_locked — parity with
-- the photo guard (20260607031214 / 20260607022901).
create policy water_reading_write on water_reading for all to authenticated
  using (
    exists (
      select 1 from turnover t
      where t.id = turnover_id
        and t.property_id = water_reading.property_id
        and app_can_capture_property(t.property_id)
        and t.status = 'draft'
    )
  )
  with check (
    exists (
      select 1 from turnover t
      where t.id = turnover_id
        and t.property_id = water_reading.property_id
        and app_can_capture_property(t.property_id)
        and t.status = 'draft'
    )
  );

-- Anon proof read: readings show on the public /proof/[token] page for locked,
-- shared turnovers only. Mirrors photo_public_proof (20260610120000).
create policy water_reading_public_proof on water_reading for select to anon
  using (
    exists (
      select 1 from turnover t
      where t.id = turnover_id
        and t.share_token is not null
        and t.status = 'submitted_locked'
    )
  );

-- Audit reading writes like photos: the existing SECURITY DEFINER trigger
-- function resolves org via turnover_id for any non-turnover evidence table
-- (20260608022512).
create trigger audit_water_reading
  after insert or update on water_reading
  for each row execute function log_evidence_change();
