# Maintenance Schedule Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Maintenance Schedule module under the Operations hub where operators/techs define recurring per-property maintenance (time- or turnover-based) and see what is due/overdue, with a completion history and dashboard surfacing.

**Architecture:** Two new RLS-scoped Postgres tables (`maintenance_task`, `maintenance_log`) mirroring the `water_reading` conventions; a pure DB-free `lib/maintenance.ts` for due/overdue logic (unit-tested); server actions in `lib/actions/maintenance.ts`; a new `/operations/maintenance` route reusing the `OperationsHeader` hub shell and `.dlist/.drow2/.spill` primitives; and an extension to the `/operations` dashboard attention signal.

**Tech Stack:** Next.js 15 (App Router, server components + server actions), Supabase (Postgres + RLS), TypeScript (strict), Vitest. Spec: `docs/superpowers/specs/2026-06-14-maintenance-schedule-module-design.md`.

---

## File Structure

**Create:**
- `apps/web/supabase/migrations/20260614130000_maintenance.sql` — both tables, enums, RLS, audit trigger.
- `apps/web/src/lib/maintenance.ts` — pure due/overdue status logic.
- `apps/web/tests/maintenance.test.ts` — unit tests for the pure logic.
- `apps/web/src/lib/actions/maintenance.ts` — server actions (create/update/markDone/archive).
- `apps/web/src/app/operations/maintenance/page.tsx` — the module route (server component).
- `apps/web/src/app/operations/maintenance/MaintenanceClient.tsx` — client UI (list + add/edit form + mark-done).

**Modify:**
- `apps/web/src/components/OperationsHeader.tsx` — flip the "Maintenance Schedule" tab from "Soon" to a live link.
- `apps/web/src/lib/supabase/types.ts` — regenerated after the migration.
- `apps/web/tests/rls.test.ts` — add maintenance RLS cases.
- `apps/web/src/app/operations/page.tsx` — fold overdue maintenance into the per-property attention signal.

---

## Task 1: Database migration — tables, RLS, audit

**Files:**
- Create: `apps/web/supabase/migrations/20260614130000_maintenance.sql`

- [ ] **Step 1: Write the migration**

Create `apps/web/supabase/migrations/20260614130000_maintenance.sql`:

```sql
-- Maintenance schedules (epic #148, issue #150). Recurring per-property
-- maintenance the operator/tech tracks: filter clean (every N turnovers),
-- drain & refill / cover inspection (every N days/weeks/months). Surfaces
-- what is due/overdue in the Operations > Maintenance module and on the
-- dashboard attention signal.
--
-- RLS mirrors `water_reading`/`property`: visible to anyone who can see the
-- property; writable by a *capturer* (operator OR assigned staff/tech), NOT the
-- owner/host — the tech drives maintenance because the host doesn't know the
-- chemistry/filter state. `maintenance_log` is immutable completion evidence.

create type maintenance_recurrence_kind as enum ('time', 'turnover');
create type maintenance_recurrence_unit as enum ('day', 'week', 'month');

create table maintenance_task (
  id               uuid primary key default gen_random_uuid(),
  property_id      uuid not null references property(id) on delete cascade,
  org_id           uuid not null references org(id) on delete cascade, -- denormalized for operator/capturer write check
  title            text not null,
  recurrence_kind  maintenance_recurrence_kind not null,
  recurrence_value integer not null check (recurrence_value > 0),
  recurrence_unit  maintenance_recurrence_unit,  -- non-null iff kind = 'time'
  last_done_at     timestamptz,                  -- null = never done yet
  notes            text,
  created_at       timestamptz not null default now(),
  archived_at      timestamptz,                  -- soft delete
  -- unit present exactly when the task is time-based
  constraint maintenance_task_unit_matches_kind check (
    (recurrence_kind = 'time'     and recurrence_unit is not null) or
    (recurrence_kind = 'turnover' and recurrence_unit is null)
  )
);

create index on maintenance_task (property_id);

create table maintenance_log (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references maintenance_task(id) on delete cascade,
  property_id uuid not null references property(id) on delete cascade, -- denormalized for RLS + cross-property guard
  done_at     timestamptz not null default now(),
  done_by     uuid references auth.users(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index on maintenance_log (task_id);

alter table maintenance_task enable row level security;
alter table maintenance_log  enable row level security;

-- maintenance_task: anyone who can see the property reads; capturer writes.
create policy maintenance_task_select on maintenance_task for select to authenticated
  using (app_can_see_property(property_id));

create policy maintenance_task_write on maintenance_task for all to authenticated
  using (app_can_capture_property(property_id))
  with check (
    app_can_capture_property(property_id)
    -- org_id can't be spoofed onto another property's org
    and org_id = (select p.org_id from property p where p.id = property_id)
  );

-- maintenance_log: readable when the property is visible; insert by a capturer
-- and only against a task that belongs to the SAME property (no cross-property
-- log injection). Immutable — no update/delete policy.
create policy maintenance_log_select on maintenance_log for select to authenticated
  using (app_can_see_property(property_id));

create policy maintenance_log_insert on maintenance_log for insert to authenticated
  with check (
    app_can_capture_property(property_id)
    and exists (
      select 1 from maintenance_task mt
      where mt.id = task_id and mt.property_id = maintenance_log.property_id
    )
  );

-- Audit both tables with the existing SECURITY DEFINER evidence writer
-- (20260608022512), which resolves org for non-turnover evidence tables.
create trigger audit_maintenance_task
  after insert or update on maintenance_task
  for each row execute function log_evidence_change();

create trigger audit_maintenance_log
  after insert or update on maintenance_log
  for each row execute function log_evidence_change();
```

