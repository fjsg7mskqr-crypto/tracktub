# TrackTub — Product Requirements Document

> **Status:** Draft v0.4 — v1 built, demo-stage (synthesis + lean ship-to-learn + freemium)
> **Owner:** Ethan Novak (ethan@nhs-llc.com)
> **Last updated:** 2026-06-13
> **Audience:** Internal shared source of truth for the founder **and** the AI agent(s) building this. Not a customer handout. The *product's* goal is to earn attention from real STR operators; *this document's* goal is to keep us aligned on what we are building and why.

## How to read this document

Every substantive claim is tagged so we never confuse belief with fact:

- **`[Decision]`** — a fork we have deliberately resolved (see the Decision Log, Appendix A).
- **`[Hypothesis]`** — a belief we have **not** validated with primary research. Treat as a bet to test, not a fact.
- **`[Validated]`** — backed by logged interviews or pilot data.

> ⚠️ **Reality check:** As of 2026-06-13 there are still **zero `[Validated]` claims.** `interview-log.csv` is header-only; no interviews have been run. Effectively the entire problem and market thesis below is `[Hypothesis]`. **Build status note:** v1 (and several fast-follows) is now *built* and running as a demo (see §8.0 "Shipped"), but **building is not validating** — code shipping ahead of the interview round is a deliberate build-first bet, not evidence the thesis is right. Our validation method (§12) remains **lean ship-to-learn**: a short interview round (with a **recruitment gate**), then real usage of the MVP either confirms the thesis or kills it (§12 gate). Note the deliberate trade — this path tests **use**, not **willingness-to-pay** (§17 R3). Do not let the polish of this document — or the existence of working code — create false confidence.

---

## 1. TL;DR

TrackTub helps **self-managed short-term-rental (STR) hosts** know their hot tub was **guest-ready — without being there**, starting with the highest-friction, highest-liability amenity: the **hot tub**. The "dispute-grade evidence" it produces is the reassurance underneath — how a host settles an owner or guest question — not the opening pitch. Operators and their cleaning staff capture a guided photo set per turnover through a no-install PWA; TrackTub wraps it in tamper-resistant proof (server timestamp, verified submitter, capture-time geolocation + geofence, immutable record, audit log, signed PDF). Property owners get a read-only portal; guests/Airbnb get a shareable verifiable link. A light **chemistry-aware layer** (bather-load reminders, water-clarity flags) rides on the photos staff already capture — turning proof into prevention. The hot tub is the **wedge**; the long-term vision is a **whole-property Proof OS for STR turnovers** that eventually covers the biggest dispute category of all — check-in/check-out condition, damage, and security deposits.

Go-to-market is **freemium** (free for 1 property, paid at 2+). Validation is **lean ship-to-learn**: a short interview round, then a *thin free MVP* (guided capture + operator cockpit) whose real usage is the test — proceed only if it activates and the capture habit sticks (§12).

---

## 2. Problem statement

`[Hypothesis]` STR operators and property managers who run multiple properties with hot tubs have **no trustworthy, centralized record** that a tub was safe and guest-ready at check-in. Today the "proof" is scattered across camera rolls, group chats, and memory. When an owner or guest disputes cleanliness, safety, or damage, the operator has **nothing defensible** to point to.

Hypothesized pains (from `positioning.md`; **not yet confirmed by interviews**):

1. `[Hypothesis]` **No single view across properties** — photos live in camera rolls and chat, never aggregated.
2. `[Hypothesis]` **No structured staff handoff** — cleaners lack a clear SOP at the property; turnovers are inconsistent.
3. `[Hypothesis]` **No dispute evidence** — when a guest claims the tub was dirty/broken, or an owner blames the operator, there is no timestamped record.

The single sharpest framing: **the tub is the operator's smallest amenity but one of their largest liabilities** (health/safety risk + a common guest complaint + a recurring owner friction point).

> **Note on `pain-points-AI.md`:** That file contains direct, AI-scraped Reddit pain points from **real hot-tub owners** (water chemistry, hardware diagnostics) — the **only primary customer-voice evidence in the repo.** `[Decision]` We are still **not** building a *consumer* app, but two of these pains (bather-load chemistry crash, rapid chlorine depletion) are **STR-transferable** and now seed the operator-facing chemistry-aware layer (§8.8). See Appendix B.

---

## 3. Who we serve

### Buyer / primary user — self-managed STR host
`[Decision 2026-06-11]` A **self-managed Airbnb/VRBO host** in a seasonal tourist market (mountain/coastal/lake), **1–5 properties**, at least one with a hot tub, who manages turnovers **themselves or with one cleaner**. Tracks nothing formally today. Wants **peace of mind first** (was it guest-ready?), **proof second** (can I show it?). Larger portfolios and spa-service companies need team/dispatch features — a **v2** expansion, not the v1 buyer.

