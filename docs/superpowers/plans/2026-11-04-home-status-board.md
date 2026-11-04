# Home status board — implementation plan

Spec: `docs/superpowers/specs/2026-11-04-home-status-board-design.md` (founder approved 2026-11-04).
Goal: Home shows today's route with a Working on / Up next focus card, a worst-first status board
with care rings, and open items left at one visit and settled at the next.

## Task 1 — Schema (additive, reserved timestamps)
- `20261104120000_task_open_items.sql`: nullable `kind`, `note`, `opened_visit_id`,
  `settled_visit_id`, `settled_at`, `created_by` on `task`; partial index on open items.
  Existing `task_select` (app_can_see_property) / `task_write` (app_can_capture_property) are
  enough: team logins read + write, other orgs and anon get nothing. No policy changes.
- `20261104120100_route_stop.sql`: `route_stop(org_id, property_id, day, created_by, created_at)`,
  unique per tub per day, RLS = `app_can_capture_property` for read and write, org_id must match
  the property's org.
- `supabase migration up --local`, regenerate `src/lib/supabase/types.ts`.
- RLS tests in `tests/rls.test.ts`: team member reads/writes both; other org can't; anon can't;
  spoofed org_id refused.

## Task 2 — Pure models (TDD, `tests/home/*.test.ts`)
`src/components/home/open-items.ts`
- kinds + labels, `bringList(openItems, lastReading)`, `recheckSuggestions(left, openItems)`.

`src/components/home/home-model.ts`
- `tubProblem` / `tubBoardState` (problem → open → due → calm), `boardOrder`.
- `ringState(tub, visits, now)` — next drain, blue / amber ≤ `DUE_SOON_DAYS` / red overdue.
- `todaysRoute(...)` — membership (visited today, draft open, care due today or overdue,
  hand-added) and order (done by time → in progress → problem → overdue → due → added).
- `focusCard(route)` — Working on (most recent draft) vs Up next (first not-done) vs hidden.
- `visitProgress(draft)` — Before photo · Readings · Work · After (after + cover).

## Task 3 — Data + actions
- `src/components/home/load.ts`: open items, today's route stops, draft progress rows; all in
  Home's single `Promise.all` alongside `loadCareData` (extended with as-left, owner flag,
  share/open state) and the profile.
- `src/lib/actions/home.ts`: `addToToday`, `removeFromToday`, `settleOpenItem`,
  `dismissOpenItem` (server actions, `refresh()`).
- Visit: `loadVisitSnapshot` gains `openItems` (read in parallel with the previous visit);
  `leaveOpenItem`, `settleVisitItem`, `reopenVisitItem`, `dismissVisitItem` actions.

## Task 4 — UI
- Home page rebuilt: greeting, summary row, `RouteCard` (client; stop taps switch the focus
  card, Start / Resume), status board tiles with `CareRing`, open-item checkboxes, Add to today.
- `(home)/loading.tsx` matches the new layout. Page stays dynamic.
- Visit screen: "Left open last time" at the top (settle / undo), "Leave for next time" chips +
  note, one-tap "Re-check <reading>" suggestion when the as-left reading is out of range. Never
  blocks Finish.
- Rewrite `tests/calendar/home-page.test.tsx` for the new screen; extend visit-screen tests.

## Task 5 — Demo data
`scripts/seed-demo.mjs` gains an idempotent "home board" step (runs even when the workspace is
already seeded): drain/filter history so rings show, a problem tub, open items incl. Filters
soaking, a hand-added stop for today, a draft visit in progress, calm tubs.

## Task 6 — Proof
lint · typecheck · build · vitest · local rls; 390 px screenshots (Up next, Working on); exercise
leave → Home → settle on the next visit. PR to `main`, not merged.