- [ ] **Step 2: Apply the migration to the local stack**

Run (from `apps/web`):
```bash
supabase db reset
```
Expected: all migrations replay cleanly from empty, ending with `20260614130000_maintenance`. No errors. (If `supabase` isn't started, run `supabase start` first.)

- [ ] **Step 3: Verify the audit writer accepts the new tables**

The `log_evidence_change()` function resolves `org_id`. Confirm it handles a table that already carries `org_id`/`property_id` columns. Inspect the function:
```bash
grep -n "log_evidence_change" -A 40 supabase/migrations/20260608022512_audit_log_writer.sql
```
Expected: it reads `org_id`/`property_id` from the row (or resolves via `turnover_id`). `maintenance_task` has `org_id` + `property_id`; `maintenance_log` has `property_id` only. **If the function requires `org_id` and `maintenance_log` lacks it,** add `org_id uuid not null` to `maintenance_log` (denormalized, set in the insert action) OR drop the `audit_maintenance_log` trigger and rely on `maintenance_task` auditing. Decide based on the function body; adjust the migration in Step 1 before committing. Re-run `supabase db reset` after any change.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260614130000_maintenance.sql
git commit -m "feat(maintenance): migration — maintenance_task + maintenance_log + RLS (#150)"
```

---

## Task 2: Regenerate Supabase types

**Files:**
- Modify: `apps/web/src/lib/supabase/types.ts`

- [ ] **Step 1: Regenerate types from the local schema**

Run (from `apps/web`, local stack running):
```bash
supabase gen types typescript --local > src/lib/supabase/types.ts
```

- [ ] **Step 2: Update the generated-from comment**

Edit the header line in `src/lib/supabase/types.ts` (line 4) to read:
```ts
// (This revision generated from the local stack — schema includes 20260614130000_maintenance.)
```

- [ ] **Step 3: Verify the new types exist**

Run:
```bash
grep -n "maintenance_task\|maintenance_log\|maintenance_recurrence_kind" src/lib/supabase/types.ts | head
```
Expected: matches for both table rows and the enum.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no usages yet, types just added).

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "chore(types): regenerate Supabase types for maintenance tables (#150)"
```

---

## Task 3: Pure due/overdue logic (`lib/maintenance.ts`) — TDD

**Files:**
- Create: `apps/web/src/lib/maintenance.ts`
- Test: `apps/web/tests/maintenance.test.ts`

This module is DB-free so it unit-tests without Supabase, exactly like `lib/chemistry-rules.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/maintenance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { maintenanceStatus, type MaintenanceInput } from "@/lib/maintenance";

const NOW = Date.parse("2026-06-14T12:00:00.000Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

function timeTask(value: number, lastDoneDaysAgo: number | null): MaintenanceInput {
  return {
    recurrenceKind: "time",
    recurrenceValue: value,
    recurrenceUnit: "day",
    lastDoneAt: lastDoneDaysAgo == null ? null : daysAgo(lastDoneDaysAgo),
    turnoversSinceDone: 0,
  };
}

function turnoverTask(value: number, since: number, everDone: boolean): MaintenanceInput {
  return {
    recurrenceKind: "turnover",
    recurrenceValue: value,
    recurrenceUnit: null,
    lastDoneAt: everDone ? daysAgo(30) : null,
    turnoversSinceDone: since,
  };
}

describe("maintenanceStatus — time-based", () => {
  it("never done → due now (overdue)", () => {
    expect(maintenanceStatus(timeTask(90, null), NOW).state).toBe("overdue");
  });
  it("done 30d ago on a 90d cycle → ok", () => {
    expect(maintenanceStatus(timeTask(90, 30), NOW).state).toBe("ok");
  });
  it("done 100d ago on a 90d cycle → overdue", () => {
    const s = maintenanceStatus(timeTask(90, 100), NOW);
    expect(s.state).toBe("overdue");
    expect(s.overdueDays).toBe(10);
  });
  it("due within the soon window (≤3d) → due_soon", () => {
    // 88d ago on a 90d cycle → 2 days left
    expect(maintenanceStatus(timeTask(90, 88), NOW).state).toBe("due_soon");
  });
});

describe("maintenanceStatus — turnover-based", () => {
  it("never done, 0 turnovers, every 3 → due_soon-or-ok not overdue", () => {
    expect(maintenanceStatus(turnoverTask(3, 0, false), NOW).state).not.toBe("overdue");
  });
  it("2 of 3 turnovers → due_soon (1 left)", () => {
    const s = maintenanceStatus(turnoverTask(3, 2, true), NOW);
    expect(s.state).toBe("due_soon");
    expect(s.turnoversLeft).toBe(1);
  });
  it("3 of 3 turnovers → overdue", () => {
    expect(maintenanceStatus(turnoverTask(3, 3, true), NOW).state).toBe("overdue");
  });
  it("4 of 3 turnovers → overdue (1 over)", () => {
    const s = maintenanceStatus(turnoverTask(3, 4, true), NOW);
    expect(s.state).toBe("overdue");
    expect(s.turnoversOver).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/maintenance.test.ts`
Expected: FAIL — `Cannot find module '@/lib/maintenance'`.

- [ ] **Step 3: Implement `lib/maintenance.ts`**

Create `apps/web/src/lib/maintenance.ts`:

```ts
// Pure, DB-free maintenance due/overdue logic (issue #150). Mirrors the
// testable-without-a-DB shape of lib/chemistry-rules.ts. The page/dashboard
// compute `turnoversSinceDone` (count of locked turnovers after last_done_at)
// and pass it in; this module decides status only.

export type RecurrenceKind = "time" | "turnover";
export type RecurrenceUnit = "day" | "week" | "month";

export interface MaintenanceInput {
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
  lastDoneAt: string | null; // ISO; null = never done
  turnoversSinceDone: number; // locked turnovers since last_done_at (or all if never done)
}

export type MaintenanceState = "ok" | "due_soon" | "overdue";

export interface MaintenanceStatus {
  state: MaintenanceState;
  /** Days overdue (time tasks, state === "overdue"). */
  overdueDays?: number;
  /** Days until due (time tasks, state !== "overdue"). */
  daysLeft?: number;
  /** Turnovers remaining before due (turnover tasks). */
  turnoversLeft?: number;
  /** Turnovers past due (turnover tasks, state === "overdue"). */
  turnoversOver?: number;
}

const MS_PER_DAY = 86_400_000;

function unitDays(unit: RecurrenceUnit): number {
  switch (unit) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30; // calendar-approx; good enough for a maintenance cadence
  }
}

export function maintenanceStatus(
  t: MaintenanceInput,
  now: number
): MaintenanceStatus {
  if (t.recurrenceKind === "turnover") {
    const left = t.recurrenceValue - t.turnoversSinceDone;
    if (left <= 0) {
      return { state: "overdue", turnoversOver: -left };
    }
    // "due soon" when 1 turnover remains
    return { state: left <= 1 ? "due_soon" : "ok", turnoversLeft: left };
  }

  // time-based
  const cycleDays = t.recurrenceValue * unitDays(t.recurrenceUnit ?? "day");
  // never done → treat as overdue (needs a first completion)
  if (t.lastDoneAt == null) {
    return { state: "overdue", overdueDays: 0 };
  }
  const dueAt = Date.parse(t.lastDoneAt) + cycleDays * MS_PER_DAY;
  const diffDays = Math.floor((dueAt - now) / MS_PER_DAY);
  if (diffDays < 0) {
    return { state: "overdue", overdueDays: -diffDays };
  }
  // due-soon window: within 20% of the cycle, floored at ≤ 3 days
  const soonWindow = Math.max(3, Math.ceil(cycleDays * 0.2));
  return {
    state: diffDays <= soonWindow ? "due_soon" : "ok",
    daysLeft: diffDays,
  };
}

/** spill pill tone for a status (brand rule: green = success only). */
export function maintenanceTone(
  state: MaintenanceState
): "ready" | "warn" | "neutral" {
  if (state === "overdue") return "warn";
  if (state === "due_soon") return "neutral";
  return "ready";
}

/** Short human label for a status pill. */
export function maintenanceLabel(s: MaintenanceStatus): string {
  switch (s.state) {
    case "overdue":
      if (s.turnoversOver != null)
        return s.turnoversOver === 0 ? "Due now" : `Overdue · ${s.turnoversOver} over`;
      return s.overdueDays && s.overdueDays > 0 ? `Overdue ${s.overdueDays}d` : "Due now";
    case "due_soon":
      if (s.turnoversLeft != null) return `${s.turnoversLeft} left`;
      return s.daysLeft === 0 ? "Due today" : `Due in ${s.daysLeft}d`;
    case "ok":
      if (s.turnoversLeft != null) return `${s.turnoversLeft} left`;
      return "Up to date";
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/maintenance.test.ts`
Expected: PASS (all cases).

Note: the "due_soon" assertion for `timeTask(90, 88)` → 2 days left, soonWindow = max(3, 18) = 18, so 2 ≤ 18 → `due_soon`. ✓ And `timeTask(90, 30)` → 60 days left > 18 → `ok`. ✓

- [ ] **Step 5: Commit**

```bash
git add src/lib/maintenance.ts tests/maintenance.test.ts
git commit -m "feat(maintenance): pure due/overdue status logic + unit tests (#150)"
```

---

## Task 4: RLS suite cases

**Files:**
- Modify: `apps/web/tests/rls.test.ts`

Add cases proving: a capturer (operator + assigned staff) can write `maintenance_task`; the owner/host cannot; cross-property is denied; `maintenance_log` is insert-only by a capturer for a matching task.

- [ ] **Step 1: Read the existing suite to reuse fixtures**

Run:
```bash
grep -n "propAssigned\|propUnassigned\|propB\|owner\|staffA\|operatorA\|makeUser\|describe(" tests/rls.test.ts | head -40
```
Identify the existing authed users (`operatorA`, `staffA`, `operatorB`) and property ids (`propAssigned`, `propB`) and whether an owner user fixture exists. If no owner fixture exists, add one in `beforeAll` mirroring `makeUser` + a `property_owner` insert via `admin`.

- [ ] **Step 2: Add the failing maintenance describe block**

Append inside the `describe("RLS isolation", ...)` block (after the existing cases), using the established fixtures:

```ts
describe("maintenance_task / maintenance_log", () => {
  it("operator can create a schedule on their property", async () => {
    const { data, error } = await operatorA.client
      .from("maintenance_task")
      .insert({
        property_id: propAssigned,
        org_id: orgA,
        title: "Filter clean",
        recurrence_kind: "turnover",
        recurrence_value: 3,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });

  it("assigned staff/tech can create a schedule", async () => {
    const { error } = await staffA.client.from("maintenance_task").insert({
      property_id: propAssigned,
      org_id: orgA,
      title: "Drain & refill",
      recurrence_kind: "time",
      recurrence_value: 90,
      recurrence_unit: "day",
    });
    expect(error).toBeNull();
  });

  it("operator of another org cannot create on this property", async () => {
    const { error } = await operatorB.client.from("maintenance_task").insert({
      property_id: propAssigned,
      org_id: orgA,
      title: "Sneaky",
      recurrence_kind: "turnover",
      recurrence_value: 1,
    });
    expect(error).not.toBeNull(); // RLS denies
  });

  it("capturer can log a completion against a matching task", async () => {
    const { data: task } = await operatorA.client
      .from("maintenance_task")
      .insert({
        property_id: propAssigned,
        org_id: orgA,
        title: "Cover inspection",
        recurrence_kind: "time",
        recurrence_value: 30,
        recurrence_unit: "day",
      })
      .select("id")
      .single();
    const { error } = await operatorA.client.from("maintenance_log").insert({
      task_id: task!.id,
      property_id: propAssigned,
      note: "done",
    });
    expect(error).toBeNull();
  });

  it("cannot log a completion onto a different property", async () => {
    const { data: task } = await operatorA.client
      .from("maintenance_task")
      .insert({
        property_id: propAssigned,
        org_id: orgA,
        title: "X",
        recurrence_kind: "turnover",
        recurrence_value: 2,
      })
      .select("id")
      .single();
    const { error } = await operatorB.client.from("maintenance_log").insert({
      task_id: task!.id,
      property_id: propB, // mismatched property
      note: "injection",
    });
    expect(error).not.toBeNull();
  });
});
```

If an owner fixture is available, also add: `it("owner/host cannot create a schedule", ...)` expecting a non-null error when `ownerA.client` inserts onto `propAssigned`.

- [ ] **Step 3: Run the RLS suite locally**

Ensure env is set (the suite skips loudly without `SUPABASE_SERVICE_ROLE_KEY`). With the local stack:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(supabase status -o json | jq -r .ANON_KEY) \
SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o json | jq -r .SERVICE_ROLE_KEY) \
npx vitest run tests/rls.test.ts
```
Expected: PASS, including the new `maintenance_task / maintenance_log` block. (If `supabase status -o json` keys differ, read them from `supabase status` plain output.)

- [ ] **Step 4: Commit**

```bash
git add tests/rls.test.ts
git commit -m "test(rls): maintenance_task/log isolation cases (#150)"
```

---

## Task 5: Server actions

**Files:**
- Create: `apps/web/src/lib/actions/maintenance.ts`

- [ ] **Step 1: Implement the actions**

Create `apps/web/src/lib/actions/maintenance.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { RecurrenceKind, RecurrenceUnit } from "@/lib/maintenance";

