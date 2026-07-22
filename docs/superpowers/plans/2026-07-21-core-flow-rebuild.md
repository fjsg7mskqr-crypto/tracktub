# Core Flow Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new mobile-first, camera-first turnover flow — Today → Start turnover → guided capture → chemistry → proof — built to the approved "Water" visual bar, reviewable locally beside the existing console app.

**Architecture:** A new URL section `src/app/field/*` with its own bottom-tab layout, built as a *new front-end over the existing, tested backend*. It reuses the current turnover data model, the `capture-v2` step/resume logic, the `chemistry` range logic, and the existing server actions in `src/lib/actions/turnover.ts` — **no schema changes, no changes to the console routes.** The console (`/`, `/t/[id]`, `/p/[id]/new`, `/operations/*`) stays untouched and live.

**Tech Stack:** Next.js 15 App Router (RSC + server actions), TypeScript (strict), Tailwind v4 (`@theme` in `globals.css`), Supabase (`src/lib/supabase/{server,client,storage}.ts`), Vitest (`tests/`).

## Global Constraints

- **No schema changes.** Reuse existing `turnover`, `water_reading`, `photo` tables and the actions in `src/lib/actions/turnover.ts`. If a change appears unavoidable, STOP and flag the founder (shared-DB rule, `CLAUDE.md`).
- **Do not modify console routes/components.** Build only under `src/app/field/*` and new `src/components/field/*`. Shared libs (`src/lib/*`) may be *read*; extend only additively.
- **Visual bar = the "Water" mockup** (spec `docs/superpowers/specs/2026-07-21-core-flow-rebuild-design.md` §5b; reference artifact `claude.ai/code/artifact/25c55634`). Light surfaces; brand blue `#3B82F6`/`#2563EB` for all actions; green `#34D399` for **verified/in-range status ONLY**; ink `#08090A` on white; editorial serif (Palatino/Iowan system stack) for display numbers + card titles; Inter body; JetBrains Mono for units/data.
- **Mobile-first:** every screen correct at 390px width with **zero horizontal clipping**; primary actions thumb-reachable; big touch targets; **no keyboard** for chemistry entry.
- **Capture is resumable with no timeout.** Draft state persists server-side via existing actions; a killed/backgrounded session resumes from Today.
- **Honest evidence (non-negotiable copy rule):** the flow never fabricates or "corrects" a value and never overstates. Status says what was *measured/attested* ("tech marked balanced," "TA 100 as-found"), never "verified guest-ready" as if the software vouched.
- Quality gate before every PR: `npm run lint && npm run typecheck && npm run build` (from `apps/web`). Work in a worktree; PR to `main`; CI green; squash-merge.

## File Structure

**New — field section**
- `src/app/field/layout.tsx` — bottom-tab shell (Today · Tubs · History · More) + "Water" tokens applied via a wrapper class.
- `src/app/field/today/page.tsx` — Today prep brief (RSC).
- `src/app/field/tubs/page.tsx` · `src/app/field/history/page.tsx` · `src/app/field/more/page.tsx` — v1 lists (History reuses turnover queries; More links to console modules).
- `src/app/field/turnover/[id]/page.tsx` — capture host (RSC: loads draft, computes resume step).
- `src/app/field/turnover/[id]/CaptureFlow.tsx` — client capture controller (before → water → after → finish).
- `src/components/field/` — `BottomTabBar.tsx`, `FieldButton.tsx`, `Stepper.tsx` (± + preset pad), `RangeBar.tsx`, `StatusPill.tsx`, `TubCard.tsx`, `CaptureAnchor.tsx`, `ChemistryStep.tsx`, `FinishProof.tsx`.
- `src/lib/field/today.ts` — pure `buildTodayCards()` aggregation (unit-tested).
- `tests/field/today.test.ts` — tests for `buildTodayCards()`.

**Modify (additive only)**
- `src/app/globals.css` — add a `.field-scope { … }` token block (Water palette, serif var). Do not alter existing tokens.

