# Operations Schedule — scheduling backend (`scheduled_item`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the RLS-scoped `scheduled_item` backend (table + server actions + auto-fulfill + assignment notifications) that the Operations Schedule calendar will render — model and actions only; the UI lands separately in #156 part 2.

**Architecture:** One `scheduled_item` table (day-level `date`, `kind` ∈ turnover/maintenance/custom) scoped per property exactly like `maintenance_task`. Maintenance occurrences are **computed on read** (no persisted rows until acted on). A turnover capture **auto-fulfills** a matching scheduled turnover via a SECURITY-DEFINER RPC called from the existing submit action. Assigning an item **notifies** the assignee via a SECURITY-DEFINER writer mirroring `notify_turnover_ready` (#117). All verification is the RLS replay suite (`tests/rls.test.ts`) plus a pure unit test for the read-merge helper.

**Tech Stack:** Postgres + Supabase RLS, Next.js 15 server actions (`"use server"`), Vitest. Migrations live in `apps/web/supabase/migrations/`; types in `apps/web/src/lib/supabase/types.ts` (generated, never hand-edited).

**Spec:** `docs/superpowers/specs/2026-06-14-operations-schedule-scheduling-backend-design.md`

> **Shared-DB rule (CLAUDE.md):** all tiers share one DB. The `scheduled_item` table is **additive** (low risk). But Task 2 edits a **shared object** (`log_evidence_change`) and Task 3 alters the existing `notification` table + `notification_type` enum. Per CLAUDE.md schema-rule §3, those **must be flagged to the founder for sign-off BEFORE being applied to the shared/prod DB** — validate on the local stack + CI `rls` replay first. Task 9 covers the flag + apply.

> **All paths below are relative to `apps/web/`** unless they start with `docs/`. Run all `npm`/`npx` commands from `apps/web/`.

---

## Local validation setup (do once, before Task 3+ tests)

The RLS suite (`tests/rls.test.ts`) talks to whatever Supabase `.env.local` points at, and the schema must exist there. Validate against the **local stack**, never the shared DB:

```bash
cd apps/web
npx supabase start                 # boots the local Postgres/Auth stack (idempotent)
npx supabase status                # prints API URL, anon key, service_role key
```

Create/append `apps/web/.env.local` with the three values `supabase status` printed:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from status>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from status>
```
`.env.local` is git-ignored — never commit it. If `npx supabase start` is unavailable in this environment, skip the local run and rely on the CI `rls` check (Task 8); note that in the PR.

---

## File Structure

- **Create** `supabase/migrations/20260614140000_scheduled_item.sql` — enums, `scheduled_item` table, indexes, RLS, audit-trigger extension, `fulfill_scheduled_turnover` RPC.
- **Create** `supabase/migrations/20260614140100_scheduled_assignment_notifications.sql` — `notification_type 'assigned'`, `notification.scheduled_item_id` column, idempotency index, `notify_scheduled_assignment` RPC.
- **Modify** `src/lib/supabase/types.ts` — regenerated after each migration (generated file).
- **Create** `src/lib/schedule.ts` — pure read-merge helper (scheduled_item rows + computed maintenance occurrences, de-duped).
- **Create** `tests/schedule.test.ts` — pure unit tests for `src/lib/schedule.ts`.
- **Create** `src/lib/actions/scheduled.ts` — server actions (create/edit/reschedule/assign/mark-done/skip).
- **Modify** `src/lib/actions/turnover.ts` — call `fulfill_scheduled_turnover` after `notify_turnover_ready`.
- **Modify** `tests/rls.test.ts` — new `describe` blocks for `scheduled_item`, `fulfill_scheduled_turnover`, `notify_scheduled_assignment`.
- **Modify** `supabase/README.md` — add the two new migration rows to the table.

---

## Task 1: Migration — `scheduled_item` table + RLS + audit + fulfill RPC

**Files:**
- Create: `supabase/migrations/20260614140000_scheduled_item.sql`
- Modify: `src/lib/supabase/types.ts` (regenerate)

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260614140000_scheduled_item.sql`:

```sql
-- Operations Schedule backend (epic #156, issue #157). A unified "scheduled
-- work" row the ops calendar renders: manual turnovers, custom tasks, and
-- maintenance occurrences that have been ACTED ON (maintenance is otherwise
-- computed-on-read from maintenance_task — see lib/schedule.ts). Day-level
-- scheduling (scheduled_for is a date, no time-of-day). RLS mirrors
-- maintenance_task: visible to anyone who can see the property; writable by a
-- capturer (operator OR assigned staff/tech), not the host.

create type scheduled_item_kind   as enum ('turnover', 'maintenance', 'custom');
create type scheduled_item_status as enum ('scheduled', 'done', 'skipped');
create type scheduled_item_source as enum ('manual', 'auto');

create table scheduled_item (
  id                  uuid primary key default gen_random_uuid(),
  property_id         uuid not null references property(id) on delete cascade,
  org_id              uuid not null references org(id) on delete cascade, -- denormalized for capturer write check
  kind                scheduled_item_kind not null,
  title               text not null,
  scheduled_for       date not null,
  assignee_user_id    uuid references auth.users(id) on delete set null,
  status              scheduled_item_status not null default 'scheduled',
  source              scheduled_item_source not null default 'manual',
  maintenance_task_id uuid references maintenance_task(id) on delete set null,
  turnover_id         uuid references turnover(id) on delete set null,
  notes               text,
  created_at          timestamptz not null default now(),
  done_at             timestamptz,
  archived_at         timestamptz
);

create index on scheduled_item (property_id, scheduled_for);

alter table scheduled_item enable row level security;

-- Anyone who can see the property reads; a capturer writes. org_id can't be
-- spoofed onto another property's org (mirrors maintenance_task_write).
create policy scheduled_item_select on scheduled_item for select to authenticated
  using (app_can_see_property(property_id));

create policy scheduled_item_write on scheduled_item for all to authenticated
  using (app_can_capture_property(property_id))
  with check (
    app_can_capture_property(property_id)
    and org_id = (select p.org_id from property p where p.id = property_id)
  );

-- Extend the audit writer to resolve org via property_id for scheduled_item
-- too. This only ADDS a new table to the existing property_id branch; behavior
-- for every existing table is unchanged. (SHARED OBJECT — flag for founder
-- sign-off before applying to the shared DB; see plan Task 9.)
create or replace function log_evidence_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_diff jsonb;
begin
  if tg_table_name in ('turnover', 'maintenance_task', 'maintenance_log', 'scheduled_item') then
    select p.org_id into v_org from property p where p.id = new.property_id;
  else
    -- issue_tag / photo / water_reading carry turnover_id
    select p.org_id into v_org
      from turnover t join property p on p.id = t.property_id
      where t.id = new.turnover_id;
  end if;

  if tg_op = 'INSERT' then
    v_diff := jsonb_build_object('new', to_jsonb(new));
  else
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;

  if v_org is not null then
    insert into audit_log(org_id, entity, entity_id, action, actor_id, diff)
    values (v_org, tg_table_name, new.id, tg_op, auth.uid(), v_diff);
  end if;

  return new;
end;
$$;

revoke execute on function public.log_evidence_change() from public;

create trigger audit_scheduled_item
  after insert or update on scheduled_item
  for each row execute function log_evidence_change();

-- Auto-fulfill: when a captured turnover locks, link it to a matching scheduled
-- turnover and flip that row to done. Deterministic single-row match: same
-- property, kind='turnover', still scheduled, not yet linked, scheduled_for
-- within ±2 days of the capture date; pick closest date, tie-break earliest
-- scheduled_for then earliest created_at. No match → ad-hoc turnover, no-op.
-- SECURITY DEFINER so the capturing staff member can flip a row the operator
-- created; authorization is gated on app_can_capture_property, exactly like
-- notify_turnover_ready.
create or replace function fulfill_scheduled_turnover(p_turnover_id uuid)
returns uuid                          -- the fulfilled scheduled_item id, or null
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_capture_date date;
  v_match uuid;
begin
  select t.property_id, (t.submitted_at_server)::date
    into v_property_id, v_capture_date
  from turnover t
  where t.id = p_turnover_id
    and t.status = 'submitted_locked';

  if v_property_id is null or not app_can_capture_property(v_property_id) then
    return null;
  end if;

  select si.id into v_match
  from scheduled_item si
  where si.property_id = v_property_id
    and si.kind = 'turnover'
    and si.status = 'scheduled'
    and si.turnover_id is null
    and abs(si.scheduled_for - v_capture_date) <= 2
  order by abs(si.scheduled_for - v_capture_date) asc,
           si.scheduled_for asc,
           si.created_at asc
  limit 1;

  if v_match is null then
    return null;
  end if;

  update scheduled_item
    set status = 'done', turnover_id = p_turnover_id, done_at = now()
    where id = v_match;

  return v_match;
end;
$$;

revoke execute on function public.fulfill_scheduled_turnover(uuid) from public, anon;
grant  execute on function public.fulfill_scheduled_turnover(uuid) to authenticated;
```

- [ ] **Step 2: Apply to the local stack and prove a clean replay**

Run: `npx supabase db reset`
Expected: replays ALL migrations from empty (including `20260614140000_scheduled_item`) and the seed, with no errors. This is the "migration replays clean" gate.

- [ ] **Step 3: Regenerate types**

Run: `npx supabase gen types typescript --local > src/lib/supabase/types.ts`
Then update the comment on line 4 of that file to reference the new migration:
`// (This revision generated from the local stack — schema includes 20260614140000_scheduled_item.)`

- [ ] **Step 4: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: no errors (the new `scheduled_item` table now appears in `Database`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260614140000_scheduled_item.sql src/lib/supabase/types.ts
git commit -m "feat(schedule): scheduled_item table, RLS, audit + auto-fulfill RPC (#157)"
```

---

## Task 2: Migration — assignment notifications

**Files:**
- Create: `supabase/migrations/20260614140100_scheduled_assignment_notifications.sql`
- Modify: `src/lib/supabase/types.ts` (regenerate)

Kept in a **separate** migration from Task 1 because `alter type ... add value` commits its new enum value before any function can use it, and to isolate the shared-`notification`-table change for the founder sign-off flag.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260614140100_scheduled_assignment_notifications.sql`:

```sql
-- Assignment notifications for scheduled work (issue #157). When a scheduled
-- item is assigned to a staff member, notify that assignee in-app, reusing the
-- #117 notification feed. Additive column + new enum value + a SECURITY-DEFINER
-- writer mirroring notify_turnover_ready. (Touches the SHARED notification table
-- + enum — flag for founder sign-off before the shared DB; see plan Task 9.)

alter type notification_type add value if not exists 'assigned';

alter table notification
  add column if not exists scheduled_item_id uuid
    references scheduled_item(id) on delete cascade;

-- Idempotent fan-out for assignment notifications (turnover_id is null for
-- these, so the existing recipient_turnover index doesn't apply).
create unique index if not exists notification_recipient_scheduled_idx
  on notification (user_id, scheduled_item_id, type)
  where scheduled_item_id is not null;

-- Writer: author one 'assigned' notification for the item's assignee. Gated on
-- the caller being able to capture the property (so it can't be abused to spam
-- arbitrary users), and skips self-assignment. SECURITY DEFINER so it can write
-- a row for another user and read profile/property despite RLS.
create or replace function notify_scheduled_assignment(p_scheduled_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_org_id uuid;
  v_property_name text;
  v_assignee uuid;
  v_kind scheduled_item_kind;
  v_title text;
  v_when date;
begin
  select si.property_id, si.org_id, p.name, si.assignee_user_id,
         si.kind, si.title, si.scheduled_for
    into v_property_id, v_org_id, v_property_name, v_assignee,
         v_kind, v_title, v_when
  from scheduled_item si
  join property p on p.id = si.property_id
  where si.id = p_scheduled_item_id;

  -- No-op unless the item has an assignee, the caller can capture the property,
  -- and the assignee isn't the caller assigning themselves.
  if v_assignee is null
     or v_property_id is null
     or not app_can_capture_property(v_property_id)
     or v_assignee = auth.uid() then
    return;
  end if;

  insert into notification (user_id, org_id, type, scheduled_item_id, property_id, message)
  values (
    v_assignee, v_org_id, 'assigned', p_scheduled_item_id, v_property_id,
    case when v_kind = 'turnover'
         then v_property_name || ' turnover — scheduled ' || to_char(v_when, 'Mon DD')
         else v_property_name || ' — ' || v_title || ' scheduled ' || to_char(v_when, 'Mon DD')
    end
  )
  on conflict (user_id, scheduled_item_id, type) where scheduled_item_id is not null
  do nothing;
end;
$$;

revoke execute on function public.notify_scheduled_assignment(uuid) from public, anon;
grant  execute on function public.notify_scheduled_assignment(uuid) to authenticated;
```

- [ ] **Step 2: Apply to the local stack and prove a clean replay**

Run: `npx supabase db reset`
Expected: replays all migrations including both new files, no errors.

- [ ] **Step 3: Regenerate types**

Run: `npx supabase gen types typescript --local > src/lib/supabase/types.ts`
Update the line-4 comment to: `// (This revision generated from the local stack — schema includes 20260614140100_scheduled_assignment_notifications.)`

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors. `Enums<"notification_type">` now includes `'assigned'`; `notification` row type has `scheduled_item_id`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260614140100_scheduled_assignment_notifications.sql src/lib/supabase/types.ts
git commit -m "feat(schedule): assignment notification writer + notification.scheduled_item_id (#157)"
```

---

## Task 3: RLS tests — `scheduled_item` CRUD isolation

**Files:**
- Modify: `tests/rls.test.ts` (add a `describe` block before the final closing `});` of the `RLS isolation` describe, i.e. after the `maintenance_task / maintenance_log` block that currently ends near line 1172)

- [ ] **Step 1: Write the failing tests**

Add this block immediately after the closing `});` of the `describe("maintenance_task / maintenance_log", ...)` block:

```ts
  describe("scheduled_item", () => {
    it("operator can create a scheduled item on their property", async () => {
      const { data, error } = await operatorA.client
        .from("scheduled_item")
        .insert({
          property_id: propAssigned,
          org_id: orgA,
          kind: "custom",
          title: "Order chlorine",
          scheduled_for: "2026-06-20",
        })
        .select("id")
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
    });

    it("assigned staff can create a scheduled item", async () => {
      const { error } = await staffA.client.from("scheduled_item").insert({
        property_id: propAssigned,
        org_id: orgA,
        kind: "turnover",
        title: "Turnover",
        scheduled_for: "2026-06-21",
      });
      expect(error).toBeNull();
    });

    it("operator of another org cannot create on this property", async () => {
      const { error } = await operatorB.client.from("scheduled_item").insert({
        property_id: propAssigned,
        org_id: orgA,
        kind: "custom",
        title: "Sneaky",
        scheduled_for: "2026-06-22",
      });
      expect(error).not.toBeNull(); // RLS denies
    });

    it("cannot spoof org_id onto a mismatched property", async () => {
      const { error } = await operatorA.client.from("scheduled_item").insert({
        property_id: propAssigned,
        org_id: orgB, // wrong org for this property
        kind: "custom",
        title: "Spoof",
        scheduled_for: "2026-06-23",
      });
      expect(error).not.toBeNull(); // with-check denies
    });

    it("another org cannot read this org's scheduled items", async () => {
      const { data: created } = await operatorA.client
        .from("scheduled_item")
        .insert({
          property_id: propAssigned,
          org_id: orgA,
          kind: "custom",
          title: "Private",
          scheduled_for: "2026-06-24",
        })
        .select("id")
        .single();
      const { data: seen } = await operatorB.client
        .from("scheduled_item")
        .select("id")
        .eq("id", created!.id);
      expect(seen ?? []).toHaveLength(0);
    });
  });
