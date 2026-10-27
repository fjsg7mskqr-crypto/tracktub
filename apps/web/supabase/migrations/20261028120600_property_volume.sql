-- Tub volume (app rebuild, Lane 1 follow-up; issue #326). The tub's water
-- volume in US gallons, used to size chemical doses. Null means not recorded.
-- ADDITIVE ONLY: one nullable column with a range check on property.
alter table property
  add column volume_gallons int
    check (volume_gallons between 1 and 5000);

comment on column property.volume_gallons is 'Tub water volume in US gallons (1–5000), used to size chemical doses. Null = not recorded.';
