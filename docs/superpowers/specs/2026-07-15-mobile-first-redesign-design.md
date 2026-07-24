# TrackTub mobile-first redesign — design spec

**Date:** 2026-07-15
**Status:** Design approved by founder (brainstorm session 2026-07-15); ready for decomposition into epic + build.
**Author:** Manager agent, from a live grill of the founder (who is also the target user: property manager + hot-tub tech doing STR turnovers).
**Owns:** *what the screens are and how you move through them* (structure + workflow). Visual skin is intentionally out of scope here — it comes from a Figma / AI mockup that hangs on this structure.

---

## 1. Why this exists — the reframe

The current app is a **desktop "operations console" you read**. Evidence: rendered at a 390px phone width, the dashboard clips horizontally — the top nav runs off the right edge (no hamburger, no tab bar), status badges are sliced off, the primary "+ Add" button is cut in half, and content sits in a centered desktop container leaving huge dead vertical space. It "looks fine but generic" on a monitor and *wrong* on a phone.

But the job is a **field job**: standing at a tub, outdoors, phone in one hand (often no hands), ~60 seconds of attention. The redesign turns TrackTub into a **field tool you operate one-handed, camera-first**.

Two founder constraints drive every decision below:

1. **"The phone gets in the way when you need two hands."** You work the cover/top hands-on; the phone can't be a form you tap through mid-work.
2. **"Nobody likes data entry — it causes issues down the road."** The camera is the primary input; typing is the exception.

Everything else follows from these two.

## 2. Direction (decided)

- **Platform:** Mobile-first **web / PWA** on the existing Next.js stack. Add-to-home-screen; feels native; no App Store. Native iOS/Android is a *possible fast-follow*, not now — the current pain is "never designed for a phone," not "missing native camera/offline."
- **Desktop:** Still works (responsive up), but is the *secondary* form factor — a back-office/reporting view, not the design target.
- **Design source split:** This spec owns structure + workflow. A Figma / AI mockup owns the visual skin (typography, color, density), constrained by [[founder-aesthetic-preferences]] (no techy-mono, no playful-rounded, no gradient-hue backgrounds; dark-first, Inter + JetBrains Mono, real brand colors).

## 3. Navigation — kill the clipping top nav

Replace the overflowing desktop top nav with a **bottom tab bar** (thumb-reachable, 4 tabs):

| Tab | Purpose |
|-----|---------|
| **Today** | The prep brief — what needs doing, per tub, right now. Default landing. |
| **Tubs** | The list of properties/tubs; drill into one for its history + detail. |
| **History** | All turnovers across tubs; the searchable record + entry point to reports. |
| **More** | Back-office: schedule, supplies, equipment, team, settings. Out of the field path. |

A persistent, prominent **"Start turnover"** action (FAB or center-dock) is always reachable — it is the app's primary verb and must never be buried.

**The operations modules survive but move to "More."** They are back-office, not field. They are *not* redesigned for the phone in this epic beyond fitting the shell (no horizontal clipping); a later pass can make them phone-native if usage warrants.

## 4. "Today" — a prep brief, not a status board

Today opens on **what you need to know before you touch anything**, per tub — not a green/red status grid.

Each tub renders a **"next visit" card** whose lead content is its **prep list**, merged from three sources:

1. **Carryover** — items you flagged during/after the last visit ("scrub the headrests," "filter looking cloudy"). Captured as an optional chip/note at finish (see §7), surfaced here next time.
2. **Recurring cadence** — schedule-driven items the app already tracks ("filter deep-soak — due, every 4th turnover"). Sourced from the existing maintenance/schedule data.
3. **Trend-inferred** — derived from chemistry/water history ("water ~5 months old + TA climbing → drain/refill soon"). Suggestion only, clearly labeled as inferred.

Status (guest-ready / needs attention) is present but **secondary** to the to-dos. Guest/booking context is **not** a driver (founder explicitly deprioritized it).

## 5. The turnover — a camera-anchored flow, not a form

The turnover is **three photo anchors with hands-free gaps between them**, not a multi-field form. The app holds the turnover **open** the entire time — **no timeout, fully resumable** if the phone goes back in a pocket mid-work.