export type ActionResult = { ok: true } | { ok: false; error: string };

interface TaskInput {
  propertyId: string;
  orgId: string;
  title: string;
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
  notes: string | null;
}

function parseTaskInput(formData: FormData): TaskInput | { error: string } {
  const title = ((formData.get("title") as string) ?? "").trim();
  const propertyId = (formData.get("property_id") as string) ?? "";
  const orgId = (formData.get("org_id") as string) ?? "";
  const recurrenceKind = (formData.get("recurrence_kind") as RecurrenceKind) ?? "time";
  const recurrenceValue = Number(formData.get("recurrence_value"));
  const rawUnit = (formData.get("recurrence_unit") as string) || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!propertyId || !orgId) return { error: "Missing property." };
  if (!Number.isInteger(recurrenceValue) || recurrenceValue <= 0)
    return { error: "Recurrence must be a positive whole number." };
  if (recurrenceKind === "time" && !rawUnit)
    return { error: "Pick a time unit." };

  return {
    propertyId,
    orgId,
    title,
    recurrenceKind,
    recurrenceValue,
    recurrenceUnit: recurrenceKind === "time" ? (rawUnit as RecurrenceUnit) : null,
    notes,
  };
}

export async function createMaintenanceTaskAction(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseTaskInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { error } = await supabase.from("maintenance_task").insert({
    property_id: parsed.propertyId,
    org_id: parsed.orgId,
    title: parsed.title,
    recurrence_kind: parsed.recurrenceKind,
    recurrence_value: parsed.recurrenceValue,
    recurrence_unit: parsed.recurrenceUnit,
    notes: parsed.notes,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/maintenance");
  revalidatePath("/operations");
  return { ok: true };
}

export async function updateMaintenanceTaskAction(
  taskId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const parsed = parseTaskInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { error } = await supabase
    .from("maintenance_task")
    .update({
      title: parsed.title,
      recurrence_kind: parsed.recurrenceKind,
      recurrence_value: parsed.recurrenceValue,
      recurrence_unit: parsed.recurrenceUnit,
      notes: parsed.notes,
    })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/maintenance");
  revalidatePath("/operations");
  return { ok: true };
}

export async function markMaintenanceDoneAction(
  taskId: string,
  propertyId: string,
  note: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Insert the immutable completion log first (RLS verifies task↔property match).
  const { error: logErr } = await supabase.from("maintenance_log").insert({
    task_id: taskId,
    property_id: propertyId,
    done_by: user.id,
    note: note?.trim() || null,
  });
  if (logErr) return { ok: false, error: logErr.message };

  // Re-arm the cycle.
  const { error: taskErr } = await supabase
    .from("maintenance_task")
    .update({ last_done_at: new Date().toISOString() })
    .eq("id", taskId);
  if (taskErr) return { ok: false, error: taskErr.message };

  revalidatePath("/operations/maintenance");
  revalidatePath("/operations");
  return { ok: true };
}

export async function archiveMaintenanceTaskAction(
  taskId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_task")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/maintenance");
  revalidatePath("/operations");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. (If `revalidatePath` import path errors, confirm it's `next/cache`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/maintenance.ts
git commit -m "feat(maintenance): server actions create/update/markDone/archive (#150)"
```

---

## Task 6: Module route + UI

**Files:**
- Modify: `apps/web/src/components/OperationsHeader.tsx`
- Create: `apps/web/src/app/operations/maintenance/page.tsx`
- Create: `apps/web/src/app/operations/maintenance/MaintenanceClient.tsx`

- [ ] **Step 1: Wire the hub tab live**

In `apps/web/src/components/OperationsHeader.tsx`, change the maintenance entry in `MODULES`:
```ts
  { key: "maintenance", label: "Maintenance Schedule", href: "/operations/maintenance" },
```
(Leave `supplies`/`equipment` as `Soon`.)

- [ ] **Step 2: Build the server-component page**

Create `apps/web/src/app/operations/maintenance/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { OperationsHeader } from "@/components/OperationsHeader";
import { MaintenanceClient, type PropertyTasks } from "./MaintenanceClient";
import { maintenanceStatus, type MaintenanceInput } from "@/lib/maintenance";

export default async function MaintenancePage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role === "staff") {
    // staff capture home is "/", but assigned techs reach maintenance via the
    // property; the cross-property module is operator/owner like the dashboard.
    redirect("/");
  }

  const canEdit = membership.role === "operator"; // tech edits happen per-property; owner is read-only
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, org_id,
       maintenance_task(
         id, title, recurrence_kind, recurrence_value, recurrence_unit,
         last_done_at, notes, archived_at
       ),
       turnover(submitted_at_server, status)`
    )
    .order("created_at");

  const now = Date.now();
  const groups: PropertyTasks[] = (properties ?? []).map((p) => {
    const lockedAts = (p.turnover ?? [])
      .filter((t) => t.status === "submitted_locked" && t.submitted_at_server)
      .map((t) => t.submitted_at_server as string);

    const tasks = (p.maintenance_task ?? [])
      .filter((t) => !t.archived_at)
      .map((t) => {
        const turnoversSinceDone = t.last_done_at
          ? lockedAts.filter((at) => at > (t.last_done_at as string)).length
          : lockedAts.length;
        const input: MaintenanceInput = {
          recurrenceKind: t.recurrence_kind,
          recurrenceValue: t.recurrence_value,
          recurrenceUnit: t.recurrence_unit,
          lastDoneAt: t.last_done_at,
          turnoversSinceDone,
        };
        return {
          id: t.id,
          title: t.title,
          recurrenceKind: t.recurrence_kind,
          recurrenceValue: t.recurrence_value,
          recurrenceUnit: t.recurrence_unit,
          notes: t.notes,
          status: maintenanceStatus(input, now),
        };
      });

    return { id: p.id, name: p.name, orgId: p.org_id, tasks };
  });

  return (
    <div className="stack">
      <OperationsHeader active="maintenance" />
      <MaintenanceClient groups={groups} canEdit={canEdit} />
    </div>
  );
}
```

- [ ] **Step 3: Build the client UI**

Create `apps/web/src/app/operations/maintenance/MaintenanceClient.tsx`. It renders each property group with a `.dlist` of `.drow2` rows, status `.spill` pills, an Add-schedule form with presets, and a Mark-done button. Use `@/components/ui` primitives (`Button`, `Card`, `Input`, `Label`, `Select`, `Note`) and `useTransition`.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Note } from "@/components/ui";
import {
  maintenanceTone,
  maintenanceLabel,
  type MaintenanceStatus,
  type RecurrenceKind,
  type RecurrenceUnit,
} from "@/lib/maintenance";
import {
  createMaintenanceTaskAction,
  markMaintenanceDoneAction,
  archiveMaintenanceTaskAction,
} from "@/lib/actions/maintenance";

export interface TaskRow {
  id: string;
  title: string;
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
  notes: string | null;
  status: MaintenanceStatus;
}
export interface PropertyTasks {
  id: string;
  name: string;
  orgId: string;
  tasks: TaskRow[];
}

const PRESETS: {
  label: string;
  kind: RecurrenceKind;
  value: number;
  unit: RecurrenceUnit | null;
}[] = [
  { label: "Filter clean", kind: "turnover", value: 3, unit: null },
  { label: "Drain & refill", kind: "time", value: 90, unit: "day" },
  { label: "Cover inspection", kind: "time", value: 30, unit: "day" },
];

function recurrenceText(r: {
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
}): string {
  if (r.recurrenceKind === "turnover")
    return `every ${r.recurrenceValue} turnover${r.recurrenceValue === 1 ? "" : "s"}`;
  const u = r.recurrenceUnit ?? "day";
  return `every ${r.recurrenceValue} ${u}${r.recurrenceValue === 1 ? "" : "s"}`;
}

export function MaintenanceClient({
  groups,
  canEdit,
}: {
  groups: PropertyTasks[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function markDone(taskId: string, propertyId: string) {
    setError(null);
    startTransition(async () => {
      const res = await markMaintenanceDoneAction(taskId, propertyId, null);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function archive(taskId: string) {
    startTransition(async () => {
      const res = await archiveMaintenanceTaskAction(taskId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function addTask(group: PropertyTasks, fd: FormData) {
    fd.append("property_id", group.id);
    fd.append("org_id", group.orgId);
    setError(null);
    startTransition(async () => {
      const res = await createMaintenanceTaskAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (groups.length === 0) {
    return (
      <Card className="pad">
        <p className="muted">No properties yet.</p>
      </Card>
    );
  }

  return (
    <div className="stack">
      {error && <Note tone="warn">{error}</Note>}
      {groups.map((g) => (
        <div key={g.id} className="stack" style={{ gap: 8 }}>
          <h2 className="small" style={{ margin: 0 }}>
            {g.name}
          </h2>
          {g.tasks.length === 0 ? (
            <Card className="pad">
              <p className="muted small">No maintenance scheduled.</p>
            </Card>
          ) : (
            <div className="dlist">
              {g.tasks.map((t) => (
                <div key={t.id} className="drow2">
                  <div className="nmwrap">
                    <span className="nm">{t.title}</span>
                  </div>
                  <span className="when">{recurrenceText(t)}</span>
                  <div className="badges">
                    <span className={`spill ${maintenanceTone(t.status.state)}`}>
                      {maintenanceLabel(t.status)}
                    </span>
                    {canEdit && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => markDone(t.id, g.id)}
                        >
                          Mark done
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => archive(t.id)}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {canEdit && <AddScheduleForm group={g} onAdd={addTask} pending={isPending} />}
        </div>
      ))}
    </div>
  );
}

function AddScheduleForm({
  group,
  onAdd,
  pending,
}: {
  group: PropertyTasks;
  onAdd: (g: PropertyTasks, fd: FormData) => void;
  pending: boolean;
}) {
  const [kind, setKind] = useState<RecurrenceKind>("time");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("90");
  const [unit, setUnit] = useState<RecurrenceUnit>("day");

  function applyPreset(p: (typeof PRESETS)[number]) {
    setTitle(p.label);
    setKind(p.kind);
    setValue(String(p.value));
    if (p.unit) setUnit(p.unit);
  }

  function submit() {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("recurrence_kind", kind);
    fd.append("recurrence_value", value);
    if (kind === "time") fd.append("recurrence_unit", unit);
    onAdd(group, fd);
    setTitle("");
  }

  return (
    <Card className="pad stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => applyPreset(p)}
          >
            + {p.label}
          </Button>
        ))}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="stack" style={{ gap: 4 }}>
          <Label>Task</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Filter clean" />
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <Label>Every</Label>
          <Input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ width: 72 }}
          />
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <Label>Per</Label>
          <Select value={kind} onChange={(e) => setKind(e.target.value as RecurrenceKind)}>
            <option value="time">days/weeks/months</option>
            <option value="turnover">turnovers</option>
          </Select>
        </div>
        {kind === "time" && (
          <div className="stack" style={{ gap: 4 }}>
            <Label>Unit</Label>
            <Select value={unit} onChange={(e) => setUnit(e.target.value as RecurrenceUnit)}>
              <option value="day">days</option>
              <option value="week">weeks</option>
              <option value="month">months</option>
            </Select>
          </div>
        )}
        <Button variant="primary" disabled={pending || !title.trim()} onClick={submit}>
          Add schedule
        </Button>
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Reconcile UI props with the design system**

The exact props (`Button` `size`/`variant`, `Select`, `Note` `tone`) must match `@/components/ui`. Verify and adjust:
```bash
grep -n "ButtonVariant\|ButtonSize\|variant\|size" src/components/ui/Button.tsx | head
grep -n "tone\|NoteProps" src/components/ui/Feedback.tsx | head
grep -n "Select" src/components/ui/Input.tsx | head
```
Fix any prop mismatches (e.g. if `Note` has no `tone`, use a `<p className="t-warn">` for the error; if `Button` uses `variant="secondary"` instead of `"ghost"`, switch). The goal is type-clean usage, not invented props.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. Resolve any unused-var (`isPending` is used; remove if not) or prop-type errors.

- [ ] **Step 6: Manual verify on :3001**

Start the dev server on a free port: `npm run dev -- -p 3001`. Sign in (dev login bypass), visit `/operations`, click the now-live **Maintenance Schedule** tab. Add a preset schedule, confirm it lists with a status pill; click **Mark done** and confirm the pill resets to "Up to date" and a turnover-based task's "N left" advances. Confirm an owner/host account sees the list **without** the action buttons.

- [ ] **Step 7: Commit**

```bash
git add src/components/OperationsHeader.tsx src/app/operations/maintenance/
git commit -m "feat(maintenance): /operations/maintenance module — list, presets, mark-done (#150)"
```

---

## Task 7: Dashboard overdue surfacing

**Files:**
- Modify: `apps/web/src/app/operations/page.tsx`

- [ ] **Step 1: Load maintenance tasks in the dashboard query**

In `apps/web/src/app/operations/page.tsx`, extend the `.select(...)` on `property` to also pull maintenance tasks (add inside the existing select string):
```
       maintenance_task(
         id, recurrence_kind, recurrence_value, recurrence_unit, last_done_at, archived_at
       ),
```

- [ ] **Step 2: Compute overdue count per property**

Inside the `cards` map (where `locked` is already computed), add:
```ts
import { maintenanceStatus, type MaintenanceInput } from "@/lib/maintenance";
// ...
const lockedAts = locked
  .map((t) => t.submitted_at_server)
  .filter((s): s is string => !!s);
const overdueMaintenance = (p.maintenance_task ?? [])
  .filter((t) => !t.archived_at)
  .filter((t) => {
    const input: MaintenanceInput = {
      recurrenceKind: t.recurrence_kind,
      recurrenceValue: t.recurrence_value,
      recurrenceUnit: t.recurrence_unit,
      lastDoneAt: t.last_done_at,
      turnoversSinceDone: t.last_done_at
        ? lockedAts.filter((at) => at > (t.last_done_at as string)).length
        : lockedAts.length,
    };
    return maintenanceStatus(input, now).state === "overdue";
  }).length;
```
Then fold it into `attention`:
```ts
const attention = batherLoad || chemFlag != null || overdueMaintenance > 0;
```
and return `overdueMaintenance` on the card object.

- [ ] **Step 3: Render the maintenance signal on the card**

Where the card renders its flags/status line, add (when `p.overdueMaintenance > 0`):
```tsx
<span className="spill warn">
  Maintenance: {p.overdueMaintenance} overdue
</span>
```
Place it alongside the existing chemistry flag pills so the attention reason is legible.

- [ ] **Step 4: Typecheck + lint + build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 5: Manual verify on :3001**

On `/operations`, a property with an overdue maintenance task floats to the top, shows "Maintenance: N overdue", and the header "N need attention" count includes it.

- [ ] **Step 6: Commit**

```bash
git add src/app/operations/page.tsx
git commit -m "feat(maintenance): surface overdue maintenance on the Operations dashboard (#150)"
```

---

## Task 8: Full verification + PR

- [ ] **Step 1: Full quality gate**

Run (from `apps/web`):
```bash
npm run lint && npm run typecheck && npm run build
```
Expected: all PASS.

- [ ] **Step 2: Full test suite (incl. RLS with env set)**

Run:
```bash
npx vitest run
```
Expected: PASS. The RLS suite runs when the Supabase env vars are present (set them as in Task 4 Step 3); otherwise it skips loudly — ensure it actually runs at least once locally before the PR.

- [ ] **Step 3: Confirm migration replays clean from empty**

```bash
supabase db reset
```
Expected: clean replay through `20260614130000_maintenance`.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin operations-maintenance-schedule
gh pr create --base main \
  --title "feat(maintenance): Operations — Maintenance Schedule module (#150)" \
  --body "Implements #150 (epic #148). Recurring per-property maintenance (time- or turnover-based) with due/overdue status, completion log, presets, and dashboard surfacing. Spec: docs/superpowers/specs/2026-06-14-maintenance-schedule-module-design.md. RLS suite + maintenance unit tests added; migration replays clean."
```

- [ ] **Step 5: After CI green, self-merge**

```bash
gh pr merge --squash
```

- [ ] **Step 6: Apply the migration to the shared prod DB**

Per repo practice (shared Supabase project, MCP is source of truth), apply `20260614130000_maintenance.sql` to the live project via the Supabase MCP `apply_migration`, then re-run `get_advisors` to confirm no new RLS/security findings on the two tables.

---

## Notes for the implementer

- **RLS is the security gate.** The capturer-write / owner-read split is the whole point of issue #150's permission decision — don't widen `maintenance_task_write` to `app_can_see_property`.
- **`maintenance_log` is immutable** — there is intentionally no update/delete policy, mirroring `notification`/`proof_event`.
- **The dashboard query reuses turnover data already loaded** — don't add a second round-trip per card.
- **Brand rule:** green (`.spill.ready`) is for the "up to date" success state only; overdue uses `.spill.warn`.
- If Task 1 Step 3 reveals `log_evidence_change()` needs `org_id` on `maintenance_log`, add the column (denormalized) and set it in `markMaintenanceDoneAction`.
