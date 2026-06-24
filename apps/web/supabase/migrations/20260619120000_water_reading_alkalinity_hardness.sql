-- Chemistry panel correction (#170): the spa test set in buffer-correct order is
-- Total Alkalinity → pH → Calcium Hardness → Sanitizer. Alkalinity buffers pH so
-- it's tested/corrected first. Add the two missing strip values; keep
-- sanitizer_ppm. temp_f is left in place (additive principle) but the UI stops
-- reading/writing it. Additive + nullable, so existing rows and the
-- water_reading_write/select/proof RLS policies are unaffected (they cover the
-- whole row).

alter table water_reading
  add column total_alkalinity numeric,  -- ppm; target band 80–120
  add column calcium_hardness numeric;  -- ppm; target band 150–250

comment on column water_reading.total_alkalinity is 'Total alkalinity (ppm). Tested/corrected first — buffers pH. Target 80–120.';
comment on column water_reading.calcium_hardness is 'Calcium hardness (ppm). Target 150–250.';
