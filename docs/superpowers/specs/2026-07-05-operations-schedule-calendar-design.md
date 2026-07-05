# Operations Schedule — calendar UI + upcoming timeline (#158)

**Date:** 2026-07-05
**Issue:** #158 (part 2 of epic #156). Backend (`scheduled_item`, `lib/schedule.ts`, `lib/actions/scheduled.ts`) shipped in #157.
**Branch:** `operations-schedule-ui`

## Goal

Replace the Operations **Maintenance Schedule** tab with a **Schedule** view: a
week/month calendar of scheduled work across all properties, plus an "Upcoming
work" timeline, with the existing maintenance recurrence-rules management
relocated to a collapsible section beneath the calendar.

## Founder decisions (2026-07-05)

- **Default view:** Week (month is a one-tap toggle).
- **Property scope:** All properties on one calendar, with a filter dropdown to
  narrow to a single tub. Property shown on each chip.
- **Tab structure:** Replace the Maintenance tab with **Schedule** (4 tabs
  total). The #150 recurrence rules move into a collapsible "Recurrence rules"
  section below the calendar. `/operations/maintenance` redirects to
  `/operations/schedule`.
- **Turnover-based maintenance is excluded from calendar chips** — those tasks
  fire on turnover *count*, not a calendar date, so they have no day to sit on.
  They remain fully visible/manageable in the rules section.
- **Assignment notifications:** `assignScheduledItemAction` already calls the
  `notify_scheduled_assignment` RPC in a swallowed try/catch. That RPC's table
  isn't on the shared/prod DB yet (#161), so notify silently no-ops there while
  the assignment still saves. Out of scope for this task — left as-is.

## Non-goals / YAGNI

- **No schema change.** The table and enums already exist. The only new backend
  is one *additive* server action (below). This keeps the build off the
  shared-DB change-risk surface entirely.
- **No drag-to-reschedule.** Reschedule is via a date field in the detail panel
  (the issue lists drag as a nice-to-have, not required).
- **No time-of-day.** Scheduling is day-level (`scheduled_for` is a `date`),
  matching the backend.
- **No new charting library.** The calendar grid is plain CSS.

## Architecture

Three layers, mirroring the existing operations modules (thin RSC loader → pure
DB-free lib → presentational client):

### 1. `src/lib/calendar.ts` — pure, DB-free, unit-tested

The logic `lib/maintenance.ts` doesn't provide (it returns *status*, not
future *dates*) plus the grid math:

- `maintenanceOccurrences(task, fromDate, horizonDays)` → `ComputedMaintenance[]`
  (shape from `lib/schedule.ts`). For a **time-based** task, roll
  `last_done_at + N·unit` forward from `fromDate` across `horizonDays`, emitting
  one occurrence per cycle. Never-done time task → a single occurrence at
  `fromDate` (overdue today). **Turnover-based tasks return `[]`** (excluded).
  Reuses the cycle-length math from `lib/maintenance.ts` (extract a shared
  `cycleDays(value, unit)` helper rather than duplicating the `unitDays` switch).
- `weekDays(anchor)` → the 7 `YYYY-MM-DD` dates of the week containing `anchor`
  (Sunday-start).
- `monthGrid(anchor)` → the 6×7 grid of dates covering the month containing
  `anchor` (leading/trailing days from adjacent months flagged `outside`).
- `bucketByDay(entries)` → `Map<YYYY-MM-DD, ScheduleEntry[]>`.
- `upcoming(entries, today, n)` → the next `n` open (not done/skipped) entries
  with `date >= today`, sorted ascending by date then title.

All functions take dates as `YYYY-MM-DD` strings / an explicit `now`, so they're
deterministic and testable without a DB or wall-clock.

### 2. `src/app/operations/schedule/page.tsx` — RSC loader

- Guard: same as maintenance page — `getCurrentMembership`; staff → redirect
  `/`; `canEdit = role === "operator"` (owner/host read-only).
- Fetch: all non-archived `scheduled_item` rows joined to property name;
  `maintenance_task` (for occurrences) + `turnover` locked timestamps (unused
  for calendar dates but kept for parity if needed); properties list (for the
  filter + add form); org members (for the assignee dropdown — reuse whatever
  the team/assign flow already uses).
- Compute maintenance occurrences over a horizon covering the visible window
  plus the timeline lookahead (e.g. 62 days from today), dedup against persisted
  rows via the existing `mergeScheduledWithMaintenance`, then map each
  `CalendarItem` back to a rich `ScheduleEntry` view-model:

  ```ts
  type ScheduleEntry = {
    id: string | null;          // null = virtual (unpersisted) maintenance occurrence
    virtual: boolean;
    kind: "turnover" | "maintenance" | "custom";
    title: string;
    date: string;               // YYYY-MM-DD
    status: "scheduled" | "done" | "skipped";
    overdue: boolean;           // maintenance occurrence with date < today
    propertyId: string;
    propertyName: string;
    assigneeUserId: string | null;
    assigneeName: string | null;
    maintenanceTaskId: string | null;
    notes: string | null;
  };
  ```
- Pass `entries`, `properties`, `members`, `canEdit`, and `today` to the client.
- Render the collapsible "Recurrence rules" section by reusing the existing
  `MaintenanceClient` with the same `groups`/`canEdit`/`today` props the
  maintenance page builds today (lift that group-building into a small shared
  loader helper so both the redirected page and this section stay in sync — or,
  simplest, build the groups inline here as the maintenance page does).

### 3. `src/app/operations/schedule/ScheduleClient.tsx` — client

State: `view: "week" | "month"` (default `"week"`), `anchor: string`
(the focused period, default today), `propertyFilter: "all" | propertyId`,
plus which entry/day panel is open.

