# App Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app surface with the 10-screen flow from the October mockup (Home · Calendar · Tubs · Reports), built by parallel agents in separate Orca worktrees.

**Architecture:** Keep the database, auth, RLS, CSP and deploy pipeline. Lane 0 lays a new phone-first app shell and removes retired routes. Lane 1 makes additive-only schema changes and adds shared domain constants. Lanes 2–5 each own one group of routes and build their screens against the Lane 0/1 contracts. Lanes 0 and 1 run in full detail here. Lanes 2–5 are scoped here, and each lane's agent writes its own detailed task list (superpowers:writing-plans) against `main` once its dependencies have merged, because their exact interfaces depend on code Lanes 0/1 produce.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript strict, Supabase (Postgres + RLS + Storage), Vitest + Testing Library (jsdom), `next/font/google`.

**Spec:** `docs/superpowers/specs/2026-10-27-app-rebuild-design.md` (approved 2026-10-27). Mockup: https://claude.ai/artifact/VPpM57oyGvZD3qrgGp291U.

## Global Constraints

- Every PR: worktree → PR to `main` → `web (lint · typecheck · build)` and `rls` green → `gh pr merge --squash`. Never push to `main`/`test`/`prod`. No promotion unless the founder asks.
- **Shared database:** `main`, `test` and `prod` use one Supabase project (`slkxwpiiludisrnwnxlg`). Migrations are **additive only** in this plan. Apply each one to the shared DB with the Supabase MCP **after** its PR's CI is green and **before** merging it. Prod code must keep working on the new schema.
- **Only Lane 1 writes files under `apps/web/supabase/migrations/` or `src/lib/supabase/types.ts`.**
- Migration timestamps are reserved here (below). Don't invent new ones; if one is needed, take the next free one after `20261028120400`.
- Copy rules (D23): never "verified", "tamper-proof", "dispute-grade" or "immutable" in UI copy. Green (`#34D399`; `#0A7A55` on white) only for success, locked or in-range.
- Colours: background `#08090A`, surface `#131417`, raised `#191B20`, text `#EDEDEF`, secondary `#8A8F98` / `#A1A6AF`, primary button `#2563EB` with white text, brand `#3B82F6`, link `#7FB0FF`, due/out-of-range `#E8A33D` (text `#F2B85C`).
- Font: Archivo for the signed-in app only. `/landing` and `/blog` keep their fonts.
- Tap targets ≥ 44px; text contrast ≥ 4.5:1.
- Reading targets: alkalinity 80–120 (step 10), pH 7.2–7.8 (0.1), hardness 150–250 (10), chlorine 1–3 (0.5). Order: alkalinity → pH → hardness → chlorine.
- Care defaults: drain 90 days, filter change 60 days.
- Signed-in pages stay dynamic (CSP nonce). Read `docs/incidents/` before touching render modes.

## Route contract (all lanes)

| Path | Screen | Owner lane |
|---|---|---|
| `/` | 2 Home | 5 (stub by 0) |
| `/calendar` | 3 Calendar | 5 (stub by 0) |
| `/tubs` | 4 Tubs | 3 (stub by 0) |
| `/tubs/new` | Add tub | 3 |
| `/tubs/[id]` | 5 One tub | 3 |
| `/visits/[id]` | 6 Visit (+ 7 reading sheet, 8 camera as in-page overlays) | 2 |
| `/records/[id]` | 9 Record, operator view (Send / Copy link) | 4 |
| `/proof/[token]` | 9 Record, owner view (exists; restyled) | 4 |
| `/reports` | 10 Reports | 4 (stub by 0) |

`/p/[id]` and `/t/[id]` stay alive until Lanes 3 and 4 replace them; the replacing lane deletes them.

## Reserved migration timestamps (Lane 1)

| Timestamp | File |
|---|---|
| `20261028120000` | `_client.sql` |
| `20261028120100` | `_property_care_intervals.sql` |
| `20261028120200` | `_share_view.sql` |
| `20261028120300` | `_water_reading_as_left.sql` |

## Review Focus