```

- [ ] **Step 2: Run the tests — verify they fail before the schema is present, pass after**

Run: `npm run test:rls`
Expected (against a local stack WITH Task 1 applied): PASS. If you run before applying Task 1's migration, the inserts fail because the table doesn't exist — confirming the tests exercise real schema. (The migration is the implementation here; Tasks 1–2 already applied it via `db reset`.)

- [ ] **Step 3: Commit**

```bash
git add tests/rls.test.ts
git commit -m "test(rls): scheduled_item isolation + org-spoof denial (#157)"
```

---

## Task 4: RLS tests — `fulfill_scheduled_turnover`

**Files:**
- Modify: `tests/rls.test.ts` (add a `describe` block after the `scheduled_item` block from Task 3)

Reuses the existing helper that creates a locked turnover. The maintenance/notification blocks already create turnovers via `admin.from("turnover").insert(... status: "submitted_locked")`; follow that pattern.

- [ ] **Step 1: Write the failing tests**

Add after the `scheduled_item` describe block:

```ts
  describe("fulfill_scheduled_turnover", () => {
    // Helper: a locked turnover on propAssigned, captured "today" in the test's
    // fixed clock terms. submitted_at_server defaults to now(); we schedule
    // items relative to a wide window so ±2 days is satisfied deterministically.
    async function lockedTurnoverToday() {
      const { data } = await admin
        .from("turnover")
        .insert({
          property_id: propAssigned,
          submitter_id: staffA.id,
          status: "submitted_locked",
        })
        .select("id, submitted_at_server")
        .single();
      return data!;
    }

    it("auto-fulfills the nearest matching scheduled turnover", async () => {
      const t = await lockedTurnoverToday();
      const captureDate = t.submitted_at_server.slice(0, 10); // YYYY-MM-DD
      const { data: si } = await operatorA.client
        .from("scheduled_item")
        .insert({
          property_id: propAssigned,
          org_id: orgA,
          kind: "turnover",
          title: "Planned turnover",
          scheduled_for: captureDate,
        })
        .select("id")
        .single();

      const { data: fulfilledId, error } = await staffA.client.rpc(
        "fulfill_scheduled_turnover",
        { p_turnover_id: t.id },
      );
      expect(error).toBeNull();
      expect(fulfilledId).toBe(si!.id);

      const { data: row } = await operatorA.client
        .from("scheduled_item")
        .select("status, turnover_id")
        .eq("id", si!.id)
        .single();
      expect(row?.status).toBe("done");
      expect(row?.turnover_id).toBe(t.id);
    });

    it("no-ops when no scheduled turnover is within the window", async () => {
      const t = await lockedTurnoverToday();
      // A scheduled item far outside ±2 days must NOT be matched.
      await operatorA.client.from("scheduled_item").insert({
        property_id: propAssigned,
        org_id: orgA,
        kind: "turnover",
        title: "Far future",
        scheduled_for: "2099-01-01",
      });
      const { data: fulfilledId, error } = await staffA.client.rpc(
        "fulfill_scheduled_turnover",
        { p_turnover_id: t.id },
      );
      expect(error).toBeNull();
      expect(fulfilledId).toBeNull();
    });

    it("an outside-org caller cannot fulfill against this property's turnover", async () => {
      const t = await lockedTurnoverToday();
      const captureDate = t.submitted_at_server.slice(0, 10);
      const { data: si } = await operatorA.client
        .from("scheduled_item")
        .insert({
          property_id: propAssigned,
          org_id: orgA,
          kind: "turnover",
          title: "Planned",
          scheduled_for: captureDate,
        })
        .select("id")
        .single();

      const { data: fulfilledId } = await operatorB.client.rpc(
        "fulfill_scheduled_turnover",
        { p_turnover_id: t.id },
      );
      expect(fulfilledId).toBeNull(); // app_can_capture_property gate

      const { data: row } = await operatorA.client
        .from("scheduled_item")
        .select("status")
        .eq("id", si!.id)
        .single();
      expect(row?.status).toBe("scheduled"); // untouched
    });
  });
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:rls`
Expected: the three `fulfill_scheduled_turnover` tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/rls.test.ts
git commit -m "test(rls): fulfill_scheduled_turnover matching + auth gate (#157)"
```

