-- Record the time zone a visit happened in.
--
-- ADDITIVE: one nullable column, no default. Existing rows stay null and their
-- reports fall back to America/Detroit. NOT applied to the shared DB — the
-- coordinator applies it (CLAUDE.md schema-change rule). Written by the app
-- through the same RLS-checked insert/update paths as every other turnover
-- column (turnover_insert / turnover_update); no new policy.

alter table public.turnover
  add column time_zone text
  constraint turnover_time_zone_len
    check (time_zone is null or char_length(time_zone) between 1 and 64);

comment on column public.turnover.time_zone is
  'IANA zone of the device that started the visit (e.g. America/Los_Angeles). Reports show the visit''s times in it.';