### Submitter — the host themselves, or their cleaner
Often the host on a 1–5 property operation, or low-tech, high-churn, paid-per-turnover help. **Adoption is the existential risk** — if whoever does the turnover won't submit, nothing else matters. Implication: capture must be a sub-10-minute, no-install, guided flow.

### Recipient — property owner (the PM's client)
`[Decision]` Owners get a **read-only portal** to view their own properties' proof (a *fast-follow* after the thin MVP — §8.0). This is the "viewer" role anticipated in the `/goal` skill, realized.

### Recipient — guest / Airbnb resolution (no account)
Won't log into a portal mid-dispute. Served by a **shareable signed PDF + verifiable link**, not the portal.

---

## 4. What TrackTub is NOT (MVP)

- ❌ A generic home-maintenance app
- ❌ A *consumer* hot-tub hobby app `[Decision]` — **but** we DO surface **operator-facing** chemistry intelligence (bather-load, water-clarity) as a differentiator; see §5, §8.8, Appendix B
- ❌ AI-only categorization without human confirmation
- ❌ A full PMS, channel manager, or cleaner-scheduling marketplace
- ❌ A native mobile app (v1) — `[Decision]` PWA first; native is a vision-phase question

---

## 5. Differentiation & competitive landscape

`[Hypothesis]` The STR turnover-tooling market is established, and most players already do "photo checklist for a turnover":

| Competitor | What they do | The hot tub is… |
|---|---|---|
| **Breezeway** | Property operations + inspections (market leader) | one checkbox among dozens |
| **Properly** | Visual, photo-based turnover SOPs/checklists | one step in a generic checklist |
| **Turno** (formerly TurnoverBnB) | Cleaner scheduling + checklists | a line item |
| **Operto / Hostfully / Host Tools** | Ops + checklists bundled with a PMS | incidental |

**The risk:** a tub-specific *checklist* would simply be absorbed as a feature by these generalists.

**`[Decision]` Our wedge is not a checklist — it is the evidence layer.** Generalists produce *internal* checklists; they do **not** produce tamper-resistant, timestamped, geofenced, shareable **proof** designed to settle owner/guest disputes. That evidentiary quality — not the amenity — is the differentiator and the moat.

**Why start with hot tubs anyway:** highest liability-per-square-foot, most acute single-amenity dispute, credible niche to win before generalizing the evidence layer to the whole property.

**Second differentiation layer — chemistry-aware proof** `[Decision, gated]`: the generalists log *that* a turnover happened; they don't help the operator keep the water from crashing between guests. Using **consumer-validated pain** (bather-load chemistry crash, rapid chlorine depletion — Appendix B), TrackTub adds light, sensor-free intelligence (bather-load reminders, water-clarity flags) that turns the proof record into prevention. This is the synthesis that makes us more than a checklist *and* uses the only real evidence we have. **Gated** on a single Stage-1 interview question confirming STR operators feel this pain (§12). Details in §8.8.

---

## 6. Vision (2–3 years)

`[Decision]` **Hot tub proof is the wedge into a whole-property "Proof OS for STR turnovers."**

| Horizon | Scope |
|---|---|
| **Wedge (now)** | Dispute-grade hot-tub turnover proof |
| **Year 1** | Extend the evidence layer to other high-liability amenities: pools, saunas, fireplaces, etc. |
| **Years 2–3** | Full check-in/check-out **property condition proof** — damage and **security-deposit** disputes, the single biggest STR dispute category. "The evidence layer for every STR turnover." |

The capability (tamper-resistant, geofenced, shareable proof) is amenity-agnostic by design, so the data model and proof engine are built general from day one even though the **go-to-market stays hot-tub-narrow** until PMF. In parallel, the **chemistry-aware layer (§8.8) deepens *within* the wedge** — proof gets us in the door; preventing the water from crashing makes us sticky.

> **Naming risk** `[Hypothesis]`: "TrackTub" is perfect for the wedge and may constrain the whole-property vision. Revisit naming only if/when expansion past amenities is validated. Do not rename pre-PMF.

---

## 7. Product principles

1. **Proof over checklist.** Every feature should make the record more trustworthy or more useful in a dispute.
2. **AI suggests, human confirms.** `[Decision]` A machine is never the system of record by itself.
3. **Zero staff friction.** No install, no training, sub-10-minute guided capture, or staff won't use it.
4. **Validate with the thinnest shippable thing.** We learn from *real usage of a thin free MVP*, not stated preference or paid pilots. Caution: free usage proves *use*, not *willingness-to-pay* — so we bake a WTP probe into the free tier (§12). We also don't build *blind*: code starts only once ≥3 operators commit to onboarding (§12 pre-build gate).
5. **Don't expand scope until the gate is met.** No proof export, owner portal, AI, or chemistry build until the thin MVP clears its activation gate (§12, §16). *(2026-06-13: in practice this discipline was not held — the chemistry layer and other fast-follows were built ahead of the gate; see Appendix A D20. The principle still stands as the intended posture; the gate now governs go-to-market rather than code existence.)*