**Reused (read-only)**
- `src/lib/capture-v2.ts` — `computeInitialStep`, `REQUIRED_LOCK_PHOTOS`, `CAPTURE_STEP_*`, `guidedPhotoStoragePath`, `photoKey`.
- `src/lib/chemistry.ts` — `WaterReadingValues`, `CHEM_THRESHOLDS`, `SANITIZER_BANDS`, `sanitizerBand`, `alkalinityOutOfRange`, `phOutOfRange`, `calciumHardnessOutOfRange`, `sanitizerOutOfRange`, `readingHasFlag`, `WATER_TREATMENTS`, `treatmentLabel`.
- `src/lib/actions/turnover.ts` — `ensureDraftTurnoverAction`, `saveGuidedPhotoAction`, `saveDraftReadingAction`, `saveDraftMetaAction`, `lockTurnoverAction`, `submitTurnoverAction`.
- `src/lib/supabase/{server,client,storage}.ts`.

---

### Task 1: Field shell + bottom-tab nav + "Water" tokens

**Files:**
- Create: `src/app/field/layout.tsx`, `src/app/field/today/page.tsx` (placeholder), `src/components/field/BottomTabBar.tsx`, `src/components/field/FieldButton.tsx`
- Modify: `src/app/globals.css` (add `.field-scope` token block)
- Test: `tests/field/shell.test.tsx`

**Interfaces:**
- Produces: `<BottomTabBar active="today|tubs|history|more" />`; the `.field-scope` CSS class exposing `--field-bg`, `--field-card`, `--field-ink`, `--field-muted`, `--field-accent` (`#2563EB`), `--field-accent-bar` (`#3B82F6`), `--field-ok` (`#34D399`), `--field-serif` (`'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif`).

- [ ] **Step 1: Add the Water token block** to `globals.css`:

```css
.field-scope {
  --field-bg: #f4f6f9;
  --field-card: #ffffff;
  --field-ink: #08090a;
  --field-muted: #5a5f6a;
  --field-accent: #2563eb;      /* actions/text on light */
  --field-accent-bar: #3b82f6;  /* fills, active progress */
  --field-ok: #34d399;          /* verified/in-range status ONLY */
  --field-serif: 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;
  background: var(--field-bg);
  color: var(--field-ink);
  min-height: 100dvh;
}
```

- [ ] **Step 2: Write failing test** (`tests/field/shell.test.tsx`) — render `BottomTabBar` with `active="today"`, assert 4 tab labels present and the active tab has `aria-current="page"`.
- [ ] **Step 3: Run test, verify it fails** — `npx vitest run tests/field/shell.test.tsx` → FAIL (module not found).
- [ ] **Step 4: Build `BottomTabBar.tsx`** — fixed-bottom nav, 4 `next/link`s to `/field/{today,tubs,history,more}`, icons via existing `src/components/Icon.tsx`, `aria-current` on active, safe-area padding (`env(safe-area-inset-bottom)`), min 44px targets.
- [ ] **Step 5: Build `layout.tsx`** — wraps children in `<div class="field-scope">`, renders `<BottomTabBar>`, adds bottom padding so content clears the bar. Placeholder `today/page.tsx` renders an `<h1>`.
- [ ] **Step 6: Run tests + quality gate** — `npx vitest run tests/field/shell.test.tsx` PASS; `npm run lint && npm run typecheck && npm run build` clean.
- [ ] **Step 7: Manual check at 390px** — load `/field/today` at 390px: no horizontal scroll, tab bar reachable. Commit: `feat(field): mobile shell + bottom-tab nav + Water tokens`.

**Acceptance:** `/field/today` renders at 390px with zero horizontal clipping and a thumb-reachable tab bar; console routes unchanged.

---

### Task 2: Today prep brief

**Files:**
- Create: `src/lib/field/today.ts`, `src/components/field/TubCard.tsx`; replace placeholder `src/app/field/today/page.tsx`
- Test: `tests/field/today.test.ts`

**Interfaces:**
- Consumes: property + turnover rows from Supabase (via `src/lib/supabase/server.ts`), `computeInitialStep` for resume detection.
- Produces:
  ```ts
  export interface TodayCard {
    propertyId: string;
    propertyName: string;
    lastTurnoverAt: string | null;       // ISO
    inProgressTurnoverId: string | null; // non-null ⇒ show "Resume"
  }
  export function buildTodayCards(input: {
    properties: { id: string; name: string }[];
    turnovers: { id: string; propertyId: string; status: "draft" | "locked" | "submitted"; at: string }[];
  }): TodayCard[];
  ```

- [ ] **Step 1: Write failing tests** for `buildTodayCards()`:

