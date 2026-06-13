# Chemistry view + demo seed (#123) — design

**Issue:** fjsg7mskqr-crypto/tracktub#123 (epic #113, demo-ready).
**Branch:** `fjsg7mskqr-crypto/g-chemistry-view-demo-seed-demo-113`.
**Date:** 2026-06-13.

## Goal

Make the chemistry layer a real, walkable part of the localhost demo:

1. A dedicated cross-property **Chemistry** screen showing water health across
   all of an operator's tubs at a glance, sorted so the tubs needing attention
   surface first.
2. Demo **seed data** so that screen — and the existing per-tub
   (`/p/[id]`) trends — look populated and tell a believable story.

**No schema change.** Everything reuses the existing `water_reading` table and
the chemistry primitives shipped with epic #95 (#99/#100).

## Context — what already exists (reuse, don't reinvent)

- `src/lib/chemistry.ts` — `CHEM_THRESHOLDS`, `phOutOfRange`, `sanitizerLow`,
  `sanitizerOutOfRange`, `tempOutOfRange`, `readingHasFlag`, `readingHasValues`.
- `src/lib/chemistry-rules.ts` — `batherLoadActive(turnovers, nowMs)`,
  `clarityFlag(t)` → `{reason, message, action}`, `BATHER_LOAD_RULE`,
  `TurnoverChem`.
- `src/components/ChemistryTrend.tsx` — `readings: TrendReading[]`
  (`{recorded_at, ph, sanitizer_ppm, temp_f}`, newest-first); renders 3
  sparklines (pH/sanitizer/temp) with out-of-range bands + an 8-row recent
  table. Already on `/p/[id]`.
- `src/components/ChemistryAlerts.tsx` — `{batherLoad, flags}`; renders the
  bather-load reminder + clarity flags, each with a recommended action.
- `src/components/Sparkline.tsx`, `WaterReadingCard.tsx`, `ui` typed components.
- Data: `water_reading` (`ph`, `sanitizer_ppm`, `temp_f`, `recorded_at`,
  `property_id`, `turnover_id` **UNIQUE**) — migration
  `20260612140000_water_reading.sql`. One reading per turnover.
- `app/page.tsx` (dashboard) already computes `batherLoad` / `chemFlag` per
  property from `water_reading(sanitizer_ppm)` + `submitted_at_server`, and
  shows "Shock due" / "Low sanitizer" badges.

**Today's gap:** `seed-demo.mjs` inserts **zero `water_reading` rows**, so the
entire chemistry layer (trend, badges, alerts) is invisible in the demo. This
issue closes that gap.

## Part 1 — the Chemistry screen

### Route & access

- New `src/app/chemistry/page.tsx` — server component, mirrors `app/page.tsx`:
  - `getCurrentMembership()`; `!membership` → `redirect("/login")`.
  - `membership.role === "staff"` → `redirect("/")` (staff have no dashboard
    nav; this screen is operator/owner only).
  - Operators and owners render the screen.

### Data fetch (mirror the dashboard query, with full readings)

```ts
supabase.from("property").select(`
  id, name, address,
  turnover(
    id, submitted_at_server, status, urgent,
    issue_tag(tag, confirmed_at),
    water_reading(ph, sanitizer_ppm, temp_f, recorded_at)
  )
`).order("created_at")
```

Per property, from its `submitted_locked` turnovers (newest-first):

- `chem: TurnoverChem[]` — `{at: submitted_at_server, sanitizerPpm, cloudy}`
  (identical mapping to `app/page.tsx`).
- `batherLoad = batherLoadActive(chem, now)`.
- `chemFlag = chem.length ? clarityFlag(chem[0]) : null`.
- `readings: TrendReading[]` — each locked turnover's reading
  (`{recorded_at, ph, sanitizer_ppm, temp_f}`), newest-first, nulls filtered —
  same derivation as `/p/[id]`.
- `flags = chemFlag ? [chemFlag] : []` (for `ChemistryAlerts`).

**Sort attention-first:** an `attention` score per property — needs attention
when `batherLoad || chemFlag` is truthy. Sort `attention` desc, then name asc.
This is the demo story: flagged tubs float to the top.

### Layout — stacked tub cards

- Page head: `<h1>Chemistry</h1>` + a one-line summary on the right:
  - `N` = count of properties needing attention.
  - `N > 0` → `"{N} need{s} attention"` (warn tone); else `"All guest-ready"`.
- Then one card per property (whole card is a `Link` to `/p/[id]`,
  `card card-link pad`), in sorted order. Card contents:
  - **Header row** (`spread`): name + address (left); chemistry status badges
    (right, `row wrap`):
    - `batherLoad` → `badge warn` "Shock due" (droplet icon).
    - `chemFlag.reason === "low_sanitizer"` → `badge warn` "Low sanitizer".
    - else if `readings.length > 0` → `badge ok` "● Guest-ready".
    - else → `badge` "No readings yet".
  - `<ChemistryAlerts batherLoad={batherLoad} flags={flags} />` — renders
    nothing when the water's fine, so healthy tubs stay quiet.
  - `readings.length > 0` → `<ChemistryTrend readings={readings} compact />`
    (the 3 sparklines + latest values, no table). Otherwise a muted
    "No water readings yet" note.