- **Calendar**
  - Header: `‹ Today ›` nav + week/month toggle + property filter `<select>`.
  - Week view: 7 day-columns (Sun–Sat), date + weekday header, **today**
    highlighted; chips stacked in each column.
  - Month view: 6×7 grid; `outside` days dimmed; up to ~3 chips per cell then
    "+N more" (expands the day panel).
  - **Chips** color-coded by kind + status, reusing `.spill`/`.sdot` tones.
    **Brand rule: green only for done/verified.** Mapping:
    - done → `ready` (green)
    - skipped → muted + strikethrough
    - maintenance overdue → `warn`
    - turnover (scheduled) → accent tone
    - custom / maintenance due → `neutral`

    Chip shows title + small property label (hidden when filtered to one tub).
- **Add** (click an empty day, operator only): inline/popover form — kind
  (turnover | custom), property `<select>`, title, date (prefilled from the
  clicked day), optional assignee, notes → `createScheduledItemAction`.
- **Detail panel** (click a chip):
  - Persisted item: edit title/notes (`editScheduledItemAction`), reschedule
    date (`rescheduleScheduledItemAction`), assign
    (`assignScheduledItemAction`), **Mark done** (`markScheduledItemDoneAction`
    — passing `maintenanceTaskId`/`propertyId` when it's a persisted
    maintenance row so the log + re-arm fire), **Skip**
    (`skipScheduledItemAction`).
  - Virtual maintenance occurrence: **Mark done** → new
    `completeMaintenanceOccurrenceAction` (below); **Schedule it** →
    `createScheduledItemAction({ kind: "maintenance", maintenanceTaskId, title,
    scheduledFor, source: "auto" })` to persist, after which assign/reschedule
    apply. Read-only viewers see details without actions.
- **"Upcoming work" timeline** below the calendar: `upcoming(entries, today, 8)`
  rendered as rows (date · property · title · kind · status/assignee). Clicking
  a row opens the same detail panel.
- Respects `propertyFilter` across calendar + timeline. Read-only viewers
  (`!canEdit`) see everything but no mutating controls.

### 4. New server action (additive) — `src/lib/actions/scheduled.ts`

```ts
completeMaintenanceOccurrenceAction({
  maintenanceTaskId, propertyId, orgId, title, scheduledFor, note
}): Promise<ActionResult>
```

For marking a **virtual** (unpersisted) maintenance occurrence done in one call:
insert a `done` `scheduled_item` (`kind:"maintenance"`, `source:"auto"`,
`maintenance_task_id`, `done_at:now`) **and** a `maintenance_log` row **and**
update the task's `last_done_at` — the same three writes
`markScheduledItemDoneAction` does for a persisted maintenance row, minus the
pre-existing id. Revalidates `/operations/schedule` + `/operations`. No schema
change.

### 5. `src/components/OperationsHeader.tsx`

First module becomes `{ key: "schedule", label: "Schedule", href:
"/operations/schedule" }`. The schedule page passes `active="schedule"`.

### 6. `src/app/operations/maintenance/page.tsx`

`redirect("/operations/schedule")` — the rules now live in the section there.

### 7. CSS

Calendar grid + chip styles added to the global stylesheet, following the
existing operations-console tokens (`.card`, `.spill`, `.sdot`, `.subtabs`,
tone classes `t-warn`/`ready`/`neutral`). No new dependency.

## Data flow

```
maintenance_task ─┐
                  ├─ maintenanceOccurrences() ─┐
scheduled_item ───┼──────────────────────────► mergeScheduledWithMaintenance()
                  │                             └─► CalendarItem[] ─► ScheduleEntry[]
property/members ─┘                                          │
                                                             ├─► bucketByDay() ─► calendar cells
                                                             └─► upcoming() ─────► timeline
click chip / day ─► server action ─► revalidatePath ─► loader re-runs
```

## Permissions

Mirrors the maintenance module: staff redirected to `/`; owner/host read-only
(`canEdit=false`, no mutating controls); operator full add/edit/complete. All
writes go through the existing RLS-guarded server actions
(`app_can_capture_property`).

## Testing

`tests/calendar.test.ts` (pure, no DB):

- `maintenanceOccurrences`: time task emits correct dates across a horizon;
  never-done time task → single overdue-today occurrence; turnover task → `[]`;
  respects `fromDate`/`horizonDays` bounds.
- `weekDays`: 7 Sunday-start dates for a given anchor (incl. month/year
  boundary).
- `monthGrid`: 42 cells, correct `outside` flags, DST-safe (string math).
- `bucketByDay`: entries land in the right day keys.
- `upcoming`: excludes done/skipped and past dates; correct ordering + `n` cap.

Existing `mergeScheduledWithMaintenance` tests untouched. The loader stays thin
and the client is presentational, so the pure lib carries the test weight.

## Quality gate

`npm run lint && npm run typecheck && npm run build` clean; RLS suite green in
CI; verified on `:3001` (or the worktree's free port). PR `--base main`,
self-merge on green.

## Files

- **new** `src/lib/calendar.ts`
- **new** `src/app/operations/schedule/page.tsx`
- **new** `src/app/operations/schedule/ScheduleClient.tsx`
- **new** `tests/calendar.test.ts`
- **edit** `src/lib/actions/scheduled.ts` (+`completeMaintenanceOccurrenceAction`)
- **edit** `src/lib/maintenance.ts` (extract shared `cycleDays` helper)
- **edit** `src/components/OperationsHeader.tsx` (Schedule tab)
- **edit** `src/app/operations/maintenance/page.tsx` (→ redirect)
- **edit** global stylesheet (calendar CSS)
</content>
</invoke>