---

## Task 5: RLS tests — `notify_scheduled_assignment`

**Files:**
- Modify: `tests/rls.test.ts` (add a `describe` block after the `fulfill_scheduled_turnover` block)

- [ ] **Step 1: Write the failing tests**

```ts
  describe("notify_scheduled_assignment", () => {
    it("authors an 'assigned' notification for the assignee", async () => {
      const { data: si } = await operatorA.client
        .from("scheduled_item")
        .insert({
          property_id: propAssigned,
          org_id: orgA,
          kind: "turnover",
          title: "Turnover",
          scheduled_for: "2026-07-01",
          assignee_user_id: staffA.id,
        })
        .select("id")
        .single();

      const { error } = await operatorA.client.rpc("notify_scheduled_assignment", {
        p_scheduled_item_id: si!.id,
      });
      expect(error).toBeNull();

      // The assignee (staffA) sees their own 'assigned' notification.
      const { data: mine } = await staffA.client
        .from("notification")
        .select("type, scheduled_item_id")
        .eq("scheduled_item_id", si!.id);
      expect(mine ?? []).toHaveLength(1);
      expect(mine?.[0]?.type).toBe("assigned");
    });

    it("does not notify on self-assignment", async () => {
      const { data: si } = await operatorA.client
        .from("scheduled_item")
        .insert({
          property_id: propAssigned,
          org_id: orgA,
          kind: "custom",
          title: "Self task",
          scheduled_for: "2026-07-02",
          assignee_user_id: operatorA.id,
        })
        .select("id")
        .single();

      await operatorA.client.rpc("notify_scheduled_assignment", {
        p_scheduled_item_id: si!.id,
      });
      const { data: mine } = await operatorA.client
        .from("notification")
        .select("id")
        .eq("scheduled_item_id", si!.id);
      expect(mine ?? []).toHaveLength(0);
    });

    it("an outside-org caller cannot author an assignment notification", async () => {
      const { data: si } = await operatorA.client
        .from("scheduled_item")
        .insert({
          property_id: propAssigned,
          org_id: orgA,
          kind: "turnover",
          title: "Turnover",
          scheduled_for: "2026-07-03",
          assignee_user_id: staffA.id,
        })
        .select("id")
        .single();

      await operatorB.client.rpc("notify_scheduled_assignment", {
        p_scheduled_item_id: si!.id,
      });
      const { data: mine } = await staffA.client
        .from("notification")
        .select("id")
        .eq("scheduled_item_id", si!.id);
      expect(mine ?? []).toHaveLength(0); // gate blocked the write
    });
  });
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:rls`
Expected: the three `notify_scheduled_assignment` tests PASS. Run the full suite once to confirm no regressions: `npm run test:rls`.