```ts
import { describe, it, expect } from "vitest";
import { buildTodayCards } from "@/lib/field/today";

describe("buildTodayCards", () => {
  it("marks a property with a draft turnover as resumable", () => {
    const cards = buildTodayCards({
      properties: [{ id: "p1", name: "Pine Chalet" }],
      turnovers: [{ id: "t1", propertyId: "p1", status: "draft", at: "2026-07-20T10:00:00Z" }],
    });
    expect(cards[0].inProgressTurnoverId).toBe("t1");
  });
  it("uses the latest submitted turnover for lastTurnoverAt and no resume", () => {
    const cards = buildTodayCards({
      properties: [{ id: "p1", name: "Pine Chalet" }],
      turnovers: [
        { id: "t1", propertyId: "p1", status: "submitted", at: "2026-07-18T10:00:00Z" },
        { id: "t2", propertyId: "p1", status: "submitted", at: "2026-07-20T10:00:00Z" },
      ],
    });
    expect(cards[0].lastTurnoverAt).toBe("2026-07-20T10:00:00Z");
    expect(cards[0].inProgressTurnoverId).toBeNull();
  });
  it("returns a card per property, sorted by name", () => {
    const cards = buildTodayCards({
      properties: [{ id: "p2", name: "Birch" }, { id: "p1", name: "Aspen" }],
      turnovers: [],
    });
    expect(cards.map((c) => c.propertyName)).toEqual(["Aspen", "Birch"]);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npx vitest run tests/field/today.test.ts` → FAIL.
- [ ] **Step 3: Implement `buildTodayCards()`** — pure function: for each property, pick the newest `draft` (→ `inProgressTurnoverId`) and newest non-draft (→ `lastTurnoverAt`); sort cards by `propertyName`.
- [ ] **Step 4: Run tests, verify PASS.**
- [ ] **Step 5: Build `TubCard.tsx`** — card to the mockup: property name (serif title), last-visit line, primary action = **"Resume turnover"** when `inProgressTurnoverId` else **"Start turnover"** (blue button → `/field/turnover/<id>` after `ensureDraftTurnoverAction`). Wire a `<form action={…}>` server action to create/resume the draft and redirect.
- [ ] **Step 6: Build `today/page.tsx`** (RSC) — fetch the org's properties + recent turnovers via `src/lib/supabase/server.ts`, call `buildTodayCards`, render `TubCard`s under an eyebrow + serif "Today" header.
- [ ] **Step 7: Quality gate + manual check** — cards render at 390px; draft shows "Resume." Commit: `feat(field): Today prep brief with resumable tub cards`.

**Acceptance:** Today shows one card per tub, surfaces in-progress drafts as "Resume," and starting a turnover lands on `/field/turnover/<id>`.

---

### Task 3: Camera-anchored capture flow (the heart)

**Files:**
- Create: `src/app/field/turnover/[id]/page.tsx`, `src/app/field/turnover/[id]/CaptureFlow.tsx`, `src/components/field/CaptureAnchor.tsx`
- Test: `tests/field/capture-resume.test.ts`

**Interfaces:**
- Consumes: `ensureDraftTurnoverAction`, `saveGuidedPhotoAction`, `computeInitialStep`, `REQUIRED_LOCK_PHOTOS`, `CAPTURE_STEP_BEFORE|WATER|AFTER_START|SUBMIT`, `guidedPhotoStoragePath`, Supabase storage upload (`src/lib/supabase/storage.ts`).
- Produces: `<CaptureFlow draft={DraftSnapshot} initialStep={number} />` where `DraftSnapshot` mirrors what `computeInitialStep` consumes (`{ photos: {slot,phase,storagePath}[] }`) plus `turnoverId`, `propertyId`, sanitizer type.

- [ ] **Step 1: Write failing test** — capture-resume routing over `computeInitialStep`:

```ts
import { describe, it, expect } from "vitest";
import { computeInitialStep } from "@/lib/capture-v2";
import { CAPTURE_STEP_BEFORE, CAPTURE_STEP_WATER } from "@/lib/capture-v2";

describe("capture resume", () => {
  it("starts at BEFORE when no photos", () => {
    expect(computeInitialStep({ photos: [] })).toBe(CAPTURE_STEP_BEFORE);
  });
  it("advances past BEFORE once the before/full_frame photo is stored", () => {
    const step = computeInitialStep({
      photos: [{ slot: "full_frame", phase: "before", storagePath: "org/t/before/full_frame" }],
    });
    expect(step).toBe(CAPTURE_STEP_WATER);
  });
});
```

