# Chemistry view + demo seed (#123) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated cross-property `/chemistry` screen (water health across all of an operator's tubs, attention-first) and seed varied demo chemistry data so it and the per-tub `/p/[id]` trends are populated and tell a story.

**Architecture:** A server component mirroring the dashboard's data fetch, reusing the existing chemistry primitives (`chemistry.ts`, `chemistry-rules.ts`, `ChemistryAlerts`, `ChemistryTrend`). `ChemistryTrend` gains a `compact` prop (sparklines only) so the new screen reuses it without duplicating chart code. The seed extends `seed-demo.mjs`: recent "live" turnovers keep the RLS capturer path (now also writing a `water_reading`), and backdated historical points are inserted directly as `submitted_locked` via the service-role admin client with explicit `submitted_at_server`.

**Tech Stack:** Next.js 15 (App Router, server components), TypeScript (strict), Supabase JS, local Supabase stack via `tt-demo`.

**Testing note:** This repo has **no component/unit test harness** — the quality gate is `npm run lint && npm run typecheck && npm run build`, the RLS suite (`npm run test:rls`), and manual verification in `tt-demo`. Do **not** scaffold Jest/Vitest. "Verify" steps below mean typecheck/build + a manual demo walk, matching repo convention.

**Key trigger facts (already verified against migrations):**
- `guard_turnover_lock` (BEFORE UPDATE) raises on any update to a row whose `old.status = 'submitted_locked'` — even for service-role. So never UPDATE a locked turnover; set fields at INSERT instead.
- `set_turnover_server_fields` (BEFORE INSERT) only overrides `submitter_id`/`submitted_at_server` when `auth.uid()` is non-null. Service-role (admin) callers keep control — they can set `submitted_at_server` explicitly.
- The photo / issue_tag / water_reading "draft-only" guards are **RLS policies**, which the service-role admin client bypasses. Triggers (audit) still fire and are fine.

---

## File structure

- Modify `apps/web/src/components/ChemistryTrend.tsx` — add `compact?: boolean`; factor the 3-metric grid so compact mode returns just the grid (no card/header/table).
- Create `apps/web/src/app/chemistry/page.tsx` — the new screen.
- Modify `apps/web/src/components/Shell.tsx` — one nav item.
- Modify `apps/web/scripts/seed-demo.mjs` — water readings on live turnovers + backdated historical series.

---

## Task 1: `ChemistryTrend` gains a `compact` prop

**Files:**
- Modify: `apps/web/src/components/ChemistryTrend.tsx`

- [ ] **Step 1: Replace the component function with the compact-aware version**

Replace the entire `export function ChemistryTrend(...)` block (currently starting at line 81) with:

