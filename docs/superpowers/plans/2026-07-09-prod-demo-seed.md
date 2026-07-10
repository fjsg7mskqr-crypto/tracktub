# Prod Demo Seed — Build Brief (#169)

> **For the Cursor build agent.** Work on branch `worktree-demo-seed-prod`. Deliver `apps/web/scripts/seed-demo-prod.mjs`, verify it against the LOCAL Supabase stack, open a PR to `main`, self-merge on green. The founder runs the final command against prod himself. Spec: `docs/superpowers/specs/2026-07-09-prod-demo-seed-design.md`.

**Goal:** A prod-safe seeder that fills the founder's *existing* live account (`ethan@nhs-llc.com`, org `03723831-badd-44c1-9435-a84e838ff148`, user `f364b4c4-53bd-4909-bd83-1fd8fc15a666`) with a believable 4-tub operation across every feature — including the newer Maintenance, Schedule, Equipment, and Supplies — so he can log into tracktub.com and demo it.

## Global constraints
- **No schema change.** Data inserts + storage uploads only.
- **Insert-only, idempotent.** No delete/truncate. If the target org already has ≥1 property and `--force` is absent, print "already seeded — use --force" and `exit 0`.
- **Do NOT modify `apps/web/scripts/seed-demo.mjs`** — create a new sibling `seed-demo-prod.mjs`. Reuse its structure/logic by copying, not by editing the original.
- Strict: `npm run lint && npm run typecheck && npm run build` stay green (the script is `.mjs`, not typechecked, but don't break anything else).
- All of Ethan's data is written via the **admin (service-role) client** with explicit ids (he can't password-sign-in — Google OAuth only on prod). Only the created **cleaner** ("Maria") uses a password sign-in, and only if you need the RLS capturer path; otherwise write her turnover via admin too.

---

## Task 1: Scaffold `seed-demo-prod.mjs` with the prod-safety guard

**File:** create `apps/web/scripts/seed-demo-prod.mjs`

Start from a copy of `seed-demo.mjs`. Replace the env + guard block (lines ~17–40 of the original) with:

- Read env: `SUPABASE_URL`, `SERVICE_ROLE_KEY`, `ANON_KEY`, `TARGET_USER_ID`, `CONFIRM_ORG_ID`. Require all five; exit 1 with a clear message if any missing.
- Require the `--prod` flag in `process.argv`; if absent, print "Refusing to run without --prod (this writes to a real project)." and exit 1.
- **Remove** the `127.0.0.1|localhost` refusal (this script is *for* remote), but keep a `--force` flag.
- Resolve the target org: query `membership` for `user_id = TARGET_USER_ID AND role = 'operator'`. Assert exactly one row and that its `org_id === CONFIRM_ORG_ID`; abort with a clear message on mismatch. Use this as `orgId` and `host = { id: TARGET_USER_ID }` throughout (there is no host password sign-in).
- Keep the created **cleaner**: `demo-cleaner@tracktub.test` with a generated password (reuse the `DEMO_PASSWORD` env pattern, or generate one locally with `crypto.randomUUID()` and print it).

**Verify:** `node scripts/seed-demo-prod.mjs` (no flags) exits 1 with the guard message; with `--prod` but missing env, exits 1. Commit.

```bash
git add apps/web/scripts/seed-demo-prod.mjs
git commit -m "feat(demo): scaffold prod demo seeder with safety guard (#169)"
```

---

## Task 2: Port the existing seed content to the admin path, targeting Ethan's org

Adapt the body of `main()` so **every write that was done as the host (`hc`) is instead done via the `admin` client** with explicit ids, since we cannot sign in as Ethan:

- `org` rename → `admin.from("org").update({ name: "Cascade Stays" }).eq("id", orgId)`.
- Idempotency check via `admin` (count properties in `orgId`).
- **4 properties** (add "Summit Chalet, Big Bear, CA" to the existing 3), inserted via `admin` with `org_id: orgId`.
- Equipment, `org_note`, supplies: same data as `seed-demo.mjs` but via `admin`, extended to include Summit Chalet (give it a low-stock supply). Keep Ridgeline's out-of-warranty heater.
- Turnovers: rewrite `makeTurnover` to a single **admin-path** insert that sets `submitter_id`, `submitted_at_server`, and inserts the row already `submitted_locked` (follow the existing `histTurnover` pattern — never UPDATE a locked row). Upload the before + 4 after photos via `admin.storage.from("photos")` to `${orgId}/${turnoverId}/${slot}` and insert `photo` rows. Keep `issue_tag`, `water_reading` (with explicit `recorded_at`), `proof_event` (share), and `record_proof_open` / `notify_turnover_ready` RPC calls (these RPCs run fine under service role; if any errors under admin, wrap in try/catch and continue — the demo data matters more than the notification).
- Keep the historical backdated turnovers for multi-point trends; add a few for Summit Chalet.
- Cleaner "Maria": create user, add `membership` (staff) + `staff_assignment` to Ethan's org, and attribute one turnover to her (`submitter_id: cleaner.id`).

