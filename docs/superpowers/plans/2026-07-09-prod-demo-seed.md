# Prod demo seed (#169) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tracktub.com a live, populated demo the founder drives — seed a realistic operator workspace into **prod** under the founder's own account for marketing content and prospect walkthroughs.

**Architecture:** Extract shared seed logic from `seed-demo.mjs` into `seed-lib.mjs` (properties, turnovers, photos, chemistry, equipment, supplies, maintenance). Keep `seed-demo.mjs` as the local-only entry point (localhost guard unchanged). Add `seed-prod.mjs` with explicit `--prod-i-mean-it` + `CONFIRM_PROD=yes` guards; look up the founder's existing org via membership; seed via service-role (founder uses Google OAuth, not password auth). The actual prod run is a one-time founder-supervised ops step — never commit keys.

**Tech Stack:** Node ESM scripts, Supabase JS admin client, existing landing proof photos in `public/landing/`.

**Testing note:** No schema change. Quality gate: `npm run lint && npm run typecheck && npm run build`. Local regression: `tt-demo reset` still seeds cleanly. Prod verification is manual on tracktub.com after the one-time run.

## Global Constraints

- **DATA only** — no migrations, no shared-object changes.
- **Never commit** prod service-role keys or generated staff passwords.
- **Founder org** — seed into `ethan@nhs-llc.com`'s existing operator org; do NOT create a throwaway demo-host.
- **Safety guards** — prod script refuses localhost; local script refuses remote URLs.
- **Branch** — work on feature branch `fjsg7mskqr-crypto/prod-demo-seed`; PR to `main`.

---

## File structure

- Create `apps/web/scripts/seed-lib.mjs` — shared seed scenario (properties, turnovers, ops data).
- Modify `apps/web/scripts/seed-demo.mjs` — thin local wrapper importing `seed-lib.mjs`.
- Create `apps/web/scripts/seed-prod.mjs` — prod entry with safety flags + founder lookup.

---

## Task 1: Extract shared seed logic

**Files:**
- Create: `apps/web/scripts/seed-lib.mjs`
- Modify: `apps/web/scripts/seed-demo.mjs`

- [x] **Step 1:** Move `makeTurnover`, `histTurnover`, photo upload, property/equipment/supply/turnover scenarios into `seed-lib.mjs`; export `seedWorkspace()`.
- [x] **Step 2:** Slim `seed-demo.mjs` to local auth + org lookup + call `seedWorkspace({ propertyCount: 3, includeMaintenance: false })`.
- [x] **Step 3:** Add treatments/temp_f/balanced to water readings; optional `photos: true` on historical turnovers for marketing realism.
- [x] **Step 4:** `npm run lint` — PASS.

---

## Task 2: Prod seeder script

**Files:**
- Create: `apps/web/scripts/seed-prod.mjs`

- [x] **Step 1:** Require `--prod-i-mean-it` and `CONFIRM_PROD=yes`; refuse localhost URLs.
- [x] **Step 2:** Look up founder by `FOUNDER_EMAIL` (default `ethan@nhs-llc.com`); resolve org via `membership` (operator/owner).
- [x] **Step 3:** Skip if properties already exist (unless `--force`); create staff user `maria-cleaner@tracktub.live` for Team page population.
- [x] **Step 4:** Call `seedWorkspace({ operatorClient: admin, propertyCount: 4, includeMaintenance: true })` — 4 properties, maintenance due/overdue states, cleaner turnover with `notify_turnover_ready`.
- [x] **Step 5:** Print verification checklist + staff credentials (ephemeral password).

---

## Task 3: Quality gate + local regression

- [ ] **Step 1:** Run `cd apps/web && npm run lint && npm run typecheck && npm run build` — all PASS.
- [ ] **Step 2:** Run `tt-demo reset` (or `node scripts/seed-demo.mjs --force` against local stack) — seed completes; host login shows 3 properties + chemistry story unchanged.
- [ ] **Step 3:** Commit on feature branch.

```bash
git add apps/web/scripts/seed-lib.mjs apps/web/scripts/seed-demo.mjs apps/web/scripts/seed-prod.mjs docs/superpowers/plans/2026-07-09-prod-demo-seed.md
git commit -m "feat(demo): prod seed script for founder workspace (#169)"
```

---

## Task 4: PR + one-time prod run (founder-supervised)

- [ ] **Step 1:** Push branch and open PR to `main`.

```bash
git push -u origin fjsg7mskqr-crypto/prod-demo-seed
gh pr create --base main --title "feat(demo): prod seed script for founder workspace (#169)" --body "$(cat <<'EOF'
## Summary
- Extracts shared demo seed logic into `seed-lib.mjs` (local + prod reuse).
- Adds `seed-prod.mjs` with explicit prod safety guards for one-time seeding of the founder org on tracktub.com.
- Extends seed data: treatments/balanced chemistry, historical photo sets, 4th property, maintenance due/overdue (prod path).

Closes #169 (script side). The actual prod seed run remains a founder-supervised ops step.

## Test plan
- [ ] CI green (lint · typecheck · build)
- [ ] `tt-demo reset` — local seed still works
- [ ] After merge: founder runs prod seed with service-role key (not in CI)
- [ ] Verify tracktub.com: Dashboard, /chemistry, /operations/*, Team, proof link in incognito

EOF
)"
```

- [ ] **Step 2:** Merge once CI green.

- [ ] **Step 3:** Founder runs prod seed (one-time, keys at runtime):

```bash
cd apps/web
SUPABASE_URL=https://slkxwpiiludisrnwnxlg.supabase.co \
SERVICE_ROLE_KEY='<founder-provided>' \
ANON_KEY='<founder-provided>' \
CONFIRM_PROD=yes \
node scripts/seed-prod.mjs --prod-i-mean-it
```

- [ ] **Step 4:** Verify on tracktub.com as founder:
  - Dashboard shows 4 properties with varied chemistry badges
  - `/chemistry` — 2 need attention (Lakeview + Pine)
  - Property page — before/after photos + chemistry/treatments
  - Share proof link → open incognito → recorded open
  - `/operations/maintenance` — due/overdue tasks
  - `/team` — Maria (staff) listed
  - Unread turnover-ready notification

---

## Self-review notes

- **Spec coverage:** prod guard ✓, founder org (not demo-host) ✓, staff member ✓, 4 properties ✓, historical photos ✓, chemistry + treatments ✓, proof opens ✓, maintenance due/overdue ✓, notification ✓, no schema change ✓.
- **Safety:** local script still refuses remote; prod script refuses localhost + requires double confirmation.
- **Idempotency:** both scripts skip when properties exist; prod `--force` documented as additive-only caution.