- **Empty state:** no properties → a `card` note ("No properties yet…" /
  "No properties shared with you yet.", mirroring the dashboard's wording by
  role).

### `ChemistryTrend` — add a `compact` prop

To keep a single source of truth for the sparklines (no copy/paste), add an
optional `compact?: boolean` to `ChemistryTrend`:

- `compact` true → render **only** the 3-metric sparkline grid (each `Metric`
  already shows its latest value + flag color). Omit the card's "Water /
  Chemistry trend" header, the `<hr>`, and the 8-row recent table.
- `compact` false / omitted → unchanged (full card as on `/p/[id]`).

`/chemistry` wraps each compact trend itself (inside the per-tub card), so in
compact mode `ChemistryTrend` returns just the metric grid (no outer `card`),
to avoid a card-in-a-card. Default behavior on `/p/[id]` is untouched.

### Nav

- `Shell.tsx`: add `{ href: "/chemistry", label: "Chemistry" }` to
  `NAV_BY_ROLE.operator`, inserted **before** "Insights". Owner/staff nav
  unchanged (per issue scope). This is the only shared-file edit — `Shell.tsx`
  is not in flight, so no conflict with #117.

## Part 2 — demo seed

Extend `apps/web/scripts/seed-demo.mjs` so the Chemistry screen and per-tub
trends are populated and varied. Keep the non-local-URL safety guard and the
"already seeded → skip unless --force" guard intact.

### Mechanism

- `makeTurnover(client, {...})` gains optional fields:
  - `water` — `{ ph, sanitizer_ppm, temp_f }` (any field may be null).
  - `at` — ISO string to backdate the turnover (historical spread).
  - `photos` — boolean (default `true`); allow readings-only historical
    turnovers to skip the 4 sample uploads so the seed stays fast.
- After the turnover is created + locked by the capturer client (RLS path,
  unchanged), use the **service-role `admin` client** to:
  - insert the `water_reading` row with an explicit `recorded_at` = `at`
    (admin bypasses the draft-only RLS write policy and lets us set a historical
    timestamp; `turnover_id` is unique → one reading per turnover);
  - backdate `submitted_at_server` = `at` on the turnover, so the dashboard
    badges (`batherLoadActive`, `clarityFlag`) and the trend ordering use the
    historical time.

### Three stories (multiple turnovers each → real multi-point sparklines)

Times are relative to seed run (`Date.now()`), built as explicit ISO offsets.
Thresholds: pH 7.2–7.8 · sanitizer 3–5 ppm · temp ≤ 104°F.

- **Ridgeline A-Frame — healthy (contrast tub).** ~4 turnovers spread over
  ~3 weeks, all in range (e.g. sanitizer 4→3.5→4.5→4, pH ~7.4–7.6,
  temp 100–102). No flags; renders "● Guest-ready" + a calm trend. Keep the
  existing cleaner-captured recent turnover here (scoped staff capture story)
  and a share on the latest.
- **Lakeview Cabin 4 — shock due (bather load).** ≥2 locked turnovers **within
  the trailing 48h** plus older ones, sanitizer trending **down** and the latest
  not yet healthy (e.g. 5→4→3→2 ppm, last two inside 48h). Triggers
  `batherLoadActive` (and a low-sanitizer flag at the tail). Preserve the
  existing `urgent` + `water_cloudy` flavor on the latest turnover ("shocked the
  tub, will recheck").
- **Pine Chalet — low sanitizer dip.** ~3 turnovers; the latest reading **below
  3 ppm** (e.g. 4→3.5→2 ppm) so `clarityFlag` raises "Low sanitizer" and the
  sanitizer sparkline shows a clear dip. Not back-to-back (no bather-load), so
  the two stories stay visually distinct. Keep a share on it.

Net: at least one flagged-via-bather-load tub, one low-sanitizer tub, and one
healthy tub — the three states the screen is built to surface.

### Seed console summary

Update the closing log to reflect the chemistry data (turnover counts + which
tub demonstrates which state) so a demo runner knows what to click.

## Testing & verification

- `cd apps/web && npm run lint && npm run typecheck && npm run build` — green.
- `npm run test:rls` — green (no schema change, but keep it passing).
- Manual in `tt-demo` (restart `tt-down` then `tt-up` for a fresh seed):
  - "Chemistry" nav item appears for the operator and opens a populated
    overview; Lakeview (shock due) and Pine Chalet (low sanitizer) sort above
    the healthy Ridgeline; the summary reads "2 need attention".
  - Each flagged tub shows its `ChemistryAlerts` action note + a multi-point
    sparkline; the healthy tub is quiet with "● Guest-ready".
  - Per-tub `/p/[id]` now renders the full `ChemistryTrend` (sparklines + 8-row
    table) with the same seeded series.

## Out of scope / non-goals

- No schema change, no new charting library (`Sparkline` covers it).
- No edits to `turnover.ts` or `app/page.tsx` (avoids conflict with #117).
- Owner/staff nav unchanged; no per-reading detail page beyond `/p/[id]`.
- All chemistry seed data lives **here**; #118 (seed refresh) defers to this
  issue. Land this before #118 or coordinate the merge.

## Done when

A "Chemistry" screen shows water health across all tubs with believable seeded
data and trends, reusing the existing chemistry primitives, CI green.
