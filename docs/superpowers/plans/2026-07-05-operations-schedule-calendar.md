# Operations Schedule Calendar UI Implementation Plan

> **For agentic workers:** Implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Complete tasks in order; each ends with a committable, testable deliverable.

**Goal:** Replace the Operations "Maintenance Schedule" tab with a **Schedule** view — a week/month calendar of scheduled work across all properties + an "Upcoming work" timeline — with the existing maintenance recurrence-rules management relocated to a collapsible section below.

**Architecture:** Thin RSC loader → pure DB-free lib (`lib/calendar.ts`, fully unit-tested) → presentational client (`ScheduleClient.tsx`). The `scheduled_item` table and its six server actions already exist (#157); the only new backend is one *additive* server action — **no schema change, nothing touches the shared DB.**

**Tech Stack:** Next.js 16 (App Router, RSC + server actions), TypeScript (strict), Supabase (Postgres + RLS), Vitest, plain CSS (no charting lib).

**Spec:** `docs/superpowers/specs/2026-07-05-operations-schedule-calendar-design.md`

## Global Constraints

- **No schema change / no migration.** Only additive server-action code.
- **Strict TypeScript** — `tsc --noEmit` must stay clean; no `any`.
- **Brand rule: green (`ready` tone) is for done/verified states ONLY.** Never use green for "scheduled"/"due".
- **Dates are `YYYY-MM-DD` strings**; all calendar math is string/UTC-based (no local-timezone `Date` construction) to stay DST-safe and deterministic.
- **Day-level only** — `scheduled_for` is a `date`; no time-of-day UI.
- **Permissions mirror the maintenance page:** `staff` role → `redirect("/")`; `owner`/host → read-only (`canEdit=false`, no mutating controls); `operator` → full add/edit/complete.
- **Reuse existing tones/classes:** `.card`, `.pad`, `.stack`, `.spill`, `.sdot`, `.subtabs`, `.muted`, `t-warn`/`ready`/`neutral`. Match the operations-console look.
- Run all commands from `apps/web`. Dev server on a free port: `npm run dev -- -p 3005`.

---

## File Structure

- **new** `apps/web/src/lib/calendar.ts` — pure occurrence + grid helpers.
- **new** `apps/web/tests/calendar.test.ts` — unit tests for the above.
- **edit** `apps/web/src/lib/maintenance.ts` — export a shared `cycleDays()` helper.
- **edit** `apps/web/src/lib/actions/scheduled.ts` — add `completeMaintenanceOccurrenceAction`.
- **new** `apps/web/src/app/operations/schedule/page.tsx` — RSC loader + page.
- **new** `apps/web/src/app/operations/schedule/ScheduleClient.tsx` — calendar + timeline + forms.
- **edit** `apps/web/src/components/OperationsHeader.tsx` — first tab → Schedule.
- **edit** `apps/web/src/app/operations/maintenance/page.tsx` — redirect to `/operations/schedule`.
- **edit** `apps/web/src/app/globals.css` — calendar grid + chip CSS.

---

## Task 1: Pure calendar library (`lib/calendar.ts`) + tests

The core logic, DB-free and deterministic. This is where the test weight lives.

**Files:**
- Modify: `apps/web/src/lib/maintenance.ts` (export `cycleDays`)
- Create: `apps/web/src/lib/calendar.ts`
- Test: `apps/web/tests/calendar.test.ts`

**Interfaces:**
- Consumes: `ComputedMaintenance`, `PersistedItem`, `CalendarItem`, `mergeScheduledWithMaintenance` from `@/lib/schedule`; `RecurrenceKind`, `RecurrenceUnit` from `@/lib/maintenance`.
- Produces (later tasks rely on these exact signatures):
  - `cycleDays(value: number, unit: RecurrenceUnit): number` (from `@/lib/maintenance`)
  - `addDays(iso: string, n: number): string`
  - `maintenanceOccurrences(task: OccurrenceTask, fromDate: string, horizonDays: number): ComputedMaintenance[]`
  - `weekDays(anchor: string): string[]` (7 items, Sunday-start)
  - `monthGrid(anchor: string): { date: string; outside: boolean }[]` (42 items)
  - `bucketByDay<T extends { date: string }>(entries: T[]): Map<string, T[]>`
  - `upcoming<T extends { date: string; status: string }>(entries: T[], today: string, n: number): T[]`
  - types `OccurrenceTask`, exported.

- [ ] **Step 1: Export `cycleDays` from `maintenance.ts`**

In `apps/web/src/lib/maintenance.ts`, replace the private `unitDays` usage by exporting a public helper (keep `maintenanceStatus` working — it should call `cycleDays`):

```ts
export function cycleDays(value: number, unit: RecurrenceUnit): number {
  const perUnit = unit === "week" ? 7 : unit === "month" ? 30 : 1;
  return value * perUnit;
}
```

Then in `maintenanceStatus`, replace `const cycleDays = t.recurrenceValue * unitDays(...)` with `const cycle = cycleDays(t.recurrenceValue, t.recurrenceUnit ?? "day");` and use `cycle` below. Delete the now-unused `unitDays` function.

- [ ] **Step 2: Write the failing test file**

Create `apps/web/tests/calendar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  addDays,
  maintenanceOccurrences,
  weekDays,
  monthGrid,
  bucketByDay,
  upcoming,
  type OccurrenceTask,
} from "@/lib/calendar";

const timeTask = (over: Partial<OccurrenceTask> = {}): OccurrenceTask => ({
  maintenanceTaskId: "t1",
  title: "Shock",
  recurrenceKind: "time",
  recurrenceValue: 7,
  recurrenceUnit: "day",
  lastDoneAt: "2026-07-01T12:00:00Z",
  ...over,
});

describe("addDays", () => {
  it("adds across a month boundary", () => {
    expect(addDays("2026-07-30", 3)).toBe("2026-08-02");
  });
  it("subtracts with negatives", () => {
    expect(addDays("2026-08-02", -3)).toBe("2026-07-30");
  });
});

describe("maintenanceOccurrences", () => {
  it("rolls a time task forward across the horizon", () => {
    // last done 2026-07-01, every 7d → due 07-08, 07-15, 07-22...
    const occ = maintenanceOccurrences(timeTask(), "2026-07-05", 20);
    expect(occ.map((o) => o.dueDate)).toEqual([
      "2026-07-08",
      "2026-07-15",
      "2026-07-22",
    ]);
    expect(occ[0]).toMatchObject({ maintenanceTaskId: "t1", title: "Shock" });
  });
  it("never-done time task → single occurrence at fromDate (overdue today)", () => {
    const occ = maintenanceOccurrences(
      timeTask({ lastDoneAt: null }),
      "2026-07-05",
      20
    );
    expect(occ.map((o) => o.dueDate)).toEqual(["2026-07-05"]);
  });
  it("excludes turnover-based tasks (no calendar date)", () => {
    const occ = maintenanceOccurrences(
      timeTask({ recurrenceKind: "turnover", recurrenceUnit: null }),
      "2026-07-05",
      60
    );
    expect(occ).toEqual([]);
  });
  it("emits nothing when the next due date is beyond the horizon", () => {
    const occ = maintenanceOccurrences(
      timeTask({ recurrenceValue: 30 }),
      "2026-07-05",
      10
    );
    expect(occ).toEqual([]);
  });
});

describe("weekDays", () => {
  it("returns 7 Sunday-start dates containing the anchor", () => {
    // 2026-07-05 is a Sunday
    expect(weekDays("2026-07-08")).toEqual([
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
    ]);
  });
});

describe("monthGrid", () => {
  it("returns 42 cells with outside flags", () => {
    const grid = monthGrid("2026-07-15");
    expect(grid).toHaveLength(42);
    // July 2026 starts Wed; first cell is Sun 2026-06-28 (outside)
    expect(grid[0]).toEqual({ date: "2026-06-28", outside: true });
    expect(grid.find((c) => c.date === "2026-07-01")).toEqual({
      date: "2026-07-01",
      outside: false,
    });
  });
});

describe("bucketByDay", () => {
  it("groups entries by their date key", () => {
    const map = bucketByDay([
      { date: "2026-07-05", id: "a" },
      { date: "2026-07-05", id: "b" },
      { date: "2026-07-06", id: "c" },
    ]);
    expect(map.get("2026-07-05")?.map((e) => e.id)).toEqual(["a", "b"]);
    expect(map.get("2026-07-06")?.map((e) => e.id)).toEqual(["c"]);
  });
});

describe("upcoming", () => {
  const rows = [
    { date: "2026-07-04", status: "scheduled", id: "past" },
    { date: "2026-07-06", status: "done", id: "done" },
    { date: "2026-07-07", status: "scheduled", id: "b" },
    { date: "2026-07-05", status: "scheduled", id: "a" },
    { date: "2026-07-08", status: "skipped", id: "skip" },
  ];
  it("returns open future entries sorted ascending, capped at n", () => {
    expect(upcoming(rows, "2026-07-05", 5).map((r) => r.id)).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test -- calendar` (from `apps/web`)
Expected: FAIL — `@/lib/calendar` cannot be resolved.

- [ ] **Step 4: Implement `lib/calendar.ts`**

Create `apps/web/src/lib/calendar.ts`:

```ts
// Pure, DB-free calendar helpers for the Operations Schedule (issue #158).
// Complements lib/schedule.ts (merge) and lib/maintenance.ts (status): this
// module turns recurrence rules into future due-DATES and builds the grid.
// All date math is UTC/string-based so it is deterministic and DST-safe.

import { cycleDays, type RecurrenceKind, type RecurrenceUnit } from "@/lib/maintenance";
import type { ComputedMaintenance } from "@/lib/schedule";

export interface OccurrenceTask {
  maintenanceTaskId: string;
  title: string;
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
  lastDoneAt: string | null; // ISO timestamp or null (never done)
}

const MS_PER_DAY = 86_400_000;

/** Add n days to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + n * MS_PER_DAY;
  return new Date(t).toISOString().slice(0, 10);
}

/** Day-of-week for a YYYY-MM-DD (0 = Sunday), UTC-based. */
function dow(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Future due-dates for a maintenance task within [fromDate, fromDate+horizon].
 * Time tasks roll last_done + N·cycle forward. Never-done → a single
 * occurrence at fromDate (overdue today). Turnover tasks have no calendar date
 * and return []. Returns the recurring series across the horizon so the month
 * view shows the cadence; a completion re-arms last_done and collapses it.
 */
export function maintenanceOccurrences(
  task: OccurrenceTask,
  fromDate: string,
  horizonDays: number
): ComputedMaintenance[] {
  if (task.recurrenceKind !== "time") return [];
  const end = addDays(fromDate, horizonDays);
  const out: ComputedMaintenance[] = [];

  if (task.lastDoneAt == null) {
    return [
      { maintenanceTaskId: task.maintenanceTaskId, title: task.title, dueDate: fromDate },
    ];
  }

  const cycle = cycleDays(task.recurrenceValue, task.recurrenceUnit ?? "day");
  if (cycle <= 0) return [];
  let due = addDays(task.lastDoneAt.slice(0, 10), cycle);
  // advance to the first due date >= fromDate
  while (due < fromDate) due = addDays(due, cycle);
  // emit through the horizon (guard against runaway loops)
  for (let i = 0; due <= end && i < 400; i++) {
    out.push({ maintenanceTaskId: task.maintenanceTaskId, title: task.title, dueDate: due });
    due = addDays(due, cycle);
  }
  return out;
}

/** The 7 YYYY-MM-DD dates of the Sunday-start week containing `anchor`. */
export function weekDays(anchor: string): string[] {
  const start = addDays(anchor, -dow(anchor));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 42 cells (6 weeks) covering the month containing `anchor`, Sunday-start. */
export function monthGrid(anchor: string): { date: string; outside: boolean }[] {
  const [y, m] = anchor.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const start = addDays(first, -dow(first));
  const month = anchor.slice(0, 7);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, outside: date.slice(0, 7) !== month };
  });
}

/** Group anything with a `date` field into a Map keyed by that date. */
export function bucketByDay<T extends { date: string }>(entries: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const e of entries) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return map;
}

/** Next n open (not done/skipped) entries dated today-or-later, ascending. */
export function upcoming<T extends { date: string; status: string }>(
  entries: T[],
  today: string,
  n: number
): T[] {
  return entries
    .filter((e) => e.date >= today && e.status !== "done" && e.status !== "skipped")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, n);
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test -- calendar`
Expected: PASS (all describe blocks). Also run `npm run test -- maintenance` to confirm the `cycleDays` refactor didn't break existing maintenance tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/calendar.ts apps/web/tests/calendar.test.ts apps/web/src/lib/maintenance.ts
git commit -m "feat(operations): pure calendar occurrence + grid helpers (#158)"
```

---

## Task 2: `completeMaintenanceOccurrenceAction` server action

Lets the UI mark a **virtual** (unpersisted) maintenance occurrence done in one call. No automated test (server actions hit Supabase; the existing actions in this file are likewise integration-verified, not unit-tested) — verified via the live app in Task 4.

**Files:**
- Modify: `apps/web/src/lib/actions/scheduled.ts`

**Interfaces:**
- Consumes: `createClient`, `ActionResult` (already in file).
- Produces: `completeMaintenanceOccurrenceAction(input): Promise<ActionResult>`.

- [ ] **Step 1: Add the action**

Append to `apps/web/src/lib/actions/scheduled.ts` (reuse the file's existing `revalidate()` and `ActionResult`):

```ts
export async function completeMaintenanceOccurrenceAction(input: {
  maintenanceTaskId: string;
  propertyId: string;
  orgId: string;
  title: string;
  scheduledFor: string; // YYYY-MM-DD
  note?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (!input.maintenanceTaskId || !input.propertyId || !input.orgId)
    return { ok: false, error: "Missing task or property." };

  const nowIso = new Date().toISOString();

  // 1) persist a done maintenance scheduled_item for the calendar record
  const { error: insErr } = await supabase.from("scheduled_item").insert({
    property_id: input.propertyId,
    org_id: input.orgId,
    kind: "maintenance",
    title,
    scheduled_for: input.scheduledFor,
    maintenance_task_id: input.maintenanceTaskId,
    source: "auto",
    status: "done",
    done_at: nowIso,
    notes: input.note?.trim() || null,
  });
  if (insErr) return { ok: false, error: insErr.message };

  // 2) write the maintenance completion log
  const { error: logErr } = await supabase.from("maintenance_log").insert({
    task_id: input.maintenanceTaskId,
    property_id: input.propertyId,
    done_by: user.id,
    note: input.note?.trim() || null,
  });
  if (logErr) return { ok: false, error: logErr.message };

  // 3) re-arm the task's cycle
  const { error: taskErr } = await supabase
    .from("maintenance_task")
    .update({ last_done_at: nowIso })
    .eq("id", input.maintenanceTaskId);
  if (taskErr) return { ok: false, error: taskErr.message };

  revalidate();
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/actions/scheduled.ts
git commit -m "feat(operations): completeMaintenanceOccurrenceAction for virtual occurrences (#158)"
```

---

## Task 3: Schedule loader (`schedule/page.tsx`)

Thin RSC that fetches data, builds `ScheduleEntry[]`, and renders the client + the collapsible rules section.

**Files:**
- Create: `apps/web/src/app/operations/schedule/page.tsx`

**Interfaces:**
- Consumes: `getCurrentMembership` (`@/lib/auth`), `createClient` (`@/lib/supabase/server`), `OperationsHeader`, `MaintenanceClient` + `PropertyTasks` (`../maintenance/MaintenanceClient`), `maintenanceStatus`/`MaintenanceInput` (`@/lib/maintenance`), `maintenanceOccurrences`/`OccurrenceTask` (`@/lib/calendar`), `mergeScheduledWithMaintenance`/`PersistedItem`/`ComputedMaintenance` (`@/lib/schedule`).
- Produces: the `ScheduleEntry`, `PropertyLite`, `MemberLite` types (define + export here; `ScheduleClient` imports them), and passes them to `<ScheduleClient>`.

- [ ] **Step 1: Define the shared view-model types + write the loader**

Create `apps/web/src/app/operations/schedule/page.tsx`. Define and **export** these types at the top (Task 4 imports them):

```ts
export type ScheduleEntry = {
  id: string | null; // null = virtual (unpersisted) maintenance occurrence
  virtual: boolean;
  kind: "turnover" | "maintenance" | "custom";
  title: string;
  date: string; // YYYY-MM-DD
  status: "scheduled" | "done" | "skipped";
  overdue: boolean; // maintenance occurrence dated before today
  propertyId: string;
  propertyName: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  maintenanceTaskId: string | null;
  notes: string | null;
};
export type PropertyLite = { id: string; name: string; orgId: string };
export type MemberLite = { userId: string; name: string };
```

Loader requirements (follow `operations/maintenance/page.tsx` as the pattern):
1. `const membership = await getCurrentMembership(); if (!membership) redirect("/login"); if (membership.role === "staff") redirect("/"); const canEdit = membership.role === "operator";`
2. Compute `const now = Date.now();` with the same eslint-disable comment used in the maintenance page (`// eslint-disable-next-line react-hooks/purity ...`) and `const today = new Date(now).toISOString().slice(0, 10);`.
3. Fetch, in parallel where practical:
   - properties + their `maintenance_task` + `turnover(submitted_at_server, status)` + `equipment(...)` — **reuse the exact select from `operations/maintenance/page.tsx`** so you can build the `PropertyTasks[]` groups for the rules section identically.
   - `scheduled_item`: `.select("id, kind, title, scheduled_for, status, assignee_user_id, maintenance_task_id, notes, property_id, property:property(name)").is("archived_at", null)`.
   - members: `.from("membership").select("user_id, role, profile:profile(full_name, email)")`, then map to `MemberLite` keeping roles `operator`/`staff` (drop `owner`), `name = profile.full_name?.trim() || profile.email || "A teammate"`.
4. Build `properties: PropertyLite[]` and the assignee-name lookup `Map<userId, name>`.
5. For each property, compute maintenance occurrences: build `OccurrenceTask` from each non-archived `maintenance_task`, call `maintenanceOccurrences(task, today, 62)`, collect into one `computed: ComputedMaintenance[]`. Build `persisted: PersistedItem[]` from the scheduled_item rows (`{ id, kind, scheduledFor: scheduled_for, maintenanceTaskId: maintenance_task_id }`). **Note:** maintenance occurrences and their persisted rows must be merged *per property* (the merge dedups on `maintenanceTaskId::date`, which is already property-unique). Call `mergeScheduledWithMaintenance(persistedForProp, computedForProp)` per property.
6. Map each merged `CalendarItem` to a `ScheduleEntry`:
   - Persisted (`item.id` non-null): look up the original scheduled_item row for status/title/assignee/notes; `overdue = kind==="maintenance" && status==="scheduled" && date < today`.
   - Virtual (`item.id === null`): `status: "scheduled"`, `title` from the occurrence, `assignee*: null`, `notes: null`, `overdue = date < today`, `maintenanceTaskId` set, `propertyId`/`propertyName` from the property being processed.
7. Also build `groups: PropertyTasks[]` exactly as the maintenance page does (for the rules section).
8. Render:

```tsx
return (
  <div className="stack">
    <OperationsHeader active="schedule" />
    <ScheduleClient
      entries={entries}
      properties={properties}
      members={members}
      canEdit={canEdit}
      today={today}
    />
    <details className="card pad">
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>
        Recurrence rules
      </summary>
      <div style={{ marginTop: 16 }}>
        <MaintenanceClient groups={groups} canEdit={canEdit} today={today} />
      </div>
    </details>
  </div>
);
```

> **DRY note:** the group-building block is duplicated between this loader and `operations/maintenance/page.tsx`. If it's more than ~30 lines, extract a shared `buildMaintenanceGroups(properties, now)` helper into `apps/web/src/lib/maintenance-groups.ts` and use it in both. Otherwise inline is fine.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: fails only on the missing `./ScheduleClient` import (created in Task 4). All other types resolve.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/operations/schedule/page.tsx apps/web/src/lib/maintenance-groups.ts
git commit -m "feat(operations): schedule loader + ScheduleEntry view-model (#158)"
```

---

## Task 4: `ScheduleClient` — calendar, timeline, forms

The interactive client. Presentational + wires the existing/new server actions.

**Files:**
- Create: `apps/web/src/app/operations/schedule/ScheduleClient.tsx`

**Interfaces:**
- Consumes: `ScheduleEntry`, `PropertyLite`, `MemberLite` from `./page`; `weekDays`, `monthGrid`, `bucketByDay`, `upcoming` from `@/lib/calendar`; server actions from `@/lib/actions/scheduled` — `createScheduledItemAction`, `editScheduledItemAction`, `rescheduleScheduledItemAction`, `assignScheduledItemAction`, `markScheduledItemDoneAction`, `skipScheduledItemAction`, `completeMaintenanceOccurrenceAction`.
- Produces: default-exported `ScheduleClient` React component.

Props:

```ts
export function ScheduleClient({
  entries,
  properties,
  members,
  canEdit,
  today,
}: {
  entries: ScheduleEntry[];
  properties: PropertyLite[];
  members: MemberLite[];
  canEdit: boolean;
  today: string;
}) { /* ... */ }
```

- [ ] **Step 1: Build the shell + state**

`"use client";` at top. State (via `useState`):
- `view: "week" | "month"` — **default `"week"`**.
- `anchor: string` — default `today`.
- `filter: string` — default `"all"` (else a `propertyId`).
- `open: { kind: "add"; date: string } | { kind: "detail"; entry: ScheduleEntry } | null` — the panel.
- `pending: boolean` — disables buttons during an action (`useTransition` is fine).

Derived:
- `visible = filter === "all" ? entries : entries.filter(e => e.propertyId === filter)`.
- `byDay = bucketByDay(visible)`.
- `days = view === "week" ? weekDays(anchor) : monthGrid(anchor)` (normalize month cells to `{date, outside}`; week cells `outside:false`).

- [ ] **Step 2: Header controls**

Render a control row: `‹` / `Today` / `›` (prev/next shifts `anchor` by ±7 days in week view, ±1 month in month view — use `addDays(anchor, ±7)` for week; for month, set anchor to the 1st of the prev/next month), a week/month toggle, a period label (e.g. week range, or "July 2026"), and a property `<select>` bound to `filter` (options: "All tubs" + each property name).

- [ ] **Step 3: Chip component + tone mapping**

A `Chip` for a `ScheduleEntry` — clickable (opens detail). Tone rules (**green only for done**):

```ts
function chipTone(e: ScheduleEntry): "ready" | "warn" | "neutral" | "accent" {
  if (e.status === "done") return "ready";      // green
  if (e.status === "skipped") return "neutral";  // + strikethrough styling
  if (e.kind === "maintenance") return e.overdue ? "warn" : "neutral";
  if (e.kind === "turnover") return "accent";
  return "neutral"; // custom
}
```

Chip shows the title, and — when `filter === "all"` — a small property label. Skipped chips get `text-decoration: line-through` + muted. Use `<button className={`spill ${tone}`}>` styling (extend with a `.chip` class in Task 5 CSS).

- [ ] **Step 4: Calendar grid**

- Week view: a 7-column CSS grid; each column = a day header (`weekday`, day number; highlight when `date === today`) then its chips stacked. Empty area of a day is a click target that opens the add panel for that date (operator only).
- Month view: a 7-column grid with 6 rows; each cell shows the day number (dim when `outside`), up to 3 chips, then a `+N more` button that opens a day-detail listing all that day's entries. Cells are click targets for add (operator only).

- [ ] **Step 5: Add panel**

When `open.kind === "add"`: a small form — kind `<select>` (turnover | custom), property `<select>` (from `properties`), title `<input>`, date `<input type="date">` (prefilled `open.date`), optional assignee `<select>` (from `members`, "Unassigned" default), notes `<textarea>`. On submit call `createScheduledItemAction({ propertyId, orgId: <the property's orgId from properties>, kind, title, scheduledFor: date, notes })`; if an assignee was chosen, the row is created first then — because create doesn't take an assignee — this is acceptable to defer: **for v1, the add form does not assign; assignment happens from the detail panel after creation.** (Keeps to the existing action signatures.) Show `result.error` on failure. On success, close the panel (revalidation refreshes the server data).

- [ ] **Step 6: Detail panel**

When `open.kind === "detail"`, render `entry` info (property, date, kind, status, assignee). Controls depend on `canEdit` and `virtual`:
- **Persisted** (`entry.id` set):
  - Edit title + notes → `editScheduledItemAction(entry.id, { title, notes })`.
  - Reschedule (`<input type="date">`) → `rescheduleScheduledItemAction(entry.id, date)`.
  - Assign (`<select>` of members + Unassigned) → `assignScheduledItemAction(entry.id, userIdOrNull)`.
  - Mark done → `markScheduledItemDoneAction({ id: entry.id, maintenanceTaskId: entry.maintenanceTaskId, propertyId: entry.propertyId, note })`.
  - Skip → `skipScheduledItemAction(entry.id)`.
- **Virtual maintenance** (`entry.id === null`, `entry.kind === "maintenance"`):
  - Mark done → `completeMaintenanceOccurrenceAction({ maintenanceTaskId: entry.maintenanceTaskId!, propertyId: entry.propertyId, orgId: <property orgId>, title: entry.title, scheduledFor: entry.date, note })`.
  - "Schedule it" → `createScheduledItemAction({ propertyId: entry.propertyId, orgId, kind: "maintenance", title: entry.title, scheduledFor: entry.date, maintenanceTaskId: entry.maintenanceTaskId, source: "auto" })` (persists so it can then be assigned/rescheduled).
- `!canEdit`: render read-only details, **no** action controls.

Wrap every action in the `pending` transition and surface `result.error`.

- [ ] **Step 7: Upcoming timeline**

Below the calendar card: a "Upcoming work" section rendering `upcoming(visible, today, 8)` as rows — `date · propertyName · title · kind · status/assignee`. Each row click opens the detail panel for that entry. If empty, show a muted "Nothing scheduled ahead."

- [ ] **Step 8: Verify in the app**

Run: `npm run dev -- -p 3005`, log in (dev bypass), open `/operations/schedule`. Confirm: week view renders with today highlighted; month toggle works; prev/next/today nav; property filter narrows chips; clicking a day opens add and a created item appears; clicking a chip opens detail; mark-done turns a chip green; a maintenance occurrence chip appears on its due date and "Mark done" persists + re-arms; timeline lists upcoming items. Also `npm run typecheck` clean.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/operations/schedule/ScheduleClient.tsx
git commit -m "feat(operations): Schedule calendar client — week/month + timeline + add/edit (#158)"
```

---

## Task 5: Wire the tab, redirect, and CSS

Swap the hub tab, redirect the old route, and add calendar styling.

**Files:**
- Modify: `apps/web/src/components/OperationsHeader.tsx`
- Modify: `apps/web/src/app/operations/maintenance/page.tsx`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Update the hub tab**

In `apps/web/src/components/OperationsHeader.tsx`, change the first `MODULES` entry from:

```ts
{ key: "maintenance", label: "Maintenance Schedule", href: "/operations/maintenance" },
```
to:
```ts
{ key: "schedule", label: "Schedule", href: "/operations/schedule" },
```

- [ ] **Step 2: Redirect the old maintenance route**

Replace the body of `apps/web/src/app/operations/maintenance/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

export default function MaintenanceRedirect() {
  redirect("/operations/schedule");
}
```

(The maintenance management UI now lives in the "Recurrence rules" section of the schedule page. Keep `MaintenanceClient.tsx` — it is imported there.)

- [ ] **Step 3: Add calendar CSS**

Append to `apps/web/src/app/globals.css` — grid + chip classes matching the console look (adjust variable names to those already in the file, e.g. `--border`, `--text-dim`, `--bg-elev`):

```css
/* Operations Schedule calendar (#158) */
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.cal-cell { min-height: 96px; border: 1px solid var(--border); border-radius: 8px; padding: 6px; display: flex; flex-direction: column; gap: 4px; }
.cal-cell.outside { opacity: 0.5; }
.cal-cell.today { border-color: var(--accent, #4f8cff); }
.cal-dow { font-size: 11px; color: var(--text-dim); }
.cal-daynum { font-size: 12px; font-weight: 600; }
.chip { display: inline-flex; align-items: center; gap: 4px; width: 100%; text-align: left; border: none; cursor: pointer; font-size: 11.5px; padding: 2px 6px; border-radius: 6px; }
.chip.skipped { text-decoration: line-through; opacity: 0.6; }
.chip .chip-prop { color: var(--text-dim); font-size: 10px; }
@media (max-width: 720px) { .cal-grid { gap: 3px; } .cal-cell { min-height: 64px; } }
```

Reuse the existing `.spill`/tone colors for chip backgrounds where possible; only add what's missing.

- [ ] **Step 4: Full quality gate**

Run (from `apps/web`):
```bash
npm run lint && npm run typecheck && npm run build
```
Expected: all pass. Then `npm run test` — all green including `calendar` + existing `maintenance`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/OperationsHeader.tsx apps/web/src/app/operations/maintenance/page.tsx apps/web/src/app/globals.css
git commit -m "feat(operations): Schedule tab + maintenance redirect + calendar CSS (#158)"
```

---

## Task 6: PR

- [ ] **Step 1: Push + open PR**

```bash
git push -u origin worktree-operations-schedule-ui
gh pr create --base main --title "feat(operations): Schedule calendar UI + upcoming timeline (#158)" \
  --body "Closes #158. Replaces the Maintenance tab with a week/month Schedule calendar across all properties + an Upcoming work timeline; maintenance recurrence rules move to a collapsible section. No schema change (one additive server action). Spec: docs/superpowers/specs/2026-07-05-operations-schedule-calendar-design.md"
```

- [ ] **Step 2: Confirm CI green** (`web` check + `rls` check), then hand back to the manager for review/self-merge.

---

## Self-Review notes (author)

- **Spec coverage:** week/month toggle (T4), all-properties + filter (T4), tab replacement + rules relocation (T3/T5), add/edit/reschedule/assign/mark-done/skip (T4 via existing + new action), virtual-occurrence completion (T2/T4), upcoming timeline (T4), maintenance occurrence dates (T1), turnover-tasks-excluded (T1), no schema change (T2), permissions mirror maintenance (T3/T4), brand green-only rule (T4 tone map). All covered.
- **Type consistency:** `ScheduleEntry`/`PropertyLite`/`MemberLite` defined in T3, imported in T4; `OccurrenceTask`/`cycleDays`/grid helpers defined in T1, consumed in T3. Action signatures match `lib/actions/scheduled.ts` (existing + T2 addition).
- **Known deferral:** the add form does not set an assignee at creation (existing `createScheduledItemAction` has no assignee param); assignment is a one-click follow-up in the detail panel. Called out in T4 Step 5.
</content>
