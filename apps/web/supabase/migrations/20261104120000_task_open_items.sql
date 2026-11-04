-- Open items (Home status board, 2026-11-04 design): something left unfinished
-- at one visit to settle at a later one ("Filters soaking", "Re-check pH", …).
-- Stored on the existing task table: status goes open → settled | dismissed.
-- ADDITIVE ONLY: nullable columns and an index. task's existing policies
-- (task_select = app_can_see_property, task_write = app_can_capture_property)
-- and every function stay exactly as they are.
alter table task
  add column kind text
    check (kind in ('filter_soak', 'recheck', 'part', 'other')),
  add column note text,
  add column opened_visit_id uuid references turnover(id) on delete set null,
  add column settled_visit_id uuid references turnover(id) on delete set null,
  add column settled_at timestamptz,
  add column created_by uuid default auth.uid()
    references auth.users(id) on delete set null;

comment on column task.kind is 'Open item kind: filter_soak | recheck | part | other. Null for tasks that are not open items.';
comment on column task.opened_visit_id is 'The visit (turnover) the open item was left at.';
comment on column task.settled_visit_id is 'The visit it was settled at; null when settled from Home outside a visit.';

-- Home reads every open item at once.
create index task_open_by_property on task (property_id) where status = 'open';
