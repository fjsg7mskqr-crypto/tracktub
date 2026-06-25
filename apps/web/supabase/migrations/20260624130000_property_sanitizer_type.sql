-- Per-property sanitizer type (#178, fast-follow of capture-v2 epic #174).
-- A tub runs either chlorine or bromine; the healthy residual band differs
-- (Chlorine 1–3 ppm · Bromine 3–5 ppm), so the readings panel labels the
-- sanitizer field and flags it against the right band per property.
--
-- Strictly additive: a new enum type + a new NOT NULL column DEFAULTED to
-- 'chlorine'. Existing rows backfill to the default; no shared object (function,
-- trigger, or RLS policy on an existing table) is touched — the existing
-- property RLS policies already cover the whole row, so the new column inherits
-- the same access. Replays cleanly from an empty database.

create type sanitizer_type as enum ('chlorine', 'bromine');

alter table property
  add column sanitizer_type sanitizer_type not null default 'chlorine';

comment on column property.sanitizer_type is
  'Sanitizer the tub runs on (#178). Drives the readings-panel label and target band: chlorine 1–3 ppm, bromine 3–5 ppm. Defaults to chlorine.';