1. **A visit reloaded mid-job:** the draft and every logged entry come back exactly. Owner: Lane 2, which must have a test that reloads the draft snapshot after each entry type.
2. **A tap on "Log it" with untouched rows:** stores null for those rows, never last visit's numbers. Owner: Lane 2 (reading sheet test `untouched rows log as null`).
3. **Opening a share link for a locked visit:** records a view without tripping `turnover_lock_guard`. Owner: Lane 1 Task 3 (`record_share_view on a locked turnover succeeds`).
4. **Prod code on the new schema:** after each migration, the existing prod flows (draft save, proof page) still work. Owner: Lane 1. Each migration task runs the existing `rls` suite unchanged and it must pass.
5. **A tub with no history at all:** Home, Calendar and the tub brief show plain "—" / "No visits yet", never NaN, "Invalid Date" or a crash. Owners: Lanes 3 and 5, each with a `no visits` test.

---

## Lane 0 — Foundation (one agent, one worktree, PRs in order)

### Task 0.1: Land the phase-1 branch

**Files:** branch `worktree-spec-core-flow-rebuild` (pushed; 7 commits): `src/app/error.tsx`, `src/app/p/[id]/error.tsx`, `src/lib/routes.ts`, `tests/error-boundary-coverage.test.ts`, `tests/nav-route-coverage.test.ts`, and edits to `field/*`.

**Produces:** `routeExists(href: string, appDir: string): boolean` in `src/lib/routes.ts`; the `NAV_FILES` list in `tests/nav-route-coverage.test.ts`; and the error-boundary coverage test.

- [ ] **Step 1:** Create the worktree from the branch and rebase onto `origin/main`. Resolve conflicts in favour of `main` for any file outside the list above.
- [ ] **Step 2:** In the September spec/plan docs on the branch, add a first line saying they're superseded by `2026-10-27-app-rebuild-design.md`.
- [ ] **Step 3:** Run `npm run lint && npm run typecheck && npm test && npm run build` in `apps/web`. Expected: all pass.
- [ ] **Step 4:** Open a PR "Phase-1 correctness: error boundaries + nav route guard", wait for green CI, then squash-merge.

### Task 0.2: App tokens and Archivo, scoped to the app

**Files:**
- Create: `src/app/app-tokens.css`
- Modify: `src/app/layout.tsx` (add Archivo via `next/font/google`, variable `--font-archivo`, on `<html>` alongside the existing ones)
- Test: `tests/app-tokens.test.ts`

**Produces:** a CSS class `.tt-app`, which sets `font-family: var(--font-archivo), system-ui, sans-serif` and these custom properties: `--tt-bg #08090A`, `--tt-surface #131417`, `--tt-raised #191B20`, `--tt-text #EDEDEF`, `--tt-text-2 #A1A6AF`, `--tt-text-3 #8A8F98`, `--tt-action #2563EB`, `--tt-brand #3B82F6`, `--tt-link #7FB0FF`, `--tt-due #E8A33D`, `--tt-due-text #F2B85C`, `--tt-ok #34D399`, `--tt-radius-card 24px`, `--tt-radius-tile 20px`, `--tt-tap 44px`.

- [ ] **Step 1: Write the failing test.** `tests/app-tokens.test.ts` reads `src/app/app-tokens.css` and asserts it contains each `--tt-*: value` pair above, verbatim and case-insensitive.
- [ ] **Step 2:** Run `npx vitest run tests/app-tokens.test.ts`. Expected: FAIL (file missing).
- [ ] **Step 3:** Create `app-tokens.css` with `.tt-app { … }`, and import it in `layout.tsx`. Add Archivo weights 400, 500, 600, 700, `display: "swap"`.
- [ ] **Step 4:** Run the test. Expected: PASS. Run `npm run build`. Expected: OK.
- [ ] **Step 5:** Commit `feat(app): app tokens + Archivo scoped to .tt-app`.

### Task 0.3: Four-tab app shell with stub pages

