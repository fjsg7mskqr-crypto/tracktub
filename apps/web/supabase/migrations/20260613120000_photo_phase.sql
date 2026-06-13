-- Before/after capture rework (epic #113, issue #116) — distinguish the single
-- "as found" BEFORE shot from the guided guest-ready AFTER set on each photo.
--
-- Backward-compatible: existing rows default to 'after' (the historical 4-slot
-- guided set). The BEFORE photo is stored as a single row with slot = 'wide',
-- phase = 'before'; no new photo_slot value is needed. RLS / immutability are
-- unaffected — photos still insert only while the turnover is `draft`, and the
-- existing guard (20260607031214) locks them once submitted.

create type capture_phase as enum ('before', 'after');

alter table photo add column phase capture_phase not null default 'after';

comment on column photo.phase is 'before = single as-found shot; after = guest-ready guided set';
