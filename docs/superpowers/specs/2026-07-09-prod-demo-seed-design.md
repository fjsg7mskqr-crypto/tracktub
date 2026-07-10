# Prod demo seed — populate ethan@nhs-llc.com for live demos

**Date:** 2026-07-09
**Goal:** Bring the founder's live tracktub.com account (`ethan@nhs-llc.com`) to a full, believable, demo-ready state so he can log in and walk a prospect through every screen — and self-assess what still needs work.
**Related:** #169 (live demo on prod). Builds on the existing local seeder `apps/web/scripts/seed-demo.mjs`.

## Context (verified on prod 2026-07-09)
- User `ethan@nhs-llc.com` = `f364b4c4-53bd-4909-bd83-1fd8fc15a666`; one **operator** org `03723831-badd-44c1-9435-a84e838ff148`.
- That org is **completely empty** (0 properties/turnovers/everything). So this is a clean insert — **no real customer data to preserve or risk.**
- Prod project ref `slkxwpiiludisrnwnxlg`; URL `https://slkxwpiiludisrnwnxlg.supabase.co`.
- Login on prod is **Google OAuth only** — so the seed cannot password-sign-in *as Ethan*. All of Ethan's data must be written via the **service-role admin client** with `submitter_id` / created-by set explicitly to his user id.

