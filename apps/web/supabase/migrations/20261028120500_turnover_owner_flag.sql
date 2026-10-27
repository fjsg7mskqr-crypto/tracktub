-- Owner flag (app rebuild, Lane 1 follow-up; issue #324). A free-text note the
-- operator flags for the property owner, shown as "For the owner" on the record.
-- It is part of the turnover row, so turnover_update_draft (writable while
-- draft) and turnover_lock_guard (immutable once locked) already cover it.
-- ADDITIVE ONLY: one nullable column.
alter table turnover
  add column owner_flag text;

comment on column turnover.owner_flag is 'Free-text note the operator flags for the owner; shown as "For the owner" on the record.';