**Files:**
- Create: `src/lib/app-routes.ts`, `src/components/app/AppShell.tsx`, `src/components/app/TabBar.tsx`
- Create stub pages + `error.tsx` for: `src/app/calendar/`, `src/app/tubs/`, `src/app/reports/`
- Modify: `src/app/page.tsx` (replace with a Home stub), `src/components/Shell.tsx` (signed-in, non-public paths render `AppShell` instead of the sidebar)
- Modify: `tests/nav-route-coverage.test.ts` (`NAV_FILES` += `src/components/app/TabBar.tsx` and `src/lib/app-routes.ts`; remove `field/BottomTabBar.tsx`)
- Test: `tests/app/tab-bar.test.tsx`

**Interfaces — Produces:**
```ts
// src/lib/app-routes.ts
export type AppTab = { href: "/" | "/calendar" | "/tubs" | "/reports"; label: "Home" | "Calendar" | "Tubs" | "Reports" };
export const APP_TABS: readonly AppTab[];            // in that order
export function activeTab(pathname: string): AppTab["href"] | null; // "/tubs/abc" → "/tubs"; "/visits/x" → null
export const tubPath = (id: string) => `/tubs/${id}`;
export const visitPath = (id: string) => `/visits/${id}`;
export const recordPath = (id: string) => `/records/${id}`;
```
- `AppShell({ children }: { children: React.ReactNode })` renders `<div class="tt-app">`, the children, then `<TabBar/>`, fixed to the bottom with the safe-area inset.
- `TabBar()` is a client component that uses `usePathname()` and `activeTab()`. Each tab is a `<Link>` with `aria-current="page"` when active and a min height of 44px.
- Stub pages are server components that call `getCurrentMembership()`, redirect to `/login` when it's null, and render an `<h1>` with the tab name. Pages stay dynamic.

- [ ] **Step 1: Write the failing tests:**
  - `activeTab`: `"/"→"/"`, `"/tubs"→"/tubs"`, `"/tubs/123"→"/tubs"`, `"/calendar"→"/calendar"`, `"/reports"→"/reports"`, `"/visits/1"→null`.
  - `TabBar` (jsdom; mock `next/navigation` `usePathname` → `"/tubs/9"`): renders 4 links labelled Home, Calendar, Tubs, Reports in order, and only Tubs has `aria-current="page"`.
- [ ] **Step 2:** Run `npx vitest run tests/app`. Expected: FAIL.
- [ ] **Step 3:** Implement `app-routes.ts`, `TabBar.tsx`, `AppShell.tsx`, the stubs and the `Shell.tsx` switch. The public paths list in `Shell.tsx` stays as-is. The staff/owner role branches are removed from the shell (single-user; spec).
- [ ] **Step 4:** Run `npm test` (includes nav-route and error-boundary coverage) and `npm run build`. Expected: PASS / OK.
- [ ] **Step 5:** PR "App shell: Home · Calendar · Tubs · Reports", wait for green CI, then squash-merge.

### Task 0.4: Remove retired routes

**Files:** delete `src/app/operations/`, `src/app/team/`, `src/app/insights/`, `src/app/chemistry/`, `src/app/field/`, `src/app/p/[id]/new/`, `src/app/add-property/`, `src/app/dev/`, `src/app/CleanerHome.tsx`, `src/app/NotificationFeed.tsx`. Also delete components, libs and tests that are only imported by those, found by running `npm run typecheck` and `npx vitest run` after each delete. Don't delete anything still imported by `/p/[id]`, `/t/[id]`, `/proof/[token]`, `/login`, `/auth/*`, `/invite/[token]`, `/landing` or `/blog`. Delete no migrations.

- [ ] **Step 1:** Delete the route folders. Run `npm run typecheck` and remove only the now-unreferenced modules it reveals. Repeat until clean.
- [ ] **Step 2:** Run `npm run lint && npm test && npm run build`. Expected: pass. The build route list no longer contains the retired paths.
- [ ] **Step 3:** PR "Remove retired app surfaces (ops hub, team, insights, field, old capture)", wait for green CI, then squash-merge. List every deleted file in the PR body.

---

## Lane 1 — Database + domain constants (one agent, one worktree; tasks strictly in order)

**Every migration task follows this pattern:**
1. Write the RLS test.
2. `supabase db reset` locally and run `npm run test:rls`. Expected: the new test fails.
3. Write the migration.
4. Run `npm run test:rls` again. Expected: all pass, including the existing suite unchanged.
5. Regenerate types with `npx supabase gen types typescript --local > src/lib/supabase/types.ts`.
6. Open the PR and wait for CI green.
7. Apply the migration to the shared DB via the Supabase MCP `apply_migration`, using the same name and SQL.
8. Squash-merge.