## Non-goals / YAGNI
- **No schema change.** Data inserts + storage uploads only.
- **No new login path.** Ethan already reaches the app (he's on `ADMIN_EMAILS`).
- **No deletion / no destructive ops.** Insert-only; idempotent skip if the org already has properties (unless `--force`).
- Not a general multi-tenant seeder — it targets one confirmed org id.

## What already exists (reuse from `seed-demo.mjs`)
The local seeder already produces, for a demo org: renamed org ("Cascade Stays"), 3 properties, per-property **equipment** (one out-of-warranty heater), an **org_note**, per-property **supplies** (low-stock mix), **live turnovers** (before + 4 after photos, water readings, issue tags, shared proof links + recipient opens, ready-notify), **backdated historical turnovers** for multi-point chemistry trends, and a **staff cleaner** ("Maria") with a property assignment. Keep all of this.

## What's missing and must be added
1. **Target an existing OAuth user's org instead of a created host.** The local script creates `demo-host@tracktub.test` and seeds *its* org. The prod script must instead:
   - Take the target org + user from env (`CONFIRM_ORG_ID`, `TARGET_USER_ID`), look up / verify the operator membership, and seed into it.
   - Write everything attributable to Ethan via the **admin (service-role) client** (no host password sign-in). Follow the existing `histTurnover` pattern (admin insert, explicit `submitter_id` / `submitted_at_server`, insert already-`submitted_locked` in one shot to avoid the lock-guard trigger).
   - The demo **cleaner** ("Maria") is still a *created* user (`demo-cleaner@tracktub.test`, generated password) added as `staff` to Ethan's org with a `staff_assignment`, so the Team page shows a teammate and one turnover is staff-captured.
   - Photo uploads go through the admin client into the `photos` bucket at `${orgId}/${turnoverId}/${slot}` (same paths as today).
2. **Maintenance tasks + logs** (feature #150 — currently unseeded). Per property, add `maintenance_task` rows spanning both recurrence kinds and a spread of statuses, plus `maintenance_log` history so `last_done_at` is set and the Schedule's rules section + calendar show a realistic ok/due/overdue mix. Include at least **one overdue** task (part of the deliberate attention story).
   - Columns: `property_id`, `title`, `recurrence_kind` (`time`|`turnover`), `recurrence_value` (int), `recurrence_unit` (`day`|`week`|`month`|null for turnover), `last_done_at` (ISO|null), `notes`, `archived_at` (null).
   - Example set per tub: "Shock treatment" (time, 7 day), "Filter deep clean" (turnover, every 15), "Drain & refill" (time, 90 day). Vary `last_done_at` so one is overdue, one due-soon, one ok.
   - `maintenance_log`: `task_id`, `property_id`, `done_by` (Ethan), `note`.
3. **Scheduled items** (feature #157/#158 — currently unseeded) so the new **Schedule calendar** is populated in week and month views. Insert `scheduled_item` rows across the current + next two weeks:
   - Columns: `property_id`, `org_id`, `kind` (`turnover`|`maintenance`|`custom`), `title`, `scheduled_for` (date, `YYYY-MM-DD`), `assignee_user_id` (Ethan or Maria or null), `status` (`scheduled`|`done`|`skipped`), `source` (`manual`), `maintenance_task_id` (null unless linking), `notes`.
   - Mix: several upcoming **scheduled turnovers** (assign a couple to Maria), one or two **custom** tasks ("Replace filter cartridge", "Cover inspection"), a couple already **done** in the past week (green on the calendar), spread across the 4 tubs and across days so both week and month views look alive. Include today + near-future so "Upcoming work" timeline is non-empty.
4. **Fourth property** — bump to **4 tubs** (add "Summit Chalet") per the approved design, with its own equipment/supplies/turnover history so the portfolio reads as a real small operation.

## Safety model (replaces the localhost guard)
The local script hard-refuses any non-local URL. The prod script instead:
- Requires an explicit **`--prod`** flag AND a **`CONFIRM_ORG_ID`** env that must equal the org it resolves for `TARGET_USER_ID`; abort with a clear message otherwise.
- **Insert-only.** No `delete`/`truncate`. Idempotency guard: if the target org already has ≥1 property, print "already seeded — use --force" and exit 0 (so an accidental re-run is a no-op).
- Prints a summary of exactly what it created.

## How it runs (division of labor)
- **Build agent:** writes `apps/web/scripts/seed-demo-prod.mjs` (derived from `seed-demo.mjs`), keeps `seed-demo.mjs` untouched. **Verifies against the LOCAL stack** by creating a local operator user, passing its id/org as `TARGET_USER_ID`/`CONFIRM_ORG_ID`, running with `--prod` pointed at the local URL, and confirming: all inserts succeed; Operations → Maintenance/Schedule/Equipment/Supplies and the Dashboard render populated with the attention states; a re-run no-ops. Lint/typecheck/build stay green. PR to `main`, self-merge on green.
- **Founder (one time, ~2 min, key never shared):** from `apps/web`, run the single command with the prod service-role key (grabbed from the Supabase dashboard), e.g.
  ```
  SUPABASE_URL=https://slkxwpiiludisrnwnxlg.supabase.co \
  SERVICE_ROLE_KEY=<prod service_role key> \
  ANON_KEY=<prod anon key> \
  TARGET_USER_ID=f364b4c4-53bd-4909-bd83-1fd8fc15a666 \
  CONFIRM_ORG_ID=03723831-badd-44c1-9435-a84e838ff148 \
  node scripts/seed-demo-prod.mjs --prod
  ```
  Run via the `!` prefix in-session so the output is visible but the key stays on his machine.
- **Manager (me):** after the founder runs it, verify tracktub.com renders full across Dashboard, Operations (all four tabs), Schedule calendar, a proof link, and Team; report anything thin.

## The deliberate "attention" story (so the demo isn't all-green)
- **Lakeview Cabin 4:** cloudy + low sanitizer now (urgent), 2 turnovers inside 48h → shock-due.
- **Pine Chalet:** single low-sanitizer dip.
- **Ridgeline A-Frame:** healthy contrast, multi-point trend, heater **out of warranty**, one supply **low**.
- **Summit Chalet:** one **overdue maintenance** task; a low-stock supply.
- Upcoming scheduled turnovers + custom tasks on the calendar, a couple assigned to Maria.

## Success criteria
Founder logs into tracktub.com as `ethan@nhs-llc.com` and every surface is populated and believable: Dashboard shows a 4-tub cockpit with mixed ready/attention states; Operations tabs (Maintenance/Schedule, Water & Chemistry, Supplies, Equipment) all non-empty; the Schedule calendar shows work in week + month + an Upcoming list; a turnover's proof link opens with photos; Team shows Ethan + Maria. Re-running the seed is a safe no-op.
