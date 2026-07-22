# TrackTub Core Flow Rebuild — design spec

**Date:** 2026-07-21
**Status:** Design approved by founder (session 2026-07-21). Ready for implementation plan + build.
**Author:** Manager agent, from a live session with the founder (who is also the target user: property manager + hot-tub tech doing STR turnovers).
**Relationship to prior spec:** This **narrows and supersedes the build approach** of `2026-07-15-mobile-first-redesign-design.md`. That spec's *product vision* (mobile-first, camera-first, guardrail ethics, reporting) still stands as the north star. This spec changes **what we build first and how we build it**, in response to a blunt founder verdict: *he, the end user, has no interest in using the current app.*

---

## 1. Why this exists — the founder verdict

The founder used a competitor consumer app, **TubTest** (Steven Heller, iOS — free, 4.9★), and it crystallized the problem: *"That app has good functionality, a good layout, and good operations. Our app does not. I have no interest in using our current app."*

He is the target user. If he won't use it, nothing else matters. This is not a polish problem — it is a **how-we-build** problem.

### 1a. Diagnosis — why the current app is not good

1. **We built *modules*, not a *job*.** Maintenance, Supplies, Equipment, Schedule, Turnover each shipped as an isolated screen, built by different agents each optimizing to *close an issue*. **No one ever owned "is the whole thing coherent and pleasant end-to-end."** The result is a pile of admin panels, not a tool.
2. **Wrong paradigm.** It is a desktop *operations console* — sidebar, dense tables, forms — for a one-handed, ~60-second, outdoor, phone task. Ported to mobile it still *feels* like an admin panel.
3. **Every feature is a form you fill in.** The app makes you *manufacture data up front* before it gives value back. TubTest is the inverse: near-zero setup, it **guides you through the one real task and the record falls out of it.** This is the founder's "I don't like how the functionality is created in the first place" complaint, precisely.
4. **No opinionated spine.** TubTest marches you through one task excellently and tells you *what to do right now*. Ours scatters you across surfaces with no guided path.

### 1b. What we take from TubTest (and what we don't)

- **Take:** the *feel* — one opinionated, guided flow that produces its own data; good layout; low-friction operation.
- **Do NOT take:** its scope or model. TubTest is a single-owner, single-tub, local-only personal assistant with **no proof / timestamps / client reporting / multi-property**. TrackTub's job is unchanged: **dispute-grade B2B evidence.** TubTest is a UX reference, not a product blueprint.

## 2. Direction (decided)

**Same job, rebuilt right.** Keep the core job — dispute-grade turnover proof + chemistry record — and rebuild the *experience* from scratch as a guided, mobile-first flow that a field tech would actually reach for. This **replaces** the console paradigm for the core flow; it is not a reskin of it.

## 3. The build-method change — the real fix (non-negotiable)

The method that produced the Frankenstein was: decompose into many modules, build them in parallel, each to "issue closed." We do **not** repeat it.

> **Build ONE opinionated vertical slice — the turnover flow — start to finish, owned as a single coherent experience, to genuine "I'd actually use this" quality. Ship nothing else until it clears that bar.**

- The slice is owned end-to-end (one plan, one coherent review), **not** split across 6 parallel module-issues.
- The finished slice becomes the **quality bar**. Every later screen must clear the bar this demo sets before it is built.
- **Everything else is frozen** until the founder holds the slice and says it feels right: supplies, equipment, schedule, multi-property reporting, team/cleaner variants, dosing math, offline sync.

## 4. The demo slice — what lands in the founder's hands

Reviewed **locally** (same setup as the current `tt-up` / `localhost:3001` demo — no preview-auth wrinkle). Built on the **real stack** (Next.js + Supabase), reusing the working turnover/chemistry backend, as a **new, separate mobile front-end** — *not* layered onto the console code.

The flow:

1. **Today** — a short "what needs doing" brief, per tub. Not a green/red status grid. Lead content is the to-dos for the next visit. (Prep-source merging from the 2026-07-15 spec §4 is a *later* enrichment; the demo can start with a simple per-tub next-visit card.)
2. **Start turnover** — one prominent, always-reachable action. The app's primary verb.
3. **Guided capture** — a camera-anchored flow, **not a form**:
   - **Before photo** (full-frame) → then hands-free (work the cover/top, phone away).
   - **Chemistry** (see §5) → then hands-free.
   - **After photos** (water level · full-frame · cover + optional extras).
   - **Resumable & durable:** state persists locally the moment anything is captured; locking the phone or losing signal mid-job must not lose the turnover. Resumable from Today ("Resume turnover — Pine Chalet"). **No timeout.**
   - **Big thumb targets, minimal chrome;** each anchor is a full-screen, one-primary-action step; quick, obvious photo retake.
4. **Proof** — photos + server timestamps + chemistry assembled into the record. For the demo, sending is **simplified to a clear "send / done"** — the full *auto-send-unless-flagged* guardrail (2026-07-15 spec §8) comes **after** the flow feels right. The **honest-evidence rules still hold**: never fabricates a value, never overstates ("tech marked balanced," not "verified guest-ready").

## 5. Chemistry — record-only, done well

Decided: **record-only** (no dosing engine, no reagent-by-reagent coaching — both deferred). The founder tests with **both** strips and a Taylor/reagent kit depending on accuracy needs, so capture must serve both:

