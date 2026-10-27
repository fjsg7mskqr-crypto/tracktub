-- Per-tub care intervals (app rebuild, Lane 1 task 1.2; D28). Null means "use
-- the default" (CARE_DEFAULTS in src/lib/readings.ts: drain 90, filter 60).
-- ADDITIVE ONLY: two nullable columns with range checks on property.
alter table property
  add column drain_interval_days int
    check (drain_interval_days between 1 and 730),
  add column filter_interval_days int
    check (filter_interval_days between 1 and 730);
