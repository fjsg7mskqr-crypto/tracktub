# Operations Schedule — scheduling backend (`scheduled_item`)

**Issue:** #157 (part of epic #156, Operations Schedule / ops calendar)
**Date:** 2026-06-14
**Status:** Design approved by founder — ready for implementation plan
**Branch:** `operations-schedule-backend`

## Goal

A unified "scheduled work" backend that the Operations Schedule calendar (UI lands
in #156 part 2) renders: **maintenance occurrences**, **scheduled turnovers**, and
**custom tasks** — each placeable on a date, assignable, and markable done.

## Decisions (founder brainstorm, 2026-06-14)

1. **Day-level granularity.** `scheduled_for` is a `date`, not a `timestamptz`. No
   time-of-day blocks; the week view is denser day columns with a stack of items
   per day. Scheduling cleaning/maintenance by day is how the work actually
   happens; an hourly grid is overkill for v1.
2. **Maintenance = compute-on-read.** Do not persist future maintenance
   occurrences. The calendar overlays each `maintenance_task`'s next due date by
   reading `lib/maintenance.ts`. A row is persisted only when someone *acts on* an
   occurrence (mark done / reschedule). Single source of truth, no generator job,
   no drift.
3. **Notify the assignee on assign.** Reuse the #117 in-app notification fan-out:
   new `notification_type 'assigned'` + SECURITY-DEFINER writer.
4. **Custom tasks are one-off only.** Recurring needs are served by
   `maintenance_task` (#150). No second recurrence engine in `scheduled_item`.
5. **Turnover auto-fulfill on capture.** When a cleaner captures (locks) a
   turnover, a matching scheduled turnover is auto-flipped to `done` and linked.
   Matching is deterministic and single-row (rules below).

## Data model

RLS-scoped per org/property, mirroring `maintenance_task` / `water_reading`.

```sql
create type scheduled_item_kind   as enum ('turnover','maintenance','custom');
create type scheduled_item_status as enum ('scheduled','done','skipped');
create type scheduled_item_source as enum ('manual','auto');

create table scheduled_item (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references property(id) on delete cascade,
  org_id              uuid not null references org(id) on delete cascade, -- denormalized for capturer write check
  kind                scheduled_item_kind not null,
  title               text not null,
  scheduled_for       date not null,                       -- DAY-level (decision 1)
  assignee_user_id    uuid references auth.users(id) on delete set null,
  status              scheduled_item_status not null default 'scheduled',
  source              scheduled_item_source not null default 'manual',
  maintenance_task_id uuid references maintenance_task(id) on delete set null, -- set when a maintenance occurrence is acted on
  turnover_id         uuid references turnover(id) on delete set null,          -- set when fulfilled by a capture
  notes               text,
  created_at          timestamptz not null default now(),
  done_at             timestamptz,                          -- set when flipped to done
  archived_at         timestamptz                           -- soft delete
);
create index on scheduled_item (property_id, scheduled_for);
```

### RLS (identical pattern to `maintenance_task`)

- `select` to `authenticated` `using (app_can_see_property(property_id))`.
- write (`for all`) to `authenticated`
  `using (app_can_capture_property(property_id))`
  `with check (app_can_capture_property(property_id) and org_id = (select p.org_id from property p where p.id = property_id))`
  — the denormalized `org_id` can't be spoofed onto another property's org.

### Audit

Extend the existing `log_evidence_change()` SECURITY-DEFINER writer by adding
`scheduled_item` to the `property_id`-resolution branch (the same `in (...)` list
that already holds `turnover`, `maintenance_task`, `maintenance_log`). This is an
**additive** edit to a shared function but introduces **no behavior change** to
existing tables — it only adds an org-resolution path for a new table. Add an
`after insert or update` trigger `audit_scheduled_item`.

> Note this still touches a shared object (`log_evidence_change`). Per CLAUDE.md
> the change is mechanical/additive (new table in the branch list, no redefinition
> of existing behavior); call it out in the PR. Validate on the local stack and CI
> `rls` replay before it reaches the shared DB.

### Legacy `task` table

The unused generic `task` table in `core_schema` (`property_id, title, due_at,
recurrence, status`) is **left untouched**. `scheduled_item` supersedes it
conceptually, but dropping an existing table is a flagged shared-object change and
out of scope here. Retiring it is a separate, founder-signed-off change.

## Server actions (`src/lib/actions/scheduled.ts`)

Plain RLS-gated writes performed as the authenticated capturer:

- `createScheduledItem` — manual turnover / custom task (and the first persist of a
  touched maintenance occurrence).
- `editScheduledItem` — title / notes.
- `rescheduleScheduledItem` — change `scheduled_for`.
- `assignScheduledItem` — set `assignee_user_id`; fires the assignment
  notification when the new assignee is non-null and not the actor (decision 3).
- `markScheduledItemDone` — set `status='done'`, `done_at=now()`. For a maintenance
  occurrence, this also writes a `maintenance_log` row (the existing completion
  evidence path) and updates `maintenance_task.last_done_at`.
- `skipScheduledItem` — set `status='skipped'`.

## Maintenance overlay (compute-on-read)

The calendar data loader returns:

1. all `scheduled_item` rows in the visible range, **plus**
2. for each `maintenance_task` on visible properties, its next due date computed via
   `lib/maintenance.ts` (`maintenanceStatus`), rendered as a **virtual** item.

A virtual maintenance item carries no row until acted on. Acting on it
(`markScheduledItemDone` / `rescheduleScheduledItem`) persists a `scheduled_item`
with `source='auto'`, `kind='maintenance'`, `maintenance_task_id` set — and
mark-done additionally writes `maintenance_log` + bumps `last_done_at`. The loader
must de-dupe: if a persisted `scheduled_item` already exists for a
`(maintenance_task_id, scheduled_for)`, render that and suppress the computed
virtual occurrence for that date.

## Assignment notification (decision 3)

Additive changes to the `notification` feature (#117):

- Extend `notification_type` enum with `'assigned'`.
- Add nullable column `notification.scheduled_item_id uuid references
  scheduled_item(id) on delete cascade` (additive).
- Partial unique index for idempotent fan-out:
  `(user_id, scheduled_item_id, type) where scheduled_item_id is not null`.
- SECURITY-DEFINER writer `notify_scheduled_assignment(p_scheduled_item_id uuid)`
  mirroring `notify_turnover_ready`: authorizes via `app_can_capture_property`,
  inserts one `assigned` notification for the assignee (skipping self-assign),
  `on conflict do nothing`. `revoke execute ... from public, anon; grant ... to
  authenticated`.
- Called from `assignScheduledItem` after the assignee changes to a non-null,
  non-actor user.

Message form: `"<property> turnover — scheduled <date>"` /
`"<property> — <title> scheduled <date>"`.

## Turnover auto-fulfill (decision 5)

SECURITY-DEFINER RPC `fulfill_scheduled_turnover(p_turnover_id uuid)`, called from
the turnover submit/lock action right after `notify_turnover_ready`.

**Matching rule** (deterministic, single-row, never ambiguous):

> Among `scheduled_item` where `property_id` = the turnover's property,
> `kind='turnover'`, `status='scheduled'`, `turnover_id is null`, and
> `scheduled_for` within **±2 days** of the capture date (server `submitted_at_server`
> cast to date) → pick the row with `scheduled_for` closest to the capture date.
> Tie-break: earliest `scheduled_for`, then earliest `created_at`. Flip that row to
> `status='done'`, set `turnover_id` + `done_at`. No match → ad-hoc turnover, no-op.

Authorize via `app_can_capture_property(<turnover's property>)` exactly like
`notify_turnover_ready`, and confirm the turnover is `submitted_locked`. SECURITY
DEFINER so it can write the (possibly operator-owned) `scheduled_item` row from the
capturing staff member's session. `revoke ... from public, anon; grant ... to
authenticated`.

## Testing

- **RLS isolation cases** (CI `rls` replay) — the load-bearing verification:
  - cross-org and cross-property `select`/write denial on `scheduled_item`;
  - `org_id` spoof in `with check` rejected;
  - a non-capturer cannot write a `scheduled_item`;
  - `notify_scheduled_assignment` cannot be invoked to author a notification for
    another org's user (authorization gate holds);
  - `fulfill_scheduled_turnover` only fulfills items on properties the caller can
    capture, and never an item already linked / outside the window.
- **Migration replays clean** from empty on the CI `rls` job.
- `lib/maintenance.ts` already has pure tests; matching logic lives in SQL and is
  covered by the RLS/replay suite (no new pure-TS module needed).

## Done when

The model + actions exist, RLS proven with the new isolation cases, migration
replays clean, `lint`/`typecheck`/`build` + `rls` green. PR `--base main`,
self-merge. UI lands separately in #156 part 2.

## Out of scope

- The calendar UI (week/day views) — #156 part 2.
- Recurring custom tasks (decision 4 — use `maintenance_task`).
- Dropping/retiring the legacy `task` table (separate flagged change).
- Time-of-day scheduling / durations (decision 1 — revisit only if day-level
  proves insufficient).