- **Snap the strip** (or a photo of the reagent-kit result) → durable photo evidence.
- **Tap the readings** on a chunky preset pad — TA → pH → hardness → sanitizer, in that order. **No keyboard.** Works whether the numbers came from a strip or a titration.
- Record **treatments added** (chips + optional free-text) and a **"balanced" attestation** — the as-found + treatments + attestation model, unchanged from [[chemistry-capture-model]]. **Not** a post-balance re-reading.
- Numbers are kept (not photo-only) to preserve trend history for later.

Just make it a **fast, beautiful mobile flow.** Dosing recommendations and reagent coaching are explicitly out (future options).

## 5b. Visual design — a first-class part of this build (decided 2026-07-21)

**Correction to the deferral posture.** The 2026-07-15 spec punted the visual skin to "a Figma/AI mockup later." That was wrong: the founder (the user) named the *look* as a core reason he won't use the current app — its generic dark-SaaS console feel. So visual design is **owned inside this build**, not skinned on afterward, and the direction below is settled by founder sign-off (mockup: `claude.ai/code/artifact/25c55634` — the chemistry step built two ways, "Water" chosen).

**Direction: "Water" — calm, light, on-brand.** Reconciles what the founder liked in competitor **TubTest** (warm, calm, one-task-at-a-time, considered — *not* a techy dashboard) with TrackTub's real brand tokens (`branding/tokens.css`). It is **not** a brand departure: blue-on-light is TrackTub's default theme.

- **Palette (from `branding/tokens.css`):** light surfaces (white cards on a soft blue-grey ground, `#F4F6F9`); **brand blue `#3B82F6` / `#2563EB`** ("the water") drives all actions — primary button, selected value, links, active progress; **green `#34D399` reserved strictly for verified/in-range status** (never an action or decoration — brand rule); ink `#08090A` on white = the record. Amber `#E8A33D` = pending/cloudy, red `#EF4444` = urgent, per existing semantic tokens.
- **Type:** body **Inter**; data/units **JetBrains Mono** — both from brand. **Plus one proposed addition: an editorial serif** (Palatino/Iowan system stack on the founder's Apple devices) for **display numbers and card titles** — this is a large part of why the direction reads "considered" rather than techy. *Open sub-decision:* if the founder prefers strict brand type, the big readouts flip to JetBrains Mono (reads more "receipt/evidence"). Default = serif until he says otherwise; trivial to swap.
- **Structure (TubTest-derived, applies to every screen):** one task per screen; one large readout; fat thumb targets (chunky preset pad + big ± steppers, no keyboard); a **single status pill**, not a data wall; step progress ("Step 1 of 4", the TA→pH→hardness→sanitizer sequence); generous but restrained card radius (~16–20px — softer than the token's 12px sharp default, but not pillowy, honoring "minimal/sharp").
- **This is the quality bar.** The chemistry mockup is the reference every screen in the flow must match. "Looks generic / like the old console" is a valid reason to reject a build slice.

## 6. Scope boundaries

**In scope (this build):**
- The "Water" visual foundation (§5b) — palette, type, component structure — established as the shared design system for the flow, not skinned on afterward.
- New mobile-first front-end shell for the core flow (bottom-reachable primary action; no horizontal clipping).
- Today: simple per-tub next-visit card.
- Guided, resumable, no-timeout camera-anchored turnover capture (§4.3).
- Chemistry record-only, strip *and* reagent, tap-pad, no keyboard (§5).
- Proof assembly + simple "send / done" with honest-evidence rules intact.
- Delivered for **local** review on the real stack, beside the existing app.

**Explicitly out / deferred (frozen until the slice clears the bar):**
- Operations modules (supplies, equipment, schedule) redesign.
- Multi-property reporting / PDF export.
- Full auto-send-unless-flagged guardrail + flag/override logging.
- Team/cleaner reduced variants.
- Offline-from-dead-zone full sync.
- Chemistry dosing math and reagent-by-reagent coaching.
- Retiring / hiding the current app (keep it running, admin-gated, beside the new flow; retire only once the new flow clears the bar).

## 7. Coexistence with the current app

The current app stays live and admin-gated; the new flow is built **alongside** it (new routes / new front-end), not by mutating the console screens. This keeps risk low and lets us diff the two directly. No schema changes are anticipated for the demo (reuses existing turnover/chemistry tables); if any surface, follow the shared-DB schema-change rule in `CLAUDE.md` (additive-only via MCP; flag shared-object changes to the founder first).

## 8. Success criteria

The slice is done when the **founder picks up his phone, runs a real turnover start-to-finish, and wants to use it again** — not when the issues are closed. That judgment is the gate for unfreezing the rest of the roadmap.

## 9. Open questions (resolve during build, not blocking)

1. **Local mobile review mechanism.** Founder reviews locally; confirm how he opens the mobile UI on an actual phone (LAN IP to the dev server vs. narrow-window desktop) so the "feel" is judged on a real device.
2. **"Today" prep sources.** Demo starts with a simple next-visit card; when do we layer in the carryover / cadence / trend-inferred merge (2026-07-15 spec §4)?
3. **Proof send channel** for the simplified demo send — what does the recipient actually get (link, PDF, nothing yet)?

## 10. Next step

Turn this into an implementation plan (writing-plans), then surface it as a single owned build (one epic / tightly-sequenced issues — **not** 6 parallel module-issues) for a build agent to implement via the worktree → PR → CI → self-merge flow.
