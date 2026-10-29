-- Prod schema fix-up (app rebuild, Lane 1 task 1.6 drift audit). The shared DB
-- never received 20260620120000_capture_v2_schema, so prod lacks
-- turnover.cleaning_steps, photo.caption and three photo_slot values — while
-- prod code reads/writes them (/proof/[token] selects cleaning_steps; the
-- capture flow writes it). This re-applies that migration idempotently: a
-- no-op on any DB that replayed the history (local, CI), the missing pieces on
-- prod. ADDITIVE ONLY. Coordinator-approved 2026-10-27.
--
-- Deliberately NOT included (also never reached prod; need founder sign-off as
-- they change an existing shared table's policies/config):
-- 20260622120000 / 20260624120000 storage.objects policies, and
-- 20260622130000 photos bucket size limit.
alter type photo_slot add value if not exists 'full_frame';
alter type photo_slot add value if not exists 'water_level';
alter type photo_slot add value if not exists 'issue';

alter table photo add column if not exists caption text;
comment on column photo.caption is 'Optional one-line caption on issue photos (capture v2).';

alter table turnover
  add column if not exists cleaning_steps text[] not null default '{}';
comment on column turnover.cleaning_steps is
  'Completed cleaning checklist step codes (capture v2): water_topped, wiped, debris_removed, filters_cleaned, reassembled.';