---

## 8. MVP scope

> Build order is sequenced in §13.

### 8.0 Scope phasing (shipped vs. fast-follow) `[Decision]`

> **Status update (2026-06-13):** the original plan was a *thin* free MVP (capture + cockpit + thin proof) with everything else gated on §12. In practice the build ran ahead of validation — v1 plus several planned fast-follows are now **built and demoable**. The table below reflects what is **actually on `main`** versus what is still genuinely unbuilt. The §12 gates still apply to the *go-to-market* decision (do we push paid, build heavy proof, etc.) even though the code exists.

| Shipped (v1, on `main`) | Fast-follow (still unbuilt) |
|---|---|
| 8.1 Turnover capture PWA — guided photo flow + chemistry water-check step | 8.2 *Heavy* proof: cryptographically signed PDF + geofence verification badge |
| 8.2 *Thin* proof primitives: server timestamp · immutable-after-submit · shareable read-only link (anon-accessible) | 8.4 Owner *portal* (read-only owner login + RLS-scoped views) |
| 8.3 Operator dashboard (the cockpit) | 8.5 AI assist (vision tag-suggest + completeness check) |
| Roles + invite-accept flow + **Team** page (coverage + activity) — owner/team collaboration | 8.6 *Real* email/cron reminder delivery (in-app ready notification is demo-stage, see §8.6) |
| 8.8 Chemistry-aware layer: water-check capture, bather-load reminders, water-clarity flags, trends | |
| Insights rebuild + `proof_event` tracking + PostHog instrumentation (see §16) | |

