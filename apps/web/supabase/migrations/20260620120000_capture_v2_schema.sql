-- Capture flow v2 foundation (#175, epic #174): additive schema for the new
-- photo model, issue captions, and cleaning checklist on turnover.
-- Legacy photo_slot values (wide/waterline/panel) remain for existing rows;
-- new captures use full_frame/water_level/cover/issue. RLS / immutability
-- guards are row-level and unaffected by new columns or enum values.

alter type photo_slot add value if not exists 'full_frame';
alter type photo_slot add value if not exists 'water_level';
alter type photo_slot add value if not exists 'issue';

alter table photo add column caption text;

comment on column photo.caption is 'Optional one-line caption on issue photos (capture v2).';

alter table turnover
  add column cleaning_steps text[] not null default '{}';

comment on column turnover.cleaning_steps is
  'Completed cleaning checklist step codes (capture v2): water_topped, wiped, debris_removed, filters_cleaned, reassembled.';
