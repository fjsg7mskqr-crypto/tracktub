# Lane 5 — Home + Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build screen 2 (Home) and screen 3 (Calendar of tub care) on top of the merged Lane 0–4 modules.

**Architecture:** One pure projection module (`src/lib/care-due.ts`) answers "what care is due, when" per tub from its locked visits, reusing Lane 3's `careFor` / `lastStepDate`. One pure day model (`src/components/calendar/days.ts`) buckets visits and due items into calendar days in `APP_TIME_ZONE` (servers run UTC). Both pages are server components that load rows once (`src/components/calendar/load.ts`), call the pure functions, and render. Calendar view/date live in the URL (`/calendar?view=week&d=2026-10-26`), so every switch is a plain link and the route stays dynamic.

**Tech Stack:** Next.js App Router (server components), React 19, TypeScript strict, Supabase (RLS-scoped reads), Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-27-app-rebuild-design.md` §2–3; parent plan `docs/superpowers/plans/2026-10-27-app-rebuild.md` (Lane 5); vault D28. Mockup screens `Home.dc.html`, `Today.dc.html` (the Calendar).

## Global Constraints

- PR flow: worktree → PR to `main` → `web (lint · typecheck · build)` + `rls` green → `gh pr merge --squash`. Never push to `main`/`test`/`prod`; never promote.
- Never touch `supabase/migrations/`, `src/lib/supabase/types.ts`, AppShell, TabBar or `app-tokens.css`.
- D23 copy: never "verified", "tamper-proof", "dispute-grade", "immutable". Green (`--tt-ok`) only for success/locked/in-range.
- D28: Calendar shows visits logged + care due **only**. No bookings, guest times, assigning or dispatch. Due dates are suggestions ("every ~90 days", footnote "Due dates come from your own history — how often you drain, change filters and visit each tub.").
- Care defaults: drain 90 days, filter 60 (`CARE_DEFAULTS`); per-tub `drain_interval_days` / `filter_interval_days` override.
- Every displayed date/time goes through `src/lib/time.ts` (`formatTime`, `APP_TIME_ZONE`); day bucketing uses the same zone.
- Signed-in pages stay dynamic (they call `getCurrentMembership()`); never prerender them.
- Tap targets ≥ 44px. Weeks start Monday.

## Decisions this plan makes

- **Visits logged** = `turnover.status = 'submitted_locked'` (partial visits are locked too), dated by `submitted_at_server`. A visit "sent" (Today line, Calendar item) = `share_token` not null.
- **This week** = Monday–Sunday containing today (app zone). *Records sent* = distinct turnovers with a `share_copied` `proof_event` this week (same source as Reports); *opened by owners* = distinct turnovers with a `share_view` this week.
- **Visit cadence:** gaps between consecutive locked visits, ignoring same-day gaps (< 1 day); median of the last 5 gaps; needs ≥ 3 visits and ≥ 2 usable gaps, else no `visit` item. `dueOn` = last visit + round(median) days.
- **Overdue care** shows on today (with "overdue Nd") rather than on a past day, so it is never hidden in a past week.
- **Home strip** = today + next 6 days. Needs attention = due item with `inDays ≤ 7` (`DUE_SOON_DAYS`) or `foundStreak ≥ 2` on any field; worst first by severity (`inDays`, or `-streak` for drift); amber dot when due now/overdue or drifting, grey when upcoming.
- **Start visit on Home:** each amber Needs-attention row carries a compact **Start** button (Lane 2 `startVisit`), or **Continue** (link to the open draft) when one exists.

## Review Focus

1. **Brand-new account (no tubs):** Home says "No tubs yet" with Add tub; Calendar shows "Nothing due" days — no crash. Test in Tasks 2 and 3.
2. **Tub with no visits:** `careDue` → `[]`; Home/Calendar show nothing for it, never NaN/"Invalid Date". Tests in Tasks 1–3.
3. **Visit logged at 11 pm Detroit (next day UTC):** lands on the Detroit day. Test in Task 1 (`dayKey`).
4. **Overdue drain (last drain 120 days ago):** appears today as overdue, in attention list first. Tests in Tasks 1 and 2.
5. **Banned words:** Home and Calendar render with data and none of the D23 words appear. Tests in Tasks 2 and 3.

---

### Task 1: `careDue` + day model (PR 1, with this plan)

**Files:**
- Create: `apps/web/src/lib/care-due.ts`, `apps/web/src/components/calendar/days.ts`
- Test: `apps/web/tests/calendar/care-due.test.ts`, `apps/web/tests/calendar/days.test.ts`

**Interfaces:**
- Consumes: `careFor`, `careInterval`, `TubCareInput` (`@/components/tub/tub-status`); `HistoryVisit` (`@/lib/tub-history`).
- Produces:
  - `type DueKind = "drain" | "filter" | "visit"`
  - `type DueItem = { tubId: string; kind: DueKind; dueOn: Date; everyDays: number; label: string }` — labels `"Drain & refill due"`, `"Filter change due"`, `"Usually visited by now"`.
  - `careDue(tub: TubCareInput & { id: string }, visits: readonly HistoryVisit[], now: Date): DueItem[]` sorted by `dueOn`.
  - `visitCadenceDays(visits): number | null`.
  - `dayKey(d: Date, tz?): string` ("YYYY-MM-DD" in zone); `addDays(key, n): string`; `weekStart(key): string` (Monday); `monthGrid(key): (string | null)[]` (Monday-led, padded to whole weeks); `dayParts(key): { dow: string; num: number; month: string }`.

- [ ] Tests: drain due = last drain + 90 by default and + `drainIntervalDays` when set; filter likewise with 60; `no visits → []`; 2 visits → no `visit` item; visits every 4 days → `visit` item due last + 4 with `everyDays` 4; same-day revisits ignored; `dayKey(new Date("2026-10-27T03:30:00Z"))` = `"2026-10-26"`; `weekStart("2026-10-28")` = `"2026-10-26"`; `monthGrid("2026-10-15")` starts with 3 nulls, length 35.
- [ ] Run `npx vitest run tests/calendar` → FAIL; implement; → PASS.
- [ ] Commit; PR "Lane 5: plan + careDue projection".

### Task 2: Home (PR 2)

**Files:**
- Create: `apps/web/src/components/calendar/load.ts`, `apps/web/src/components/calendar/home-model.ts`, `apps/web/src/components/calendar/HomeStartVisit.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Test: `apps/web/tests/calendar/home-model.test.ts`, `apps/web/tests/calendar/home-page.test.tsx`