> **Demo-stage refinements (in progress, epic #113 — not yet on `main` as of 2026-06-13):** capture reordered to **before → chemistry → after**; in-app "turnover ready → host notified" signal; "cockpit"→**Dashboard** naming pass. These polish the shipped v1 for the founder dress-rehearsal demo; they do not change scope or strategy.

Why this once mattered: the thin MVP was meant to test the existential risk (will staff capture? do operators return?) **and a taste of the differentiator** (will operators *share* the proof link? — §12 wedge signal) for minimal build, deferring expensive proof and the owner portal until the §12 gate cleared. `[Decision D16]` Those validation gates are unchanged; the build simply moved faster than the validation.

### 8.1 Turnover capture (PWA) — *the staff experience* `[shipped]`
- No-install PWA opened from a link; staff authenticated and scoped to **assigned properties only**.
- **Guided photo flow**, minimum 4 shots `[Decision, from concierge guide]`: (1) wide tub area, (2) waterline / water clarity, (3) control panel / chemistry, (4) cover + filter. Photos are compressed client-side with a lightbox preview.
- **Chemistry water-check step** (shipped with §8.8): structured **water-readings** (pH / sanitizer / temp / clarity) captured inline and tied to the turnover — builds the chemistry dataset and powers the §8.8 flags/trends.
- Free-text notes (smells, panel errors, guest-reported issues) + **Urgent** flag.
- Staff assignment per property.
- Submit **locks** the turnover (immutable; see §8.2).
- Target: **submit in under 10 minutes.**

> **Demo-stage reorder (epic #113, in progress — not yet on `main`):** the flow is being resequenced to **① before photo (1 shot) → ② chemistry test → ③ after photos (guided wide / waterline / panel / cover) → ④ notes / urgent → submit**, with photos tagged `before` / `after`. This better matches the real turnover narrative for the founder demo; it refines the shipped flow above without changing scope.

### 8.2 Evidence / proof model — *the differentiator*
`[Decision]` Split by cost so v1 tests the wedge cheaply:

**Shipped — thin proof primitives `[shipped]`** (nearly free; this is what §12 measures):
- **Server-side timestamp** (never trust device clock).
- **Verified submitter identity** (who, which org, which property — comes with auth).
- **Immutable after submit** — photos/record locked; corrections create new versions; append-only change log.
- **Shareable read-only link** — a public, anon-accessible URL (`/proof/[token]`) to the turnover (photos + server time + submitter), no login, no signed PDF yet. The seed of the differentiator and the thing we measure (share rate, §12).

**Fast-follow — heavy proof `[fast-follow]`** (expensive; build only after the gate):
- **Capture-time geolocation + geofence** ("taken at the property") via the browser Geolocation API, stamped server-side. `[Decision]` We do **not** read photo EXIF (PWAs strip it; our captured metadata is more tamper-resistant).
- **Cryptographically signed PDF** + a **"Verified by TrackTub" integrity badge** on the link.

> `[Decision]` Even the fast-follow stays **"medium evidence"** — credible enough to settle ~95% of disputes, *without* full legal chain-of-custody (cryptographic content-addressing / notarization), a vision-phase item only if a real legal case demands it.

### 8.3 Operator dashboard — *the cockpit* `[shipped]`
Per property: last turnover date + who submitted, photo galleries with tags, open issues (`water_cloudy`, `cover_damage`, …), tasks, recurring-maintenance due, alerts (urgent flags, failed geofence, overdue turnover).

### 8.4 Owner portal — *read-only* `[fast-follow]`
`[Decision]` Owners log in and see **only their own properties'** turnovers and proof, anytime. Invite flow + RLS-scoped.

> **Shipped adjacent — team collaboration `[shipped]`:** the underlying **roles + invite-accept flow** and a **Team page** (per-property coverage + recent activity) are built and on `main`. This is operator/staff collaboration; the dedicated **read-only owner portal** above (owner login + owner-scoped views) is still the unbuilt fast-follow.

### 8.5 AI assist — *supporting, bounded* `[fast-follow]`
`[Decision]` Server-side vision model that:
- **Suggests issue tags** on photos (`water_cloudy`, `cover_damage`, …) → **human must confirm.**
- **Checks photo completeness** ("missing the cover shot") to guide staff and strengthen the record.
- *(Optional)* **drafts the owner-summary text** for human review.
- Hard rule: **never auto-only; never the system of record alone.**

### 8.6 Recurring tasks + reminders `[fast-follow]`
`[Decision, from roadmap]` Recurring maintenance tasks + **email reminders** via Supabase **cron / edge functions** (e.g., "filter change due," "turnover not logged before today's check-in"). **Real email/cron delivery remains unbuilt fast-follow.**

> **Shipped/demo-stage:** chemistry-driven **bather-load reminders** and **water-clarity flags** surface in-app today (§8.8). An in-app **"turnover ready → host notified"** signal on the Dashboard is a demo-stage refinement in progress (epic #113); the email is stubbed/logged locally for the demo — real send still belongs to the fast-follow above.

### 8.7 Landing page `[shipped]`
STR-focused marketing site: positioning headline, benefit bullets, "human-confirmed" trust line, **paid-tier waitlist capture**. SEO per `marketing-reference.md`. **Track free signups → activation → 2nd-property/paid intent.** Shipped and live (public `/landing`, relaunched on the self-managed-host ICP); the sign-in surface is intentionally gated during this pre-launch demo phase.

### 8.8 Chemistry-aware layer (light) — *the synthesis differentiator* `[shipped]`
`[Decision, gated → built]` Rides on data we already capture — no sensors, no hardware. **Built and on `main`** (water-check capture + bather-load reminders + clarity flags + trends); note this shipped *ahead* of the §12 `chem_pain` bridge question, so the differentiator is built but its STR demand is still unvalidated (§17 R10):
- **Bather-load reminder:** back-to-back / high-occupancy stays trigger a "shock the tub before next check-in" prompt (uses turnover cadence, not chemistry sensors).
- **Water-clarity flag:** the AI's `water_cloudy` suggestion (§8.5) surfaces as an open issue with a recommended action before check-in.
- **Chemistry trend log:** the optional water-readings (§8.1) accumulate per property for simple trend views.

> **Gate:** committed to *positioning* now (§5); *built* only after Stage-1 interviews confirm operators feel the water-crash pain (§12 bridge question). Heavier predictive treatment calculators / hardware diagnostics = vision-phase, not v1. Pain source: **real consumer evidence** in Appendix B.

---

## 9. Roles & permissions

`[Decision]` Three roles, all RLS-enforced at the org/property level:

| Role | Sees | Can do |
|---|---|---|
| **Operator / PM** (org admin) | All org properties | Manage properties, staff, owners, billing; confirm tags; generate/share proof |
| **Staff / cleaner** | **Assigned properties only** | Submit turnovers (photos, notes, urgent flag) |
| **Owner** (viewer) | **Their own properties only**, read-only | View turnovers + proof |

**Security baseline (`/goal` standard):** RLS per org; staff see assigned properties only; **audit log for all tag changes**; env-based secrets; structured logging + error boundaries.

---

## 10. Data model (sketch)

```
org              (id, name, plan, billing_ref)
user             (id, email, ...)
membership       (user_id, org_id, role: operator|staff|owner)
property         (id, org_id, name, address, lat, lng, geofence_radius_m, tub_notes)
property_owner   (property_id, owner_user_id)          -- owner portal scoping
staff_assignment (property_id, staff_user_id)
turnover         (id, property_id, submitter_id, submitted_at_server,
                  capture_lat, capture_lng, geofence_ok, urgent, notes,
                  status: draft|submitted_locked, version)
photo            (id, turnover_id, storage_path, slot: wide|waterline|panel|cover,
                  captured_at, ai_suggested_tags[], confirmed_tags[])
issue_tag        (id, turnover_id, tag, source: ai|human, confirmed_by, confirmed_at)
task             (id, property_id, title, due_at, recurrence, status)
audit_log        (id, org_id, entity, entity_id, action, actor_id, at, diff)  -- append-only
proof_export     (id, turnover_id, pdf_path, verify_token, signed_at)
```

> Built **amenity-general** (a `turnover` isn't tub-specific) so the whole-property vision needs schema *extension*, not rewrite.

---

## 11. Technical architecture

`[Decision, from /goal standard]`
- **Monorepo:** `apps/web` (Next.js, PWA), `packages/shared`, `supabase/` (migrations + RLS).
- **Backend:** Supabase — Postgres + Auth + Storage + Row-Level Security + Edge Functions + Cron.
- **Capture:** PWA; browser **Geolocation API** for capture-time coordinates; server-side timestamping + signing.
- **AI:** server-side vision inference; suggestions persisted separately from confirmed tags.
- **Observability:** structured logs, error boundaries, env-based secrets.

---

## 12. Validation plan & go/no-go gates

`[Decision]` We validate by **shipping a thin free MVP and watching real usage** — *not* paid concierge pilots (dropped 2026-06-04, D13). Trade accepted: faster + real behavior, but it tests *use*, not *willingness-to-pay* (mitigated below).

### Stage 1 — A short interview round (target ~10–15)
Use `interview-script.md`. Recruit per `interview-recruitment.md` (LinkedIn, FB STR groups, BiggerPockets, PM companies, hot-tub service techs). **Never** cold-contact via Airbnb guest messaging / listing scraping. Log every contact in `interview-log.csv`. Purpose: confirm the pain is real **and recruit the first cohort** for the free MVP.

**Pre-build gate — recruitment commitment `[Decision]`:** write **no code** until **≥3 of ~5 operators commit** to onboarding their staff — a **start date + staff contacts handed over**. This is a *behavioral* gate, not stated pain (which we distrust). If you can't fill the cohort for a **free** tool, the pain is too low or you can't reach the buyer — **stop and rethink buyer/positioning before building.**

> **Synthesis bridge question:** *"After a busy weekend of guests, does the tub water go cloudy or lose sanitizer before the next check-in? What do you do today?"* Tag `chem_pain`. **≥40% `chem_pain` promotes the chemistry-aware layer (§8.8) from gated to committed.**

### Stage 2 — Ship the thin free MVP, measure real usage `[Decision]`
Recruit ~5 operators from Stage 1 onto the free MVP (capture + cockpit, §8.0). Onboard their staff. Watch behavior.

**Primary gate — activation:**

| Signal | Threshold | Action |
|---|---|---|
| Invited operators completing ≥1 **full 4-photo turnover in week 1** | **≥60%** | proceed to retention check |
| | 30–60% | fix onboarding/flow friction; re-measure |
| | <30% | capture habit failing — rethink flow or buyer before more build |

**Secondary gate — retention `[recommended]`:** of the activated operators, **≥50% still submitting in weeks 2–3, unprompted.** Activation without retention is the classic logging-app trap; clear *both* before building the heavy-proof / portal / chemistry fast-follows.

**Wedge signal — proof-link share rate `[Hypothesis]`:** of completed turnovers, **≥~30% get their proof link shared** by the operator, and shared links get **opened** by recipients. This is the early read on the *differentiator* — whether operators reach for proof, not just convenience. Near-zero share is a warning that "proof" isn't the pull; revisit positioning (§5) before building the heavy proof stack.

**WTP probe (mitigates the freemium blind spot):** instrument an *"add a 2nd property → see pricing / join paid waitlist"* fake-door. Track how many activated operators hit it — the only payment signal this path produces before a real paywall ships.

**Kill / pivot:** activation <30% across two onboarding iterations, or near-zero retention → the capture thesis is wrong for this buyer; revisit buyer/flow before spending more.

---

## 13. Build sequencing

**Thin MVP (v1) — ✅ DONE (built ahead of the §12 recruitment gate; gate still governs go-to-market):**

1. ✅ **Scaffold** Next.js + Supabase monorepo: org / property / turnover schema + **RLS**.
2. ✅ **Turnover capture PWA**: guided 4-photo flow, upload, notes, urgent flag, staff assignment, server timestamp, immutable-after-submit, append-only change log.
3. ✅ **Operator cockpit**: per-property status, last visit, galleries, open issues, alerts.
4. ✅ **Thin proof primitives**: shareable read-only proof link (the v1 taste of the wedge), anon-accessible.
5. ✅ **Free-tier gating + analytics**: instrumentation for activation, retention, **proof-share + recipient-open** (`proof_event` + PostHog, no-op until key set); WTP fake-door is the remaining piece to wire.

→ Original plan: **ship to ~5 operators and hold here until the §12 gates clear.** In practice the build continued into the fast-follows below before the cohort/interviews ran — so the **§12 gates now govern the go-to-market decision (paid push, further investment), not whether the code exists.**

**Fast-follow:**

6. ⏳ **Heavy proof** — *pending*: capture-time geolocation + geofence, cryptographically signed PDF + "Verified by TrackTub" badge.
7. ⏳ **Owner portal** (read-only, RLS-scoped) — *pending*; the **roles + invite-accept flow + Team page are ✅ shipped** (operator/staff collaboration), the owner-login portal itself is not.
8. ⏳ **AI assist** — *pending*: vision suggest + completeness check (+ optional summary); human confirm.
9. ⏳ **Recurring tasks + email reminders** (cron / edge) — *pending* for real delivery; an in-app turnover-ready notification is a demo-stage refinement (epic #113).
10. ✅ **Chemistry-aware layer** (§8.8) — **shipped** (built ahead of the §12 `chem_pain` bridge; demand still unvalidated).
11. ✅ **Landing page** + waitlist analytics — **shipped** (public `/landing`, live).

> No native app or third-party integrations until well after PMF.

---

## 14. Go-to-market / earning attention

`[Hypothesis]` Condensed from `marketing-reference.md`.

- **Positioning:** "Know your hot tub was guest-ready — without being there." Lead with peace of mind; close with proof. Avoid leading with "dispute-grade evidence" (too abstract for this buyer) or consumer "spa" / "maintenance app" keywords.
- **Hooks:** peace of mind · know it got done · prove it if anyone asks.
- **Channels (ranked):** regional STR Facebook groups → BiggerPockets STR forum → LinkedIn → host meetups → YouTube/Loom demo → Instagram (optional). Reddit/X for learning only.
- **Content pillars:** turnover SOP (lead magnet), dispute prevention, scaling 10+ tubs.
- **Growth tactics:** free tier as the top-of-funnel wedge (free for 1 property), free 15-min tub-audit call, early-user case-study PDF, hot-tub-service-company co-referral, referral (one free month of paid).
- **First 10 customers:** existing client (2 tubs) → DM outreach "do you have a system?" (not pitching) → physical demos in a tourist town → realtor warm intro. Public business email / Facebook page only.
- **Compliance:** no Airbnb DM outreach, no scraped lists, no group spam.

---

## 15. Pricing

`[Decision]` **Freemium, per-property.**
- **Free:** 1 property, all features — the top-of-funnel wedge and word-of-mouth engine. Single-property hosts ride free and refer.
- **Paid:** 2+ properties at **~$10–15 / property / month** — **working launch price $12** `[Hypothesis]`. Paid entry is therefore ~$24–36 (2–3 properties), which sidesteps the "$50 isn't justifiable" objection while scaling revenue with portfolio size.
- **The price *number* is a `[Hypothesis]`** — confirmed only by a real paywall + the WTP fake-door (§12), not assumed. Don't anchor low permanently.
- Owners are recipients, not separate paid seats `[Hypothesis]`.
- Concierge pricing ($49–149/mo) is **retired** along with the concierge stage (D13).

---

## 16. Success metrics

| Layer | Metric | Target | Source |
|---|---|---|---|
| **Interviews** | Outreach → interview booked | ≥15% | `interview-log.csv` |
| | `chem_pain` tagged | ≥40% → build §8.8 | log signals |
| **Activation (primary gate)** | Invited operators completing a full 4-photo turnover in **week 1** | **≥60%** | app analytics |
| **Retention (secondary gate)** | Activated operators still submitting in **weeks 2–3** | **≥50%** | app analytics |
| **Wedge (differentiator)** | Completed turnovers whose **proof link is shared** | **≥~30%** | analytics |
| | Shared proof links **opened** by recipients | trend ↑ | analytics |
| **North-star** | % active properties with a **complete turnover every guest cycle** | trend ↑ | app DB |
| **WTP proxy** | Activated operators hitting the "add 2nd property / pricing" fake-door | trend ↑ | analytics |
| **Marketing** | Landing → free signup | ≥5% | analytics |

**North-star `[Hypothesis]`:** *% of active properties with a complete turnover every guest cycle* — captures staff adoption (the existential risk) in one number. **Primary near-term gate is activation (≥60% week-1), with a retention backstop** — because the lean path makes *usage*, not a paid renewal, the thing that proves or kills the thesis.

---

## 17. Key risks & assumptions

| # | Risk / assumption | Severity | Mitigation |
|---|---|---|---|
| R1 | **Zero validation data exists.** Entire thesis is unproven. | 🔴 Critical | Pre-build recruitment gate (≥3 commit) + keep the MVP *thin*; let real usage (§12) confirm/kill fast and cheap |
| R2 | Hypothesized pain may be wrong or low-urgency | 🔴 | Recruitment-commitment gate (§12): can't recruit ≥3 for a *free* tool → pain too low → stop before building |
| R3 | Willingness-to-pay unproven — **and the free-MVP path doesn't test it** | 🔴 | WTP fake-door probe (§12); real paywall at 2nd property; treat free usage as a *necessary-not-sufficient* signal |
| R4 | **Staff won't submit** (low-tech, high-churn) | 🔴 | Zero-install PWA, <10-min guided flow; measure turnovers/property/week |
| R5 | Generalists (Breezeway/Properly) absorb "tub checklist" | 🟠 | Compete on *evidence*, not checklist (§5); v1 ships thin proof + measures share rate to test the wedge early (§12) |
| R6 | PWA geolocation reliability / permission refusal | 🟠 | Graceful degradation; flag "no location" on record |
| R7 | Owner-portal adoption may be low (owners may not log in) | 🟡 | PDF/link export covers non-portal recipients |
| R8 | "TrackTub" name constrains whole-property vision | 🟡 | Defer rename to post-PMF |
| R9 | Privacy of staff location data | 🟠 | Disclose capture; store coordinates per record only; clear policy |
| R10 | Chemistry-aware layer (§8.8) unvalidated for the STR buyer; risks scope creep | 🟠 | Gate on §12 bridge question (≥40% `chem_pain`); ship proof first, chemistry as fast-follow; keep v1 entry light/sensor-free |
| R11 | Consumer evidence ≠ STR evidence — we may over-trust Reddit pain for the wrong buyer | 🟡 | Treat Appendix B as a *hypothesis source*, not validation; only the bridge question validates it for STR |
| R12 | **Activation gate alone misses retention** — a tool tried once then abandoned looks like success | 🟠 | Pair the ≥60% week-1 gate with the ≥50% weeks-2–3 retention backstop before building fast-follows (§12) |
| R13 | **Free tier cannibalizes / never converts** — full features free for 1 property; multi-property buyers may not upgrade | 🟠 | Watch the WTP fake-door; if conversion intent is near-zero, move the paywall (e.g., proof export, or a 2-property free cap) |

---

## 18. Open questions / decisions still to make

Resolved with working defaults (2026-06-04) — all `[Hypothesis]`, revisit with data:

- [x] **Paid price:** **$12 / property / month** (mid-band), monthly; annual discount later. Confirmed only via the WTP fake-door + a real paywall.
- [x] **Activation gate:** ≥60% complete a full turnover in week 1.
- [x] **Retention gate:** ≥50% of activated operators still submitting in weeks 2–3.
- [x] **Wedge signal:** ≥~30% of turnovers' proof links shared; track recipient opens.
- [x] **Cohort size:** 5 operators.
- [x] **Recruitment gate:** ≥3 of 5 commit (start date + staff contacts) before any code.
- [x] **WTP fake-door:** a pricing tease ("Add property — $12/mo") that opens a *join-the-paid-waitlist* capture (logs intent) — **not** a hard wall.
- [x] **Geofence radius:** 150 m default (fast-follow feature).
- [x] **PDF signing:** server-side signing with a managed KMS key + public `/verify/{token}` route (fast-follow).
- [x] **"viewer" vs "owner":** **same role** (owner = read-only viewer).

Still open (research, non-blocking):
- [ ] Which jurisdictions regulate STR hot tubs? A research spike that could upgrade the compliance angle from nice-to-have to must-have. Not a v1 dependency.

---

## Appendix A — Decision log

Forks resolved during the grilling sessions (2026-06-03 → 06-04):

| # | Question | Decision |
|---|---|---|
| 1 | PRD scope | Whole product vision |
| 2 | Audience | Internal source of truth (founder + AI); product goal = customer attention |
| 3 | `pain-points-AI.md` purpose | Consumer chemistry research → **parked** (Appendix B), out of MVP |
| 4 | Product fork | **STR operator guest-ready proof** (not consumer chemistry app) |
| 5 | Primary differentiator | **Dispute-grade evidence layer** (vs. checklist generalists) |
| 6 | Proof depth | **Medium evidence** in v1 (timestamp, identity, geolocation, geofence, immutable, audit, signed PDF); legal chain-of-custody = vision only |
| 7 | Capture platform | **PWA** + capture-time Geolocation API, server-stamped; EXIF dropped |
| 8 | Vision horizon | Hot-tub wedge → **whole-property Proof OS** (amenities → damage/deposits) |
| 9 | Proof delivery | **Owner read-only portal** + signed PDF / verifiable link for guests/Airbnb |
| 10 | AI role | **Supporting assist** (suggest tags + completeness + optional summary); human confirms |
| 11 | **Re-opened buyer fork** (consumer pain treated as real evidence) | **Synthesis** — STR operator stays the buyer; operator-facing chemistry intel (§8.8) added as a gated differentiator. Refines/supersedes the "parked" framing of #3 and the pure-proof framing of #4. |
| 12 | Pricing model | **Freemium, per-property** — free for 1 property (all features), paid at 2+ (~$10–15/property; number = `[Hypothesis]`). Concierge pricing retired. |
| 13 | Validation method | **Drop paid concierge pilots.** Lean ship-to-learn: interviews → thin free MVP → watch usage. Accepts the WTP blind spot (mitigated by fake-door). |
| 14 | Thin MVP scope | **Capture flow + operator cockpit only.** Proof export, owner portal, AI, reminders, chemistry, landing = fast-follow. |
| 15 | Go/no-go gate | **Activation ≥60%** (full turnover in week 1) primary, **retention ≥50%** (weeks 2–3) recommended backstop. Replaces the concierge-renewal gate. |
| 16 | Deferred-differentiator fork | **Add thin proof primitives to v1** (server timestamp · immutable · shareable read-only link); defer signed PDF, geofence badge, owner portal. v1 now tests a *taste* of the wedge, not just convenience. |
| 17 | Wedge validation signal | **Proof-link share rate** (≥~30% of turnovers shared, `[Hypothesis]`) + recipient open rate. Near-zero share = "proof" isn't the pull → revisit positioning before building heavy proof. |
| 18 | Pre-build kill-switch | **Recruitment-commitment gate** — write no code until ≥3 of ~5 interviewed operators commit (start date + staff contacts). Can't fill the cohort for a free tool → stop. Behavior, not stated pain. |
| 19 | Threshold tuning (§18) | Working `[Hypothesis]` defaults: price **$12/property/mo**; cohort **5**; recruitment gate **≥3/5**; activation **≥60%**, retention **≥50%**, wedge share **≥30%**; geofence **150 m**; owner = viewer (same role); WTP fake-door = waitlist tease, not hard wall. Jurisdiction regulation = open research spike. |
| 20 (2026-06-13) | **Build-first execution** (v1 + fast-follows built ahead of validation) | The team **built v1 and several fast-follows before running the §12 interview round** — capture PWA, dashboard, thin proof (anon-accessible `/proof` link), roles + invite + Team page, the chemistry-aware layer (§8.8, ahead of the `chem_pain` gate), Insights + `proof_event`/PostHog, and the live `/landing`. `[Decision]` This is a deliberate build-first bet, **not** validation: the §12 gates now govern the **go-to-market** decision (paid push, heavy-proof investment), not whether code exists. Building ≠ validating (§17 R1). |
| 21 (2026-06-13) | **Demo-stage refinements** (epic #113, founder dress-rehearsal) | `[Decision]` Polish the shipped v1 for a self-contained localhost demo without changing scope/strategy: capture reordered to **before → chemistry → after** (`before`/`after`-tagged photos); in-app **"turnover ready → host notified"** signal (email stubbed/logged locally; real send stays fast-follow); **"cockpit" → "Dashboard"** naming pass ("Your hot tubs"). In progress on a feature branch as of 2026-06-13; demo stays on `main` + localhost (live site untouched). |

---

## Appendix B — Parked research: consumer hot-tub pains (`pain-points-AI.md`)

Direct, AI-scraped Reddit pains from real hot-tub owners / new owners / pool-spa service pros. **This is the strongest primary evidence in the entire repo** — and it is for a *consumer* audience, not our STR-operator buyer. We do **not** pivot to consumer (low ACV, seasonal, brutal solo-founder reach, and **free competitor apps already exist** — see source #1, *"just pushed a big update to my **free** hot tub app"*). Instead, `[Decision]` the two **STR-transferable** pains below seed the operator-facing **chemistry-aware layer (§8.8)**, gated on the §12 bridge question. Relevance to the high-turnover STR tub:

| Pain | Audience | Relevance to STR |
|---|---|---|
| Salt/floaters can't recover chemistry after heavy **bather loads** | Owners | **High** — guest turnover = heavy bather load |
| Can't diagnose hardware failures (siphoning leaks) | Homeowners | Medium |
| Pool/spa service software exports "garbage" data | Service pros | Low (different buyer) |
| Circular advice for high-hardness water | New owners | Low–medium |
| **Rapid chlorine depletion** (zero in 24h) | Inherited-tub owners | **High** — post-guest chemistry crash |

Source: `pain-points-AI.md` (r/hottub, r/PoolPros).