### Task 1.1: `client` table

**Files:** `supabase/migrations/20261028120000_client.sql`, `tests/rls.test.ts` (new `describe("client")`), `src/lib/supabase/types.ts`

**Produces:**
- Table `client(id uuid pk default gen_random_uuid(), org_id uuid not null references org on delete cascade, name text not null, contact_email text, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`.
- Column `property.client_id uuid null references client(id) on delete set null`.
- RLS: select/insert/update/delete for authenticated members of `org_id`, using the same helper the `property` policies use.
- Backfill: one client per existing org, named after the org's name. Every property is assigned to its org's client.

- [ ] **Step 1: Write the failing RLS tests:**
  - `client: member sees own org's clients only` (org A user selects → only A rows);
  - `client: cannot insert into another org` (A inserting with B's `org_id` → error);
  - `property.client_id backfilled` (after reset, every seeded property has a non-null `client_id`).
- [ ] **Steps 2–8:** Follow the pattern above. The PR title is "db: client table (additive)".

### Task 1.2: Per-tub care intervals

**Files:** `supabase/migrations/20261028120100_property_care_intervals.sql`, `tests/rls.test.ts`, `types.ts`

**Produces:**
- `property.drain_interval_days int null check (drain_interval_days between 1 and 730)`;
- `property.filter_interval_days int null check (filter_interval_days between 1 and 730)`.

Null means "use the default".

- [ ] **Step 1: Write the failing test:** `property care intervals: 0 rejected, 90 accepted, null accepted`.
- [ ] **Steps 2–8:** Follow the pattern. The PR title is "db: per-tub care intervals (additive)".

### Task 1.3: Share-link opened tracking

**Files:** `supabase/migrations/20261028120200_share_view.sql`, `tests/rls.test.ts`, `types.ts`

**Produces:**
- Table `share_view(id uuid pk, turnover_id uuid not null references turnover on delete cascade, opened_at timestamptz not null default now())`. RLS lets authenticated org members select rows for their org's turnovers. There is no insert/update/delete policy for anyone.
- Function `record_share_view(p_token text) returns void`: `security definer`, `set search_path = public`. It inserts one row for the turnover whose `share_token = p_token`, and is a no-op for an unknown token. `grant execute` to `anon, authenticated`.
- A separate table is needed because `turnover_lock_guard` blocks updates to a locked turnover.

- [ ] **Step 1: Write the failing tests:**
  - `record_share_view on a locked turnover succeeds` (lock a turnover, then call as anon → a row exists);
  - `share_view not readable by anon`;
  - `share_view readable by the owning org, not by another org`;
  - `unknown token is a no-op`.
- [ ] **Steps 2–8:** Follow the pattern. The PR title is "db: share_view for record opens (additive)".

### Task 1.4: As-left reading columns (D27, additive form)

**Files:** `supabase/migrations/20261028120300_water_reading_as_left.sql`, `tests/rls.test.ts`, `types.ts`

**Produces:** on `water_reading`:
- `left_total_alkalinity numeric`, `left_ph numeric`, `left_calcium_hardness numeric`, `left_sanitizer_ppm numeric`, all null;
- `found_recorded_at timestamptz` (backfilled from `recorded_at`) and `left_recorded_at timestamptz`.

The existing columns stay the **as-found** reading. One row per visit is unchanged, so `unique(turnover_id)` and every existing query and policy keep working, including prod's.

- [ ] **Step 1: Write the failing tests:**
  - `as-left values save on a draft` (update a draft's reading with `left_ph = 7.5` → persists);
  - `as-left blocked once locked` (lock, then update `left_ph` → error);
  - `found_recorded_at backfilled` (a pre-existing row has `found_recorded_at = recorded_at`).
- [ ] **Steps 2–8:** Follow the pattern. The PR title is "db: as-left reading columns (additive, D27)".

### Task 1.5: Domain constants (no migration)

**Files:** create `src/lib/readings.ts`; modify `src/lib/types.ts`; create `tests/readings.test.ts`.

**Produces:**
```ts
// src/lib/readings.ts
export type ReadingKind = "found" | "left";
export type ReadingField = "total_alkalinity" | "ph" | "calcium_hardness" | "sanitizer_ppm";
export const READING_FIELDS: readonly ReadingField[]; // alkalinity → pH → hardness → chlorine
export const READING_TARGETS: Record<ReadingField, { label: string; short: string; lo: number; hi: number; step: number; decimals: 0 | 1 }>;
export function inRange(field: ReadingField, value: number | null): boolean | null; // null when value is null
export function readingColumn(field: ReadingField, kind: ReadingKind): string;     // ("ph","left") → "left_ph"; ("ph","found") → "ph"
export const CARE_DEFAULTS: { drainDays: 90; filterDays: 60 };
```
In `src/lib/types.ts`, `CleaningStepCode` and `CLEANING_STEPS` gain:
- `filter_replaced` ("Replaced filter");
- `drained_refilled` ("Drained & refilled");
- `cover_cleaned` ("Cleaned cover").

Existing codes are kept.

- [ ] **Step 1: Write the failing tests:**
  - `inRange("ph", 7.9) === false`;
  - `inRange("ph", 7.5) === true`;
  - `inRange("sanitizer_ppm", null) === null`;
  - `READING_FIELDS` order;
  - `readingColumn` both kinds;
  - targets/steps equal the Global Constraints values;
  - `CLEANING_STEPS` contains the 3 new codes.
- [ ] **Step 2:** Run `npx vitest run tests/readings.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** PR "domain: reading targets + new work codes", wait for green CI, then squash-merge. Lane 1 may land this first; it touches no migrations.

### Task 1.6: Prod schema audit

- [ ] **Step 1:** Use the Supabase MCP `list_tables` (verbose) on the shared project. Diff `water_reading`, `property`, `turnover` and `photo` columns against a local `supabase db reset`.
- [ ] **Step 2:** If prod has columns that migrations lack, write a new no-op-on-prod migration (`add column if not exists …`) at the next free timestamp, so a fresh replay matches prod. Then PR, apply and merge as in the pattern.
- [ ] **Step 3:** Post the diff result (even "no drift") as a comment on the epic.

---

## Lanes 2–5 — scoped here, detailed by the lane agent

Each lane agent's first step is to run superpowers:writing-plans against `main` after its dependencies have merged. The output is `docs/superpowers/plans/2026-10-2x-lane-N-<name>.md`, which follows the spec's screen section and this plan's contracts. Every lane ends with the founder able to tap through its screens on a phone-width preview.

### Lane 2 — Visit (screens 6, 7, 8). Depends on: 0.3, 1.4, 1.5.
- **Owns:** `src/app/visits/`, `src/components/visit/`, and new server actions in `src/lib/actions/visit.ts`. It rewrites, rather than reuses, `src/lib/actions/turnover.ts` callers, and deletes `/t/[id]`'s draft-editing paths only if nothing else uses them.
- **Start visit:** an explicit server action `startVisit(propertyId: string): Promise<{ visitId: string }>` creates the draft turnover and redirects to `visitPath(id)`. Nothing is created on GET.
- **Autosave:** each entry saves immediately, and the header shows "Saved hh:mm". Reloading restores the full draft (Review Focus 1).
- **Reading sheet:** As found / As left; rows start **unset** with the suggestion greyed; − / + or a tap on the value sets a row; "Log it" writes only set rows and writes the timestamp (`found_recorded_at` or `left_recorded_at`). Untouched rows are stored as null (Review Focus 2). As-found suggestions come from the last locked visit's found values; as-left suggestions come from this visit's found values.
- **Camera:** `capture="environment"` or a `getUserMedia` stream, never a gallery picker. Last visit's same-kind photo is shown to frame against. Photos map to: before → `phase before, slot full_frame`; after → `phase after, slot full_frame`; cover on → `phase after, slot cover`.
- **Work chips:** use `CLEANING_STEPS`. **Added:** use the existing `treatments` fields.
- **Finish & lock:** works with anything missing; the result is marked partial.
- **Acceptance:** the founder runs a full visit on his phone, reloads mid-way and loses nothing.

### Lane 3 — Tubs + one tub (screens 4, 5). Depends on: 0.3, 1.1, 1.2, 1.5.
- **Owns:** `src/app/tubs/` (list, `new`, `[id]`), `src/components/tub/`, and `src/lib/tub-history.ts`.
- **Produces, for Lane 5:**
  - `lastStepDate(visits, code: CleaningStepCode): Date | null`;
  - `foundStreak(visits, field: ReadingField): number` (consecutive visits out of range);
  - `daysSince(d: Date | null, now: Date): number | null`.
- **Tubs list:** grouped by client, with an amber dot when something is due or the last found reading was out of range. **Add tub** asks for name, client (pick or create), address and volume.
- **One tub:** the brief tiles (with defaults from `CARE_DEFAULTS` when the interval is null), then the log timeline. An open draft shows as entries plus **Continue visit**; otherwise the button is **Start visit** (`startVisit` from Lane 2). If Lane 2 hasn't merged yet, Lane 3 calls a stub with the same signature, defined in Lane 0's shell PR or its own.
- **Cleanup:** delete `/p/[id]` once `/tubs/[id]` covers it, and update any links to it.
- **Test:** `no visits` (Review Focus 5).

### Lane 4 — Record + Reports (screens 9, 10). Depends on: 0.3, 1.3, 1.4.
- **Owns:** `src/app/records/`, `src/app/proof/[token]/` (restyle), `src/app/reports/`, `src/components/record/`.
- **Record component:** one shared `RecordView({ visit, audience: "operator" | "owner" })`. The owner view is white and printable. The water table shows found (time) / left (time) / target with an in-range tick on left. Unticked work shows as "— Not drained". Copy follows D23, and the footer wording comes from the spec.
- **Sent:** a record counts as sent once its share link exists (`turnover.share_token` is not null); the sent time is when the token was first created. If no timestamp exists for that, show the lock time.
- **Opens:** `/proof/[token]` calls `record_share_view(token)` once per page load. Reports' Sent list shows Opened when any `share_view` row exists.
- **Operator view:** **Send to owner** uses the device share sheet with the link. **Copy link** copies it.
- **History report:** a page built from records for one tub over "last 6 visits" or "this season". No PDF yet.
- **Cleanup:** delete `/t/[id]` once `/records/[id]` and `/visits/[id]` cover it.

### Lane 5 — Home + Calendar (screens 2, 3). Depends on: 0.3, 1.2, Lane 3's `tub-history.ts`.
- **Owns:** `src/app/page.tsx` (Home), `src/app/calendar/`, and `src/lib/care-due.ts`.
- **`care-due.ts`:** `careDue(tub, visits, now: Date): DueItem[]` where `DueItem = { tubId; kind: "drain" | "filter" | "visit"; dueOn: Date; label: string }`.
  - drain = last `drained_refilled` + (`drain_interval_days` ?? 90);
  - filter = last `filter_replaced` + (`filter_interval_days` ?? 60);
  - visit = last visit + median gap of the last ≥3 gaps (omitted with fewer).
- **Home:** the 7-day strip (blue dot = visit logged, amber = care due), Needs attention (due ≤ 7 days or `foundStreak ≥ 2`, worst first), and This week counts (visits logged, records sent, records opened).
- **Calendar:** Day / Week / Month showing visits logged plus care due only (D28). No booking or guest times anywhere.
- **Tests:** `careDue` unit tests for each kind, the default intervals, `no visits` → `[]` (Review Focus 5), and fewer than 3 visits → no `visit` item.

---

## Execution order

```
Lane 0: 0.1 → 0.2 → 0.3 → 0.4
Lane 1: 1.5 → 1.1 → 1.2 → 1.3 → 1.4 → 1.6        (parallel with Lane 0)
Lane 2: after 0.3 + 1.4 + 1.5
Lane 3: after 0.3 + 1.1 + 1.2 + 1.5               (parallel with 2 and 4)
Lane 4: after 0.3 + 1.3 + 1.4                     (parallel with 2 and 3)
Lane 5: after Lane 3 merges tub-history.ts
```