```tsx
/** Per-property chemistry trend (issue #100): sparklines + a recent-readings
 *  table, with out-of-range points/values flagged. `readings` is newest-first.
 *  `compact` renders only the 3-metric sparkline grid (no card/header/table) —
 *  used by the cross-property /chemistry screen, which supplies its own card. */
export function ChemistryTrend({
  readings,
  compact = false,
}: {
  readings: TrendReading[];
  compact?: boolean;
}) {
  if (readings.length === 0) return null;
  const chrono = [...readings].reverse();

  const phPts = points(chrono, (r) => r.ph, phOutOfRange);
  const sanitizerPts = points(
    chrono,
    (r) => r.sanitizer_ppm,
    sanitizerOutOfRange
  );
  const tempPts = points(chrono, (r) => r.temp_f, tempOutOfRange);

  const metrics = (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16,
      }}
    >
      <Metric
        label="pH"
        pts={phPts}
        band={{ min: CHEM_THRESHOLDS.ph.min, max: CHEM_THRESHOLDS.ph.max }}
      />
      <Metric
        label="Sanitizer"
        unit="ppm"
        pts={sanitizerPts}
        band={{
          min: CHEM_THRESHOLDS.sanitizerPpm.min,
          max: CHEM_THRESHOLDS.sanitizerPpm.max,
        }}
      />
      <Metric label="Temp" unit="°F" pts={tempPts} />
    </div>
  );

  if (compact) return metrics;

  const recent = readings.slice(0, 8);

  return (
    <div className="card pad stack">
      <div className="spread">
        <h3 style={{ fontSize: 17 }}>Water</h3>
        <span className="badge">
          <Icon name="droplet" size={12} /> Chemistry trend
        </span>
      </div>

      {metrics}

      <hr className="divider" />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr className="label">
            <th style={{ textAlign: "left", padding: "6px 0" }}>When</th>
            <th style={{ textAlign: "right", padding: "6px 0" }}>pH</th>
            <th style={{ textAlign: "right", padding: "6px 0" }}>Sanitizer</th>
            <th style={{ textAlign: "right", padding: "6px 0" }}>Temp</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
              <td className="small dim" style={{ padding: "8px 0" }}>
                {formatDateTime(r.recorded_at)}
              </td>
              <td style={{ textAlign: "right", padding: "8px 0" }}>
                <Cell value={r.ph} flagged={phOutOfRange(r.ph)} />
              </td>
              <td style={{ textAlign: "right", padding: "8px 0" }}>
                <Cell
                  value={r.sanitizer_ppm}
                  flagged={sanitizerOutOfRange(r.sanitizer_ppm)}
                />
              </td>
              <td style={{ textAlign: "right", padding: "8px 0" }}>
                <Cell value={r.temp_f} flagged={tempOutOfRange(r.temp_f)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

(Only change vs. current: the `compact` prop, the `metrics` extraction, and the `if (compact) return metrics;` early return. `points`, `Metric`, `Cell`, imports are untouched.)

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && npm run typecheck`
Expected: PASS (no errors). Confirms the `/p/[id]` consumer (which omits `compact`) still typechecks.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ChemistryTrend.tsx
git commit -m "feat(chemistry): add compact mode to ChemistryTrend (#123)"
```

---

## Task 2: The `/chemistry` screen

**Files:**
- Create: `apps/web/src/app/chemistry/page.tsx`

- [ ] **Step 1: Create the page**

Create `apps/web/src/app/chemistry/page.tsx` with:

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getCurrentMembership } from "@/lib/auth";
import { ChemistryAlerts } from "@/components/ChemistryAlerts";
import { ChemistryTrend, type TrendReading } from "@/components/ChemistryTrend";
import {
  batherLoadActive,
  clarityFlag,
  type TurnoverChem,
} from "@/lib/chemistry-rules";

export default async function ChemistryPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  // Staff get the capture-only home; this cross-property view is operator/owner.
  if (membership.role === "staff") redirect("/");

  const canAdd = membership.role === "operator";
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, address,
       turnover(
         id, submitted_at_server, status, urgent,
         issue_tag(tag, confirmed_at),
         water_reading(ph, sanitizer_ppm, temp_f, recorded_at)
       )`
    )
    .order("created_at");

  const now = Date.now();
  const cards = (properties ?? []).map((p) => {
    const locked = (p.turnover ?? [])
      .filter((t) => t.status === "submitted_locked")
      .sort((a, b) =>
        (b.submitted_at_server ?? "").localeCompare(a.submitted_at_server ?? "")
      );
    const readingOf = (t: (typeof locked)[number]) =>
      Array.isArray(t.water_reading) ? t.water_reading[0] : t.water_reading;

    const chem: TurnoverChem[] = locked.map((t) => ({
      at: t.submitted_at_server,
      sanitizerPpm: readingOf(t)?.sanitizer_ppm ?? null,
      cloudy: (t.issue_tag ?? []).some(
        (i) => i.tag === "water_cloudy" && !i.confirmed_at
      ),
    }));
    const batherLoad = batherLoadActive(chem, now);
    const chemFlag = chem.length > 0 ? clarityFlag(chem[0]) : null;
    const flags = chemFlag ? [chemFlag] : [];
    const readings: TrendReading[] = locked
      .map((t) => {
        const r = readingOf(t);
        return r
          ? {
              recorded_at: r.recorded_at,
              ph: r.ph,
              sanitizer_ppm: r.sanitizer_ppm,
              temp_f: r.temp_f,
            }
          : null;
      })
      .filter((r): r is TrendReading => r !== null);
    const attention = batherLoad || chemFlag != null;

    return { ...p, batherLoad, chemFlag, flags, readings, attention };
  });

  // Demo story: tubs needing attention float to the top, then alphabetical.
  cards.sort((a, b) => {
    if (a.attention !== b.attention) return a.attention ? -1 : 1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const attentionCount = cards.filter((c) => c.attention).length;

  return (
    <div className="stack">
      <div className="spread pagehead">
        <h1>Chemistry</h1>
        {cards.length > 0 && (
          <span className={attentionCount > 0 ? "badge warn" : "badge ok"}>
            {attentionCount > 0
              ? `${attentionCount} need${attentionCount === 1 ? "s" : ""} attention`
              : "All guest-ready"}
          </span>
        )}
      </div>

      {cards.length === 0 ? (
        <div
          className="card pad"
          style={{ textAlign: "center", padding: "40px 24px" }}
        >
          <p className="muted">
            {canAdd
              ? "No properties yet. Add your first to start logging turnovers."
              : "No properties shared with you yet."}
          </p>
        </div>
      ) : (
        <div className="stack">
          {cards.map((p) => (
            <Link
              key={p.id}
              href={`/p/${p.id}`}
              className="card card-link pad stack"
            >
              <div className="spread">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.name}</div>
                  {p.address && (
                    <div className="small dim" style={{ marginTop: 2 }}>
                      {p.address}
                    </div>
                  )}
                </div>
                <div className="row wrap" style={{ justifyContent: "flex-end" }}>
                  {p.batherLoad && (
                    <span className="badge warn">
                      <Icon name="droplet" size={11} /> Shock due
                    </span>
                  )}
                  {p.chemFlag?.reason === "low_sanitizer" && (
                    <span className="badge warn">Low sanitizer</span>
                  )}
                  {p.chemFlag?.reason === "cloudy" && (
                    <span className="badge warn">Cloudy</span>
                  )}
                  {!p.attention &&
                    (p.readings.length > 0 ? (
                      <span className="badge ok">● Guest-ready</span>
                    ) : (
                      <span className="badge">No readings yet</span>
                    ))}
                </div>
              </div>

              <ChemistryAlerts batherLoad={p.batherLoad} flags={p.flags} />

              {p.readings.length > 0 ? (
                <ChemistryTrend readings={p.readings} compact />
              ) : (
                <p className="small dim" style={{ margin: 0 }}>
                  No water readings yet.
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `cd apps/web && npm run typecheck && npm run lint`
Expected: PASS. (Watch for the `readingOf` param type and the `filter` type guard — they mirror `/p/[id]` and `app/page.tsx`, which already typecheck.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/chemistry/page.tsx
git commit -m "feat(chemistry): cross-property Chemistry screen (#123)"
```

---

## Task 3: Nav item

**Files:**
- Modify: `apps/web/src/components/Shell.tsx:15-24` (the `NAV_BY_ROLE.operator` array)

- [ ] **Step 1: Insert the nav item before "Insights"**

In `NAV_BY_ROLE.operator`, change:

```tsx
  operator: [
    { href: "/", label: "Dashboard" },
    { href: "/team", label: "Team" },
    { href: "/insights", label: "Insights" },
    { href: "/add-property", label: "Add property" },
  ],
```

to:

```tsx
  operator: [
    { href: "/", label: "Dashboard" },
    { href: "/team", label: "Team" },
    { href: "/chemistry", label: "Chemistry" },
    { href: "/insights", label: "Insights" },
    { href: "/add-property", label: "Add property" },
  ],
```

- [ ] **Step 2: Typecheck + build**

Run: `cd apps/web && npm run typecheck && npm run build`
Expected: PASS. Build should list `/chemistry` as a route.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/Shell.tsx
git commit -m "feat(chemistry): add Chemistry to operator nav (#123)"
```

---

## Task 4: Seed varied chemistry data

**Files:**
- Modify: `apps/web/scripts/seed-demo.mjs`

Goal data after seeding (3 properties, attention-first):
- **Lakeview Cabin 4** — shock due (bather load) + low sanitizer: latest reading 2 ppm, plus a 2nd locked turnover ~18h ago (two within the 48h window).
- **Pine Chalet** — low sanitizer dip: latest reading 2 ppm, older points healthy; only one turnover inside 48h (no bather load → distinct from Lakeview).
- **Ridgeline A-Frame** — healthy contrast: all readings in range.

- [ ] **Step 1: Add a backdated reading to `makeTurnover` (RLS capturer path) for the "live" turnovers**

In `makeTurnover`, add `water = null` to the destructured options and insert the reading via the **same capturer `client`** while the turnover is still `draft` (RLS-legal), i.e. **before** the lock `update`. Locate the lock block:

```js
  const { error: lockErr } = await client.from("turnover").update({ status: "submitted_locked" }).eq("id", t.id);
  if (lockErr) throw new Error(`lock: ${lockErr.message}`);
```

Insert the `water` block immediately **above** it, and add `water` to the signature. The signature line becomes:

```js
async function makeTurnover(client, { propertyId, orgId, actorId, notes, urgent = false, issue = null, share = false, water = null }) {
```

And immediately above the lock block, add:

```js
  // Live water reading via the capturer client (RLS path: status still draft).
  // recorded_at defaults to now().
  if (water) {
    const { error: wrErr } = await client.from("water_reading").insert({
      turnover_id: t.id,
      property_id: propertyId,
      ph: water.ph ?? null,
      sanitizer_ppm: water.sanitizer_ppm ?? null,
      temp_f: water.temp_f ?? null,
    });
    if (wrErr) throw new Error(`water_reading: ${wrErr.message}`);
  }
```

- [ ] **Step 2: Add a historical-turnover helper (admin path, backdated, inserted already-locked)**

Add this function above `main()` (e.g. right after `makeTurnover`):

```js
// Backdated, already-locked turnover for trend history. Inserted via the
// service-role admin client so we can set submitted_at_server explicitly
// (the BEFORE-INSERT server-fields trigger only overrides for JWT callers) and
// bypass the draft-only child-table RLS. Never UPDATE a locked turnover — the
// lock guard trigger raises on that — so we insert it locked in one shot.
async function histTurnover({ propertyId, submitterId, at, water = null, urgent = false, issue = null, notes = null }) {
  const { data: t, error } = await admin
    .from("turnover")
    .insert({
      property_id: propertyId,
      submitter_id: submitterId,
      submitted_at_server: at,
      status: "submitted_locked",
      urgent,
      notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(`hist turnover insert: ${error.message}`);

  if (water) {
    const { error: wErr } = await admin.from("water_reading").insert({
      turnover_id: t.id,
      property_id: propertyId,
      ph: water.ph ?? null,
      sanitizer_ppm: water.sanitizer_ppm ?? null,
      temp_f: water.temp_f ?? null,
      recorded_at: at,
    });
    if (wErr) throw new Error(`hist water_reading: ${wErr.message}`);
  }
  if (issue) {
    const { error: iErr } = await admin.from("issue_tag").insert({
      turnover_id: t.id,
      tag: issue,
      source: "human",
      confirmed_at: at,
    });
    if (iErr) throw new Error(`hist issue_tag: ${iErr.message}`);
  }
  return t.id;
}
```

- [ ] **Step 3: Add time helpers near the top of `main()`**

Right after `const orgId = mem.org_id;` add (defined inside `main` so it can be reused below):

```js
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;
  const tNow = Date.now();
  const ago = (ms) => new Date(tNow - ms).toISOString();
```

- [ ] **Step 4: Attach `water` to the existing live turnovers and add historical series**

Replace the existing "Host-captured turnovers" + cleaner block (currently lines ~156–163) with:

```js
  // ── Live turnovers (RLS capturer path) — these are each property's latest ──
  // Ridgeline: healthy contrast tub.
  await makeTurnover(hc, {
    propertyId: byName["Ridgeline A-Frame"], orgId, actorId: host.id, share: true,
    notes: "Filters rinsed, water clear, cover latched. Guest-ready.",
    water: { ph: 7.4, sanitizer_ppm: 4, temp_f: 101 },
  });
  // Lakeview: back-to-back stays, sanitizer crashed → shock due + low sanitizer.
  await makeTurnover(hc, {
    propertyId: byName["Lakeview Cabin 4"], orgId, actorId: host.id, urgent: true, issue: "water_cloudy",
    notes: "Cloudy after a big group — shocked the tub, will recheck before check-in.",
    water: { ph: 7.9, sanitizer_ppm: 2, temp_f: 104 },
  });
  // Pine Chalet: a single low-sanitizer dip (not back-to-back).
  await makeTurnover(hc, {
    propertyId: byName["Pine Chalet"], orgId, actorId: host.id, share: true,
    notes: "Routine turnover — sanitizer reading came back low, re-dosing.",
    water: { ph: 7.3, sanitizer_ppm: 2, temp_f: 100 },
  });

  // A cleaner-captured turnover on their assigned property (scoped staff capture).
  const cc = await authed(CLEANER);
  await makeTurnover(cc, {
    propertyId: byName["Ridgeline A-Frame"], orgId, actorId: cleaner.id,
    notes: "Quick turn between guests — looks good.",
    water: { ph: 7.5, sanitizer_ppm: 4, temp_f: 100 },
  });

  // ── Historical readings (admin path, backdated) → real multi-point trends ──
  // Ridgeline: steady, in range.
  await histTurnover({ propertyId: byName["Ridgeline A-Frame"], submitterId: host.id, at: ago(21 * DAY), water: { ph: 7.4, sanitizer_ppm: 4, temp_f: 101 } });
  await histTurnover({ propertyId: byName["Ridgeline A-Frame"], submitterId: host.id, at: ago(14 * DAY), water: { ph: 7.5, sanitizer_ppm: 3.5, temp_f: 100 } });
  await histTurnover({ propertyId: byName["Ridgeline A-Frame"], submitterId: host.id, at: ago(7 * DAY), water: { ph: 7.3, sanitizer_ppm: 4.5, temp_f: 102 } });

  // Lakeview: sanitizer trending down; a 2nd turnover inside 48h drives bather-load.
  await histTurnover({ propertyId: byName["Lakeview Cabin 4"], submitterId: host.id, at: ago(10 * DAY), water: { ph: 7.6, sanitizer_ppm: 5, temp_f: 102 } });
  await histTurnover({ propertyId: byName["Lakeview Cabin 4"], submitterId: host.id, at: ago(4 * DAY), water: { ph: 7.7, sanitizer_ppm: 4, temp_f: 103 } });
  await histTurnover({ propertyId: byName["Lakeview Cabin 4"], submitterId: host.id, at: ago(18 * HOUR), urgent: true, water: { ph: 7.8, sanitizer_ppm: 3, temp_f: 103 } });

  // Pine Chalet: healthy history before today's dip.
  await histTurnover({ propertyId: byName["Pine Chalet"], submitterId: host.id, at: ago(16 * DAY), water: { ph: 7.5, sanitizer_ppm: 4, temp_f: 101 } });
  await histTurnover({ propertyId: byName["Pine Chalet"], submitterId: host.id, at: ago(9 * DAY), water: { ph: 7.4, sanitizer_ppm: 3.5, temp_f: 100 } });
```

- [ ] **Step 5: Update the closing console summary**

Replace the three closing `console.log` lines (currently ~165–168) with:

```js
  console.log("Seeded demo workspace 'Cascade Stays':");
  console.log(`  host:    ${HOST.email}  /  ${HOST.password}`);
  console.log(`  cleaner: ${CLEANER.email}  /  ${CLEANER.password}`);
  console.log("  3 properties; chemistry: Lakeview = shock due + low sanitizer,");
  console.log("  Pine Chalet = low sanitizer dip, Ridgeline = healthy (multi-point trends).");
```

- [ ] **Step 6: Lint the script**

Run: `cd apps/web && npm run lint`
Expected: PASS (the seed script is covered by ESLint; no unused vars).

- [ ] **Step 7: Commit**

```bash
git add apps/web/scripts/seed-demo.mjs
git commit -m "feat(demo): seed varied chemistry data for the Chemistry view (#123)"
```

---

## Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full quality gate**

Run: `cd apps/web && npm run lint && npm run typecheck && npm run build`
Expected: all PASS; build output lists the `/chemistry` route.

- [ ] **Step 2: RLS suite stays green**

Run: `cd apps/web && npm run test:rls`
Expected: PASS (no schema change; this confirms nothing regressed).

- [ ] **Step 3: Manual demo walk**

Reseed and run the demo fresh:

```bash
tt-down && tt-up
```

Then open the demo (http://localhost:3001 per the demo setup), sign in as the demo host, and confirm:
- The **Chemistry** nav item appears for the operator and opens a populated screen.
- Header reads **"2 need attention"**; **Lakeview Cabin 4** (Shock due + Low sanitizer) and **Pine Chalet** (Low sanitizer) sort **above** the healthy **Ridgeline A-Frame** (● Guest-ready).
- Each flagged card shows its `ChemistryAlerts` action note and a **multi-point** sparkline (not a single dot); the healthy card is quiet.
- The dashboard (`/`) still shows the matching "Shock due" / "Low sanitizer" badges.
- A per-tub page (`/p/<lakeview-id>`) renders the **full** `ChemistryTrend` (sparklines + recent-readings table).

If `tt-up`/`tt-down` aren't on PATH in this environment, run the seed the way the demo wrapper does (export the local stack creds + `DEMO_PASSWORD`, then `node scripts/seed-demo.mjs --force`).

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin fjsg7mskqr-crypto/g-chemistry-view-demo-seed-demo-113
gh pr create --base main --title "feat(demo): Chemistry view + seeded chemistry data (#123)" --body "$(cat <<'EOF'
Closes #123.

Adds a cross-property `/chemistry` screen (water health across all of an operator's tubs, attention-first) and seeds varied demo chemistry data so it — and the per-tub trends — are populated.

- `ChemistryTrend` gains a `compact` prop (sparklines only); the new screen reuses it inside a per-tub card.
- New operator nav item "Chemistry" (only shared-file edit; no conflict with #117).
- Seed: live turnovers now write a `water_reading`; backdated historical turnovers (admin path, inserted already-locked) build multi-point trends. Lakeview = shock due + low sanitizer, Pine Chalet = low sanitizer dip, Ridgeline = healthy.

No schema change. RLS suite green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Merge once CI is green**

```bash
gh pr merge --squash
```

Then remove the worktree (`ExitWorktree` or `git worktree remove`).

---

## Self-review notes

- **Spec coverage:** dedicated view (Task 2) ✓, nav (Task 3) ✓, `compact` reuse of `ChemistryTrend` (Task 1) ✓, attention-first sort + summary (Task 2) ✓, seed multi-point/low-sanitizer/bather-load/healthy (Task 4) ✓, no schema change ✓, only `Shell.tsx` shared-file edit ✓, CI + RLS + manual verify (Task 5) ✓.
- **Type consistency:** `readingOf`, `chem`/`TurnoverChem`, `TrendReading[]`, `clarityFlag` reason values (`"low_sanitizer"` / `"cloudy"`) all match `chemistry-rules.ts` and the `/p/[id]` consumer. `compact` is optional, so the existing `/p/[id]` call site is unaffected.
- **Seed correctness:** historical turnovers are inserted directly as `submitted_locked` (never UPDATE-after-lock → avoids `guard_turnover_lock`); `submitted_at_server` set explicitly via admin (allowed because the server-fields trigger skips non-JWT callers); child-table RLS bypassed by service-role. Lakeview has exactly two turnovers inside 48h (now + 18h) with latest sanitizer 2 ppm → `batherLoadActive` true; Pine Chalet has one inside 48h → no bather load, latest 2 ppm → low-sanitizer flag only.
