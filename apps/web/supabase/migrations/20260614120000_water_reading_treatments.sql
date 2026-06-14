-- Chemistry capture upgrade (#132): the reading is the "as found" state; record
-- what the tech ADDED (treatments) + a "left balanced & guest-ready" attestation.
-- Matches the pro standard — service apps log the on-arrival reading + dosages,
-- not an unsettled post-balance reading. Additive + defaulted, so existing rows
-- and RLS policies are unaffected (the water_reading_write/select/proof policies
-- already cover the whole row).

alter table water_reading
  add column treatments text[] not null default '{}',
  add column treatment_note text,
  add column balanced boolean not null default false;

comment on column water_reading.treatments is 'Chemical treatments added at the turnover (codes: shock, sanitizer, ph_up, ph_down, alkalinity_up, clarifier).';
comment on column water_reading.treatment_note is 'Free-text for amounts / custom treatments.';
comment on column water_reading.balanced is 'Tech attestation that the water was left balanced / guest-ready.';