```
[Start turnover]
   │  glance at prep card
   ▼
 ① BEFORE photo (full-frame)     ── then: work the cover/top (phone away) ──
   ▼
 ② TEST-STRIP photo  +  tap readings on preset pad
      (TA → pH → hardness → sanitizer)   ── then: keep working (phone away) ──
   ▼
 ③ AFTER photos (water level · full-frame · cover  + optional extras)
   ▼
 Finish → proof generated (see §8)
```

Design requirements for the capture flow:

- **Resumable & durable.** State persists locally the moment anything is captured; closing the app, locking the phone, or losing signal must not lose the in-progress turnover. It is resumable from Today ("Resume turnover — Pine Chalet").
- **Big thumb targets, minimal chrome.** Each anchor is a full-screen, one-primary-action step. No dense forms.
- **Photo capture tolerates retake.** A quick, obvious re-take; the app should make a blurry/dark shot easy to notice and redo (this feeds the guardrail, §8).
- **The photo set** matches the founder-decided set: 1 before (full-frame) + 3 after (water level / full-frame / cover) + optional extras. See [[turnover-capture-redesign]].

## 6. Chemistry — photo + tap (never keyboard)

Chemistry capture is **strip photo + a few taps**, decided over "photo only" and "photo + app auto-reads":

- **Snap the test strip** → the photo is durable evidence (a photo of the actual strip beats a typed number in a dispute).
- **Tap the readings** on a **chunky preset pad** — common values / big +/- steppers for **TA, pH, hardness, sanitizer**, in that order. **No keyboard.**
- Numbers are kept (not photo-only) specifically to preserve **trend charts** and the **trend-inferred prep suggestions** (§4.3). Those cannot exist without numeric history.

Chemistry data model is unchanged from the landed model — see [[chemistry-capture-model]]: record the **as-found reading** + **treatments added** (chips + optional free text) + a **"balanced" attestation** — *not* a post-balance re-reading. Order TA → pH → hardness → sanitizer per [[turnover-capture-redesign]].

> Future option, explicitly deferred: auto-reading pad colors off the strip photo into numbers. Attractive but only worth building once the pad-color matching is reliable; not in this epic.

## 7. Optional issues / complaints layer

Reports want an "issues" dimension (founder raised gas/heater problems, guest complaints), but these must **never become a mandatory field** — that violates the no-data-entry principle.

- Capture as an **optional tap-a-chip** at finish: e.g. `guest complaint`, `equipment issue`, `gas/heater`, plus a quick optional note **only if you want one**.
- Tapped only when something actually happened; skipped otherwise with zero friction.
- Feeds an "issues" report dimension (§9) for free — reports include it when present, omit it when absent.

## 8. Proof + the flagged guardrail

On **Finish**, the app assembles the proof (photos + server timestamps + chemistry + attestation + any issue chips) and **auto-sends it to the homeowner/client** — hands-off by default.

**It holds for review only when it catches something worth stopping for:**

- a photo that reads as **blurry / too dark**,
- a **required photo missing**,
- a chemistry value **out of safe range**.

Plus a short **"sent — undo" window** (~30–60s) on every send, so a good-but-imperfect one can be pulled back without a formal gate. Everything files into the record regardless, so it is available later for a guest-damage dispute even if never actively sent.

### 8a. Guardrail ethics (non-negotiable — build these in)

The product is *dispute-grade evidence*. The guardrail exists to make evidence **more honest**, never to dress it up. A build agent must not cut these corners:

1. **It surfaces, never fabricates.** Flags a problem and asks the tech to fix or acknowledge it. It must **never** auto-fill a missing value, "correct" a reading, or silently pass junk to look clean.
2. **Ranges are real, not invented.** "Out of range" is a safety-adjacent claim; thresholds come from **documented spa-water standards with citations in the code/spec**, not made-up numbers. If we can't stand behind a threshold, we don't flag on it.
3. **The flag — and any override — is part of the record.** If the tech is flagged and sends anyway ("it's just steam on the lens"), that acknowledgment is **logged honestly**. An auditor can see it was flagged *and* consciously overridden. That integrity is what makes it hold up rather than look doctored.
4. **It never overstates.** The document reports what was **measured and attested** ("tech marked balanced," "TA 120 as-found"), never "verified guest-ready" as if the software vouched for the water. The tech attests; the app timestamps and preserves.