- [ ] **Step 2: Run test, verify PASS or FAIL** — `npx vitest run tests/field/capture-resume.test.ts`. (This pins the reused contract; if it fails, the reuse assumption is wrong — STOP and re-read `capture-v2.ts`.)
- [ ] **Step 3: Build `CaptureAnchor.tsx`** — full-screen one-anchor step: title, `<input type="file" accept="image/*" capture="environment">` styled as a big capture button, preview + obvious **Retake**, primary "Next" gated on a stored photo. On capture: upload to storage path via `saveGuidedPhotoAction`, optimistic preview.
- [ ] **Step 4: Build `CaptureFlow.tsx`** — client controller starting at `initialStep`; sequence BEFORE → WATER (renders Task 4 `ChemistryStep`) → AFTER slots (`REQUIRED_LOCK_PHOTOS` after-phase) → finish (Task 5). Each save persists server-side (resumable). No timers, no timeout.
- [ ] **Step 5: Build `turnover/[id]/page.tsx`** (RSC) — load the draft snapshot, `computeInitialStep`, render `<CaptureFlow>`. Guard: if turnover already submitted, redirect to its proof.
- [ ] **Step 6: Quality gate + manual resume check** — start a turnover, capture the before photo, hard-reload → resumes at Water step; background and re-enter from Today → resumes. Commit: `feat(field): camera-anchored resumable capture flow`.

**Acceptance:** A turnover progresses before → water → after full-screen with big targets and retake; killing/backgrounding mid-flow loses nothing and resumes from Today.

---

### Task 4: Chemistry step — photo + tap pad (record-only)

**Files:**
- Create: `src/components/field/ChemistryStep.tsx`, `src/components/field/Stepper.tsx`, `src/components/field/RangeBar.tsx`, `src/components/field/StatusPill.tsx`
- Test: `tests/field/chemistry-status.test.ts`

**Interfaces:**
- Consumes: `WaterReadingValues`, `alkalinityOutOfRange`, `phOutOfRange`, `calciumHardnessOutOfRange`, `sanitizerOutOfRange`, `sanitizerBand`, `CHEM_THRESHOLDS`, `WATER_TREATMENTS`, `treatmentLabel`, `saveDraftReadingAction`, `saveDraftMetaAction`.
- Produces: `<ChemistryStep turnoverId sanitizerType value onDone />`; a pure helper `fieldRangeStatus(metric, value, sanitizerType): "ok" | "out" | "empty"` used by `StatusPill`/`RangeBar`.

- [ ] **Step 1: Write failing tests** for `fieldRangeStatus` (reusing the tested range predicates so thresholds stay single-sourced):

```ts
import { describe, it, expect } from "vitest";
import { fieldRangeStatus } from "@/components/field/ChemistryStep";

describe("fieldRangeStatus", () => {
  it("TA 100 is in range", () => expect(fieldRangeStatus("alkalinity", 100)).toBe("ok"));
  it("TA 200 is out of range", () => expect(fieldRangeStatus("alkalinity", 200)).toBe("out"));
  it("null reads as empty", () => expect(fieldRangeStatus("alkalinity", null)).toBe("empty"));
});
```

- [ ] **Step 2: Run tests, verify they fail.**
- [ ] **Step 3: Implement `fieldRangeStatus`** — delegates to `alkalinityOutOfRange`/`phOutOfRange`/`calciumHardnessOutOfRange`/`sanitizerOutOfRange`; `null` ⇒ `"empty"`. No new thresholds — reuse `chemistry.ts`.
- [ ] **Step 4: Run tests, verify PASS.**
- [ ] **Step 5: Build `Stepper.tsx`, `RangeBar.tsx`, `StatusPill.tsx`** to the mockup — preset chip row + big ± steppers (JetBrains Mono values), a range bar with the ideal band + thumb, a single "In range" pill (green `--field-ok` only). **No keyboard input.**
- [ ] **Step 6: Build `ChemistryStep.tsx`** — sequence TA → pH → hardness → sanitizer (one metric card at a time, serif big number, "Snap the strip instead" file capture as durable evidence); then treatment chips (`WATER_TREATMENTS`) + a **"Water balanced"** attestation toggle. Persist via `saveDraftReadingAction` (readings) and `saveDraftMetaAction` (treatments/attestation). Copy is as-found + treatments + attestation — never a post-balance re-reading.
- [ ] **Step 7: Quality gate + visual diff against the mockup** — side-by-side with artifact `25c55634`; palette/type/spacing match. Commit: `feat(field): chemistry photo + tap-pad step (record-only)`.