- [ ] **Step 3: Commit**

```bash
git add tests/rls.test.ts
git commit -m "test(rls): notify_scheduled_assignment authoring + self-assign + auth gate (#157)"
```

---

## Task 6: Pure read-merge helper `lib/schedule.ts`

The calendar (computed-on-read, decision 2) merges persisted `scheduled_item` rows with computed maintenance occurrences, suppressing a computed occurrence when a persisted row already covers that `(maintenance_task_id, date)`. The DB reads belong to the #156-part-2 loader; the **merge/de-dupe is pure logic** and is unit-tested here.

**Files:**
- Create: `src/lib/schedule.ts`
- Create: `tests/schedule.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/schedule.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  mergeScheduledWithMaintenance,
  type PersistedItem,
  type ComputedMaintenance,
} from "@/lib/schedule";

describe("mergeScheduledWithMaintenance", () => {
  const persisted: PersistedItem[] = [
    { id: "p1", kind: "custom", scheduledFor: "2026-06-20", maintenanceTaskId: null },
    { id: "p2", kind: "maintenance", scheduledFor: "2026-06-22", maintenanceTaskId: "t1" },
  ];

  it("includes all persisted items as-is", () => {
    const out = mergeScheduledWithMaintenance(persisted, []);
    expect(out.map((i) => i.id)).toEqual(["p1", "p2"]);
  });

  it("adds a computed maintenance occurrence as a virtual item", () => {
    const computed: ComputedMaintenance[] = [
      { maintenanceTaskId: "t2", title: "Filter clean", dueDate: "2026-06-25" },
    ];
    const out = mergeScheduledWithMaintenance([], computed);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      virtual: true,
      kind: "maintenance",
      scheduledFor: "2026-06-25",
      maintenanceTaskId: "t2",
      title: "Filter clean",
    });
    expect(out[0].id).toBeNull();
  });

  it("suppresses a computed occurrence already covered by a persisted row", () => {
    const computed: ComputedMaintenance[] = [
      { maintenanceTaskId: "t1", title: "Cover check", dueDate: "2026-06-22" }, // same task+date as p2
      { maintenanceTaskId: "t1", title: "Cover check", dueDate: "2026-07-22" }, // different date → kept
    ];
    const out = mergeScheduledWithMaintenance(persisted, computed);
    const virtual = out.filter((i) => i.virtual);
    expect(virtual).toHaveLength(1);
    expect(virtual[0].scheduledFor).toBe("2026-07-22");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/schedule.test.ts`