## 9. Reporting & export

The founder wants **multiple varied reports across different aspects of the service** — but refuses to pay for them in data entry. The reconciliation, and the governing rule of this section:

> **Reports are flexible *views* over data already captured. We never add a data-entry field solely to enable a report.**

A report may slice by property, date, chemistry, flags, or issues — but only over what the camera-first flow already produced. Dimensions not worth a field in the field (gas / complaints) live as optional chips (§7) and simply appear in reports when present.

**v1 report types** (flexible views, **not** a drag-and-drop report builder — that is a deferred rabbit hole):

1. **Single turnover** — the dispute-grade proof for one service: photos, server timestamps, chemistry, treatments, attestation, any flags/overrides, any issue chips.
2. **Per-property** — date-range rollup for one tub (all turnovers + chemistry trend + issues) to hand a homeowner.
3. **Whole-account** — portfolio summary across all tubs for a period (back-office / billing artifact).

Built on an **extensible report architecture** so adding a report type later is cheap. Every report is **view-as-PDF**, with the standard export set: **Print · Email · Copy shareable link** (reuse the existing token-based proof links) **· Download.** The PDF makes evidence portable for a dispute — hand an insurer a clean document, not a login.

## 10. Scope boundaries

**In scope (this epic):**
- Mobile-first PWA shell + bottom-tab nav (§3)
- Today prep brief (§4)
- Camera-anchored, resumable capture flow (§5)
- Chemistry photo + tap pad (§6) + optional issues chips (§7)
- Proof + auto-send-unless-flagged guardrail with the §8a ethics (§8)
- Reporting & export: 3 report types, PDF/print/email/share, extensible (§9)

**Explicitly out / deferred:**
- Native iOS/Android app (fast-follow if offline/push become dealbreakers)
- Phone-native redesign of the operations back-office modules (they fit the shell only)
- Strip-photo auto-reading (color→number OCR)
- A full custom report builder
- Guest-facing proof view (founder deprioritized)

## 11. Open questions (not blocking the spec; resolve during build)

1. **Cleaner / team-member experience.** The founder is the primary user, but the app has team members (see [[phase2-team-chemistry-epic]]). Does a cleaner get the same camera-first flow with a reduced prep brief, or a stripped variant? Grill before building the Today/capture screens for non-owners.
2. **Offline at a dead-zone tub.** Capture must be resumable (§5); the harder question is whether photos + a queued proof must fully **sync later from zero signal**. PWA can do this (service worker + queue) but it is real work — confirm how often tubs are in true dead zones before committing to full offline sync vs. "resume when back in range."
3. **Chemistry safe-range source.** Which published spa-water standard do we cite for the §8a.2 thresholds? Pick one authoritative source before the guardrail ships.
4. **Send channel.** "Email the homeowner" — is that a plain email with a link/PDF, or also SMS? What does the homeowner receive today vs. what we want.

## 12. Decomposition (→ epic + sub-issues)

1. **Mobile shell + PWA + bottom-tab nav** — the foundation; fixes the clipping nav; add-to-home-screen. Everything else sits on this.
2. **"Today" prep brief** — per-tub next-visit cards; merge the 3 prep sources.
3. **Camera-first capture flow** — three anchors, resumable, no-timeout, durable local state. *The heart of the redesign.*
4. **Chemistry: photo + tap pad** (+ optional issues chips).
5. **Proof + auto-send-unless-flagged guardrail** — with the §8a ethics written into the implementation, not bolted on.
6. **Reporting & export** — 3 report types, PDF/print/email/share, extensible architecture.

A build agent implements each as a reviewable slice (worktree → PR → CI → self-merge), in roughly this order (1 → 3 are the critical path; 6 can parallelize once the data from 3–5 exists).