**Acceptance:** Matches the approved mockup; captures readings by strip photo or tap (no keyboard) for both strip and reagent users; writes as-found reading + treatments + balanced attestation via existing actions.

---

### Task 5: Proof + simple send

**Files:**
- Create: `src/components/field/FinishProof.tsx`; wire into `CaptureFlow.tsx` finish step
- Test: `tests/field/finish-copy.test.ts`

**Interfaces:**
- Consumes: `lockTurnoverAction`, `submitTurnoverAction`, `recordProofShare`, the existing proof token/link from `src/app/t/[id]` / `src/app/proof/[token]`.
- Produces: `<FinishProof turnoverId proofUrl />`; a pure `finishSummaryLines(reading, meta): string[]` for the honest-evidence copy.

- [ ] **Step 1: Write failing test** guarding the honest-evidence copy:

```ts
import { describe, it, expect } from "vitest";
import { finishSummaryLines } from "@/components/field/FinishProof";

describe("finishSummaryLines", () => {
  it("states measured/attested facts, never 'verified guest-ready'", () => {
    const lines = finishSummaryLines(
      { alkalinity: 100, ph: 7.4, calcium_hardness: 200, sanitizer_ppm: 3 } as never,
      { balanced: true } as never
    );
    expect(lines.join(" ")).toMatch(/marked balanced/i);
    expect(lines.join(" ").toLowerCase()).not.toContain("verified guest-ready");
  });
});
```

- [ ] **Step 2: Run test, verify it fails.**
- [ ] **Step 3: Implement `finishSummaryLines`** — emits "TA 100 as-found," "Tech marked balanced," etc.; never asserts the software verified anything.
- [ ] **Step 4: Run test, verify PASS.**
- [ ] **Step 5: Build `FinishProof.tsx`** — on finish: `lockTurnoverAction` then `submitTurnoverAction`; show the assembled proof summary (photos count, timestamps, chemistry, attestation) + a clear **"Send to homeowner / Done"** with a copyable share link (`recordProofShare`). Simplified send (no auto-send-unless-flagged yet); honest copy only.
- [ ] **Step 6: Quality gate + end-to-end manual run** — full turnover start→finish on a 390px viewport; proof record + shareable link exist; nothing overstates. Commit: `feat(field): finish + proof send (simple)`.

**Acceptance:** A turnover locks and produces a proof record + shareable link from the mobile flow; all finish copy is measured/attested, never overstated.

---

### Task 6: Quality-bar review gate (founder, local)

- [ ] **Step 1:** Ensure the local dev server serves `/field/today` (document the exact command + the LAN-IP-on-phone option in the PR description so the founder can open it on a real phone).
- [ ] **Step 2:** Founder runs a real turnover end-to-end on his phone. **Gate:** does he want to use it again? (Spec §8.) Only on "yes" do we unfreeze the rest of the roadmap.

---

## Self-Review

**Spec coverage:** shell/nav → T1; Today prep brief → T2; camera-anchored resumable capture → T3; chemistry record-only (strip+reagent, no keyboard) → T4; proof + simple send + honest-evidence rules → T5; local review + quality-bar gate → T6; "Water" visual foundation → T1 tokens + built to mockup in T2/T4. Deferred items (ops modules, reporting, full guardrail, dosing, offline) intentionally absent. ✔

**Placeholder scan:** no TBD/TODO; each task ends with a testable deliverable and a commit. UI screens are specified by component API + build-to-mockup acceptance rather than pre-written JSX (correct altitude for design-driven UI); all *logic* steps carry real test code. ✔

**Type consistency:** `TodayCard`/`buildTodayCards`, `fieldRangeStatus`, `finishSummaryLines`, and reused action/lib names match `src/lib/*` as read on 2026-07-21. ✔