**Interfaces:**
- Produces: `loadCareData(supabase): Promise<{ tubs: CareTub[]; visits: LoggedVisit[]; drafts: Map<string, string> }>` where `LoggedVisit = HistoryVisit & { id; tubId; sent: boolean }`; `dueByDay(tubs, visits, now) → Map<dayKey, CalItem[]>` and `CalItem = { kind: "logged" | "due"; tubId; tubName; href; what; overdue?: boolean }` (shared with Task 3); `attentionList(tubs, visits, now): AttentionItem[]`.
- Page: greeting `Morning|Afternoon|Evening, <first name>` + date; Today strip card (link to `/calendar`) with dots and per-tub lines ("Logged 9:52 AM · sent", "Drain due"); Needs attention (or "Nothing due this week."); This week tiles (visits logged, records sent, opened by owners → `/reports`). No tubs → "No tubs yet." + Add tub.
- [ ] Tests (fake Supabase, as in `tests/record/reports-page.test.tsx`): new account → "No tubs yet"; tub with no visits → no NaN/Invalid Date; overdue drain first in attention with Start button; banned words absent.
- [ ] Commit; PR "Lane 5: Home".

### Task 3: Calendar (PR 3)

**Files:**
- Create: `apps/web/src/components/calendar/calendar-model.ts`
- Modify: `apps/web/src/app/calendar/page.tsx`
- Test: `apps/web/tests/calendar/calendar-page.test.tsx`

- `/calendar?view=day|week|month&d=YYYY-MM-DD` (default week, today). Segmented Day/Week/Month links, prev/next links, legend, count label ("4 due · 1 logged"), list rows ("Nothing due"), month grid with dots linking to that day, suggestion footnote. Logged items → `recordPath`; due items → `tubPath`.
- [ ] Tests: default week renders 7 rows Monday-first; logged item links to `/records/<id>`; due item text "(every ~90 days)"; month view shows footnote; invalid `d` falls back to today; no tubs → 7 × "Nothing due"; no booking/guest words; banned words absent.
- [ ] Check 390px layout in headless Chrome against the mockup.
- [ ] Commit; PR "Lane 5: Calendar".
