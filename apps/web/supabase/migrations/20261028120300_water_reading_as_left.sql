-- As-left reading (app rebuild, Lane 1 task 1.4; D27, additive form). One visit
-- keeps ONE water_reading row: the existing columns stay the as-found reading,
-- and these left_* columns hold the as-left reading taken after treatment.
-- unique(turnover_id), every existing query and the water_reading_* policies
-- (which cover the whole row: writable while draft, immutable once locked,
-- anon-readable via a locked + shared proof link) are unchanged.
-- ADDITIVE ONLY: six nullable columns and a backfill of one of them.
alter table water_reading
  add column left_total_alkalinity numeric,
  add column left_ph numeric,
  add column left_calcium_hardness numeric,
  add column left_sanitizer_ppm numeric,
  add column found_recorded_at timestamptz,
  add column left_recorded_at timestamptz;

comment on column water_reading.left_total_alkalinity is 'As-left total alkalinity (ppm), after treatment. Target 80–120.';
comment on column water_reading.left_ph is 'As-left pH, after treatment. Target 7.2–7.8.';
comment on column water_reading.left_calcium_hardness is 'As-left calcium hardness (ppm), after treatment. Target 150–250.';
comment on column water_reading.left_sanitizer_ppm is 'As-left sanitizer (ppm), after treatment.';
comment on column water_reading.found_recorded_at is 'When the as-found reading was logged. Null on rows written by the legacy capture flow after this migration — read coalesce(found_recorded_at, recorded_at).';
comment on column water_reading.left_recorded_at is 'When the as-left reading was logged.';

-- Every existing reading is an as-found reading taken at recorded_at.
update water_reading
set found_recorded_at = recorded_at
where found_recorded_at is null;