Expected: FAIL — cannot resolve `@/lib/schedule`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/schedule.ts`:

```ts
// Pure merge of persisted scheduled_item rows with computed maintenance
// occurrences for the ops calendar (issue #157, decision: compute-on-read).
// The DB reads live in the calendar loader (#156 part 2); this module only
// decides what the calendar shows, so it stays DB-free and unit-testable.

export type ScheduledKind = "turnover" | "maintenance" | "custom";

export interface PersistedItem {
  id: string;
  kind: ScheduledKind;
  scheduledFor: string; // YYYY-MM-DD
  maintenanceTaskId: string | null;
}

export interface ComputedMaintenance {
  maintenanceTaskId: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
}

export interface CalendarItem {
  id: string | null; // null for a virtual (not-yet-persisted) occurrence
  virtual: boolean;
  kind: ScheduledKind;
  title?: string;
  scheduledFor: string;
  maintenanceTaskId: string | null;
}

/**
 * Returns the calendar's items: every persisted row, plus each computed
 * maintenance occurrence that isn't already covered by a persisted row for the
 * same (maintenanceTaskId, date). Persisted rows win — acting on an occurrence
 * persists it, and the computed twin must then disappear.
 */
export function mergeScheduledWithMaintenance(
  persisted: PersistedItem[],
  computed: ComputedMaintenance[],
): CalendarItem[] {
  const covered = new Set(
    persisted
      .filter((p) => p.maintenanceTaskId != null)
      .map((p) => `${p.maintenanceTaskId}::${p.scheduledFor}`),
  );

  const fromPersisted: CalendarItem[] = persisted.map((p) => ({
    id: p.id,
    virtual: false,
    kind: p.kind,
    scheduledFor: p.scheduledFor,
    maintenanceTaskId: p.maintenanceTaskId,
  }));

  const fromComputed: CalendarItem[] = computed
    .filter((c) => !covered.has(`${c.maintenanceTaskId}::${c.dueDate}`))
    .map((c) => ({
      id: null,
      virtual: true,
      kind: "maintenance" as const,
      title: c.title,
      scheduledFor: c.dueDate,
      maintenanceTaskId: c.maintenanceTaskId,
    }));

  return [...fromPersisted, ...fromComputed];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/schedule.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/schedule.ts tests/schedule.test.ts
git commit -m "feat(schedule): pure merge of persisted + computed maintenance occurrences (#157)"
```

---

## Task 7: Server actions `lib/actions/scheduled.ts`

**Files:**
- Create: `src/lib/actions/scheduled.ts`

Mirrors `src/lib/actions/maintenance.ts` (same `ActionResult`, `createClient`, `revalidatePath` patterns). All writes go through RLS as the authed capturer.

- [ ] **Step 1: Write the implementation**

Create `src/lib/actions/scheduled.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Enums } from "@/lib/supabase/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

