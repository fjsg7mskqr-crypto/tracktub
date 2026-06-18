# Maintenance Schedule module — design

**Issue:** #150 (epic #148, Operations hub) · **Branch:** `operations-maintenance-schedule`
**Date:** 2026-06-14 · **Status:** approved (founder brainstorm)

## Goal

A **Maintenance Schedule** module under the Operations hub: recurring
per-property maintenance the tech/operator tracks (filter clean, drain & refill,
cover inspection), surfacing what is **due / overdue** — both in the module and
on the main Operations dashboard.

## Founder decisions (brainstorm 2026-06-14)

1. **Recurrence:** both **time-based** and **turnover-count-based**; each task
   uses exactly **one** mode.
2. **Surfacing:** Maintenance module **and** the Operations dashboard attention
   signal.
3. **Permissions:** operator **and** assigned staff/tech can define schedules and
   mark tasks done — the tech drives maintenance because the host doesn't know
   the chemistry/filter state. Owner/**host is read-only**. (Maps to existing
   `app_can_capture_property()`.)
4. **History:** keep a **`maintenance_log`** completion trail (evidence-layer DNA).
5. **Starter tasks:** add-schedule form offers one-tap **presets** (editable).

## Data model

Two new tables, mirroring `water_reading` conventions (denormalized
`property_id`/`org_id`, RLS via the property helpers, audit trigger, clean
replay).

### `maintenance_task` — the recurring schedule definition

```
id                uuid pk default gen_random_uuid()
property_id       uuid not null references property(id) on delete cascade
org_id            uuid not null references org(id) on delete cascade  -- denormalized for operator-write check
title             text not null
recurrence_kind   maintenance_recurrence_kind not null   -- enum('time','turnover')
recurrence_value  int not null check (recurrence_value > 0)  -- "3" (turnovers) or "90" (days)
recurrence_unit   maintenance_recurrence_unit null        -- enum('day','week','month'); null when kind='turnover'
last_done_at      timestamptz null                        -- null = never done yet
notes             text null
created_at        timestamptz not null default now()
archived_at       timestamptz null                        -- soft-delete; archived tasks hidden from the list
```

Constraint: `recurrence_unit` must be non-null iff `recurrence_kind = 'time'`.

### `maintenance_log` — completion history (immutable)

```
id           uuid pk default gen_random_uuid()
task_id      uuid not null references maintenance_task(id) on delete cascade
property_id  uuid not null references property(id) on delete cascade  -- denormalized for RLS + cross-property guard
done_at      timestamptz not null default now()
done_by      uuid null references auth.users(id) on delete set null
note         text null
created_at   timestamptz not null default now()
```

### Due / overdue computation (pure, no maintained counters)

Extracted into `apps/web/src/lib/maintenance.ts` so it is DB-free and unit-testable.

- **time** tasks: `next_due = last_done_at + recurrence_value · recurrence_unit`.
  Overdue when `now > next_due`. **Never done** (`last_done_at is null`) → due now.
- **turnover** tasks: count locked turnovers on the property with
  `submitted_at_server > last_done_at` (or all locked turnovers when never done);
  **due/overdue** when that count ≥ `recurrence_value`; "N left" = remaining.
- **Due-soon** threshold: within ~20% of the cycle, floored at ≤ 3 days
  (time) / ≤ 1 turnover (turnover).
- Status → pill tone (brand rule, green = success only):
  - overdue → `warn`
  - due soon → neutral/muted
  - ok → `ready` (green)

**Mark done** = insert a `maintenance_log` row **and** set
`maintenance_task.last_done_at = now()` (re-arms the next cycle).

## RLS (mirrors `water_reading` / `notification`)

### `maintenance_task`
- `SELECT` → `app_can_see_property(property_id)` (operator, staff/tech, owner/host).
- `INSERT/UPDATE/DELETE` (`for all`) → `app_can_capture_property(property_id)`
  (operator + assigned tech; host excluded), with `with check` enforcing the same
  and that `org_id` matches the property's org (no cross-property/org spoofing).
- Audit via existing `log_evidence_change()` trigger.

### `maintenance_log`
- `SELECT` → `app_can_see_property(property_id)`.
- `INSERT` → `app_can_capture_property(property_id)` **and** an `exists` check that
  `task_id`'s `maintenance_task.property_id = maintenance_log.property_id`
  (no cross-property log injection).
- **No** `UPDATE`/`DELETE` policy — logs are immutable evidence.

Migration is a single timestamped file replaying clean from empty. RLS suite gains
cases: capturer can write, host cannot, cross-property denied, log immutable.

## UI — `/operations/maintenance`

- New route under the hub. Flip `OperationsHeader` "Maintenance Schedule" from
  "Soon" → live link `/operations/maintenance`; pass `active="maintenance"`.
- List grouped **by property**, reusing `.dlist / .drow2 / .spill` primitives.
  Each task row: title · recurrence summary · status pill · `Mark done`.

```
Lakeside Cabin
  ├ Filter clean       every 3 turnovers   ·  2 left      [Mark done]
  ├ Drain & refill     every 90 days       ·  Overdue 6d  [Mark done]
  └ Cover inspection   every 30 days       ·  due in 4d   [Mark done]
```

- Operator/tech: **Add schedule** form (with editable presets), per-row **Edit**,
  **Mark done** (optional note → `maintenance_log`). Archived = soft delete.
- Host: same list, **read-only** (no action buttons).

### Presets (add-schedule)
One-tap, editable before save:
- Filter clean — every 3 turnovers
- Drain & refill — every 90 days
- Cover inspection — every 30 days

## Dashboard surfacing (`/operations`)

Extend the existing per-property `attention` derivation: a property with any
**overdue** maintenance task contributes to its attention state and the header's
"N need attention" count. Card shows a small "Maintenance: N overdue" line. The
dashboard loads each property's `maintenance_task` rows alongside its existing
turnover data and derives overdue inline (no per-card extra round trips).

## Testing & verification

- **RLS suite**: both tables — capturer writes, host denied, cross-property
  denied, log immutable.
- **Unit test** for `lib/maintenance.ts`: time + turnover, never-done, due-soon
  boundary, overdue.
- `npm run lint && npm run typecheck && npm run build` green; migration replays
  clean; verified on `:3001`.
- PR → CI green (incl. required `rls` check) → self-merge per worktree flow.

## Out of scope (v1)

- Per-task notifications / reminders (dashboard surfacing is the v1 signal).
- Photo/evidence attachment on a maintenance completion.
- Cross-property "maintenance calendar" view.
```