**Verify against the LOCAL stack** (this is the real test): `supabase start`, create a throwaway local operator user + capture its `id` and operator `org_id`, then run:
```
SUPABASE_URL=<local url> SERVICE_ROLE_KEY=<local service> ANON_KEY=<local anon> \
TARGET_USER_ID=<local user id> CONFIRM_ORG_ID=<local org id> \
node scripts/seed-demo-prod.mjs --prod
```
Confirm all inserts succeed and the app (`npm run dev`) shows a populated 4-tub Dashboard + proof photos for that user. Commit.

```bash
git commit -am "feat(demo): port seed content to admin path + 4th property (#169)"
```

---

## Task 3: Add Maintenance tasks + logs (feature #150, currently unseeded)

Per property, insert `maintenance_task` rows and some `maintenance_log` history via `admin`. Columns: `property_id`, `title`, `recurrence_kind` (`time`|`turnover`), `recurrence_value` (int), `recurrence_unit` (`day`|`week`|`month`, or null for turnover kind), `last_done_at` (ISO or null), `notes`, `archived_at` (null).

Per-tub set (vary `last_done_at` so statuses differ):
- "Shock treatment" — `time`, value 7, unit `day`.
- "Filter deep clean" — `turnover`, value 15, unit null.
- "Drain & refill" — `time`, value 90, unit `day`.

Make the status spread deliberate: **Summit Chalet's "Shock treatment" is overdue** (`last_done_at` ~12 days ago), one tub due-soon, the rest ok. Insert 1–2 `maintenance_log` rows (`task_id`, `property_id`, `done_by: TARGET_USER_ID`, `note`) for tasks that have a `last_done_at`, so the completion history is real.

**Verify:** local run shows Operations → Maintenance/Schedule rules section populated, with Summit Chalet flagged overdue. Commit.

```bash
git commit -am "feat(demo): seed maintenance tasks + logs incl. an overdue (#169)"
```

---

## Task 4: Add Scheduled items so the Schedule calendar is populated (feature #157/#158)

Insert `scheduled_item` rows via `admin`. Columns: `property_id`, `org_id` (= orgId), `kind` (`turnover`|`maintenance`|`custom`), `title`, `scheduled_for` (date string `YYYY-MM-DD`), `assignee_user_id` (Ethan / Maria / null), `status` (`scheduled`|`done`|`skipped`), `source` (`manual`), `maintenance_task_id` (null), `turnover_id` (null), `notes` (optional).

Spread relative to **today** (compute dates from `new Date()`):
- 4–6 upcoming **scheduled turnovers** across the 4 tubs over the next ~14 days (assign two to Maria via her `user.id`).
- 2 **custom** tasks ("Replace filter cartridge" on one tub in ~3 days; "Cover inspection" on another next week).
- 2 **done** items dated in the past week (so the calendar shows completed/green states and the week view isn't empty).
- At least one item **today or tomorrow** so the "Upcoming work" timeline is non-empty.

**Verify:** local run → Operations → Schedule shows chips in the week view, items in the month view, and a non-empty Upcoming list; a done item renders green. Commit.

```bash
git commit -am "feat(demo): seed scheduled_item calendar work (turnovers/custom/done) (#169)"
```

---

## Task 5: Update the final summary + a short README note; PR

- Update the script's closing `console.log` summary to describe the full 4-tub dataset (properties, chemistry story, maintenance overdue, scheduled calendar work, equipment/supplies, Maria).
- Add a brief comment block at the top of `seed-demo-prod.mjs` documenting the required env vars + the exact prod run command from the spec (so the founder can copy it).
- Final gate: `npm run lint && npm run typecheck && npm run build` green; a **second local run no-ops** ("already seeded").
- PR:
```bash
git push -u origin worktree-demo-seed-prod
gh pr create --base main --title "feat(demo): prod demo seeder for live walkthroughs (#169)" \
  --body "Adds scripts/seed-demo-prod.mjs — fills an existing operator org (the founder's) with a believable 4-tub operation incl. maintenance, schedule, equipment, supplies. Verified against the local stack. Founder runs it once against prod with the service key. No schema change. Spec: docs/superpowers/specs/2026-07-09-prod-demo-seed-design.md"
```
Confirm CI (`web` + `rls`) green; self-merge. Reply "prod seeder done" with the PR link + confirmation the local verify populated all four Operations tabs.

## Notes for the agent
- The `photos` storage bucket and `photo`/`turnover`/`water_reading`/`issue_tag`/`proof_event`/`maintenance_task`/`maintenance_log`/`scheduled_item` table shapes are all in `apps/web/src/lib/supabase/types.ts` and the migrations under `apps/web/supabase/migrations/` — read them for exact column names/enums before inserting.
- Keep money-shot realism: use the four sample images in `apps/web/public/landing/` exactly as `seed-demo.mjs` does.
- If a service-role insert trips an audit trigger or RLS-adjacent constraint, read the relevant migration rather than working around it blindly — the existing `histTurnover` already proves the admin-insert-locked pattern works.