type Kind = Enums<"scheduled_item_kind">;

function revalidate() {
  revalidatePath("/operations/schedule");
  revalidatePath("/operations");
}

export async function createScheduledItemAction(input: {
  propertyId: string;
  orgId: string;
  kind: Kind;
  title: string;
  scheduledFor: string; // YYYY-MM-DD
  maintenanceTaskId?: string | null;
  source?: Enums<"scheduled_item_source">;
  notes?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (!input.propertyId || !input.orgId)
    return { ok: false, error: "Missing property." };
  if (!input.scheduledFor) return { ok: false, error: "Pick a date." };

  const { error } = await supabase.from("scheduled_item").insert({
    property_id: input.propertyId,
    org_id: input.orgId,
    kind: input.kind,
    title,
    scheduled_for: input.scheduledFor,
    maintenance_task_id: input.maintenanceTaskId ?? null,
    source: input.source ?? "manual",
    notes: input.notes?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function editScheduledItemAction(
  id: string,
  input: { title: string; notes?: string | null },
): Promise<ActionResult> {
  const supabase = await createClient();
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  const { error } = await supabase
    .from("scheduled_item")
    .update({ title, notes: input.notes?.trim() || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function rescheduleScheduledItemAction(
  id: string,
  scheduledFor: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  if (!scheduledFor) return { ok: false, error: "Pick a date." };
  const { error } = await supabase
    .from("scheduled_item")
    .update({ scheduled_for: scheduledFor })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function assignScheduledItemAction(
  id: string,
  assigneeUserId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduled_item")
    .update({ assignee_user_id: assigneeUserId })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Best-effort notify: the writer no-ops on self-assign / unauthorized, so a
  // hiccup must never fail the assignment itself.
  if (assigneeUserId) {
    try {
      await supabase.rpc("notify_scheduled_assignment", {
        p_scheduled_item_id: id,
      });
    } catch {
      // Swallow — the assignment is saved regardless of the notification.
    }
  }
  revalidate();
  return { ok: true };
}

export async function markScheduledItemDoneAction(input: {
  id: string;
  // For a maintenance occurrence, also write the completion log + re-arm cycle.
  maintenanceTaskId?: string | null;
  propertyId?: string | null;
  note?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowIso = new Date().toISOString();

  if (input.maintenanceTaskId && input.propertyId) {
    const { error: logErr } = await supabase.from("maintenance_log").insert({
      task_id: input.maintenanceTaskId,
      property_id: input.propertyId,
      done_by: user.id,
      note: input.note?.trim() || null,
    });
    if (logErr) return { ok: false, error: logErr.message };
    const { error: taskErr } = await supabase
      .from("maintenance_task")
      .update({ last_done_at: nowIso })
      .eq("id", input.maintenanceTaskId);
    if (taskErr) return { ok: false, error: taskErr.message };
  }

  const { error } = await supabase
    .from("scheduled_item")
    .update({ status: "done", done_at: nowIso })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function skipScheduledItemAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduled_item")
    .update({ status: "skipped" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
```

- [ ] **Step 2: Verify lint + typecheck**

Run: `npm run lint && npm run typecheck`
Expected: clean. (No unit test here — server actions are thin RLS-gated wrappers; their guarantees are the RLS tests in Tasks 3–5.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/scheduled.ts
git commit -m "feat(schedule): server actions for scheduled_item CRUD + assign + done/skip (#157)"
```

---

## Task 8: Wire auto-fulfill into the turnover submit action + full gate

**Files:**
- Modify: `src/lib/actions/turnover.ts` (the notification block near the end, after `notify_turnover_ready`)

- [ ] **Step 1: Add the fulfill call**

In `src/lib/actions/turnover.ts`, locate the best-effort notification block:

```ts
  try {
    const { data: recipients } = await supabase.rpc("notify_turnover_ready", {
      p_turnover_id: turnover.id,
    });
    for (const r of recipients ?? []) {
      await sendReadyEmail(r.email, property.name);
    }
  } catch {
    // Swallow: the evidence is captured and locked regardless of notification.
  }
```

Add a second best-effort block immediately after it (before `return { id: turnover.id, shareToken };`):

```ts
  // Auto-fulfill a matching scheduled turnover (issue #157): link this capture
  // to the nearest planned turnover and flip it to done. Best-effort — the
  // turnover is already locked, so a no-match or hiccup must never fail submit.
  try {
    await supabase.rpc("fulfill_scheduled_turnover", {
      p_turnover_id: turnover.id,
    });
  } catch {
    // Swallow: an unfulfilled plan is fine; the evidence is captured regardless.
  }
```

- [ ] **Step 2: Verify lint + typecheck + build**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: all clean. (`rpc("fulfill_scheduled_turnover", ...)` typechecks against the regenerated types.)

- [ ] **Step 3: Run the full test suites**

Run: `npm run test:rls && npx vitest run tests/schedule.test.ts`
Expected: all PASS (the RLS suite requires the local stack + `.env.local`; if unavailable, rely on CI in Task 9 and note it).

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/turnover.ts
git commit -m "feat(schedule): auto-fulfill scheduled turnover on capture (#157)"
```

---

## Task 9: README, push, CI, founder sign-off + shared-DB apply

**Files:**
- Modify: `supabase/README.md` (add the two new migration rows)

- [ ] **Step 1: Document the migrations**

In `supabase/README.md`, add two rows to the migrations table:

```md
| `20260614140000_scheduled_item.sql` | `scheduled_item` | ops-calendar scheduled-work table + RLS + audit-trigger extension + `fulfill_scheduled_turnover` RPC (#157) |
| `20260614140100_scheduled_assignment_notifications.sql` | `scheduled_assignment_notifications` | `notification_type 'assigned'` + `notification.scheduled_item_id` + `notify_scheduled_assignment` RPC (#157) |
```

- [ ] **Step 2: Commit + push + open PR**

```bash
git add supabase/README.md
git commit -m "docs(supabase): record scheduled_item migrations (#157)"
git push -u origin operations-schedule-backend
gh pr create --base main \
  --title "feat(schedule): Operations Schedule scheduling backend — scheduled_item (#157)" \
  --body "$(cat <<'EOF'
Implements the #157 scheduling backend per docs/superpowers/specs/2026-06-14-operations-schedule-scheduling-backend-design.md.

- `scheduled_item` table (day-level), RLS like `maintenance_task`
- compute-on-read maintenance overlay (`lib/schedule.ts`, pure + unit-tested)
- assignment notifications (`notify_scheduled_assignment`, reuses #117 feed)
- deterministic turnover auto-fulfill on capture (`fulfill_scheduled_turnover`)
- new RLS isolation cases (scheduled_item, fulfill, assignment)

⚠️ **Shared-DB note (CLAUDE.md §3):** two changes touch shared objects and need
founder sign-off before applying to the shared DB:
- `log_evidence_change()` redefined (additive: adds `scheduled_item` to the
  property_id branch; no behavior change to existing tables)
- `notification` table altered (`+scheduled_item_id`) and `notification_type`
  enum gains `'assigned'`

Not yet applied to the shared DB — local stack + CI `rls` replay green first.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirm CI is green**

Run: `gh pr checks --watch`
Expected: the `web (lint · typecheck · build)` and `rls` checks pass. The `rls` check is the authoritative isolation gate (ephemeral local Supabase).

- [ ] **Step 4: Flag the shared-object changes to the founder**

Per CLAUDE.md schema-rule §3, before applying to the shared DB, surface to the founder for sign-off (this is a STOP — do not self-apply the shared-object pieces without it):
- `log_evidence_change()` redefinition (additive branch entry, no existing-table behavior change),
- `notification` `+scheduled_item_id` column and `notification_type` `+'assigned'`.

The `scheduled_item` table + its RLS + the two RPCs are additive/new-object (low-risk, current practice). Once the founder signs off, apply **both** migration files to the shared project (`slkxwpiiludisrnwnxlg`) via the Supabase MCP `apply_migration` tool, in version order.

- [ ] **Step 5: Merge**

After CI green + founder sign-off + shared-DB apply:

```bash
gh pr merge --squash
```

- [ ] **Step 6: Complete the worktree**

Remove the worktree per the CLAUDE.md lifecycle (`ExitWorktree`, or `git worktree remove <path> && git branch -d operations-schedule-backend`). The UI (calendar views consuming `lib/schedule.ts` + these actions) lands in #156 part 2.

---

## Self-Review notes (author)

- **Spec coverage:** table + RLS (Task 1) · audit (Task 1) · 6 server actions (Task 7) · compute-on-read overlay (Task 6) · assignment notification (Task 2 migration, Task 7 wiring, Task 5 tests) · auto-fulfill ±2-day deterministic match (Task 1 RPC, Task 8 wiring, Task 4 tests) · custom-task one-off (no recurrence column — by omission) · legacy `task` left untouched (no task modifies it) · RLS isolation + clean replay + lint/typecheck/build (Tasks 3–5, 8, 9). All spec sections map to a task.
- **Type consistency:** action file uses `Enums<"scheduled_item_kind">` / `<"scheduled_item_source">` from regenerated types; RPC names `fulfill_scheduled_turnover` / `notify_scheduled_assignment` and param names `p_turnover_id` / `p_scheduled_item_id` are identical across migration, tests, and actions. `mergeScheduledWithMaintenance` signature matches between `lib/schedule.ts` and its test.
- **Shared-DB safety:** shared-object edits isolated to a clearly-flagged migration and a STOP gate (Task 9 Step 4) before any shared-DB apply.
