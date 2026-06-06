# TrackTub thin-MVP demo — design spec

> **Date:** 2026-06-04
> **Status:** Approved-by-proxy (see note) → building
> **Source of truth:** [`docs/PRD.md`](../../PRD.md) v0.3 (18 decisions)
> **Topic:** A locally-runnable, clickable demo of the TrackTub thin MVP for the founder to demo when back.

## Brainstorming-gate note

The brainstorming skill normally requires explicit user approval of this design before any build. The user left for ~1 hour and **explicitly instructed autonomous building and iteration** ("fully build out a local demo… use best practices… keep iterating and trying new features until I'm back"). Per the superpowers instruction hierarchy (user instruction > skill default), I proceed to build using the decision-complete PRD as validated intent. Context exploration = the full PRD grilling session (18 logged decisions). Visual companion skipped (requires the absent user to open a URL).

## Purpose

Let the founder click through the **thin MVP** end-to-end: a cleaner captures a guided hot-tub turnover, the operator sees it in a cockpit, and a tamper-evident **proof link** can be shared with an owner/guest. The demo must run locally with one command and need no backend, accounts, or secrets.

## Scope — mirrors PRD §8.0 (thin MVP) + the proof primitives (D16)

**In the demo (v1 thin MVP):**
- **Turnover capture (PWA-style, §8.1):** guided 4-shot flow (wide · waterline · panel · cover), notes, urgent flag, staff assignment, sub-10-min feel.
- **Operator cockpit (§8.3):** per-property status, last visit, galleries, open issues, alerts.
- **Thin proof primitives (§8.2 / D16):** server-style timestamp, verified submitter, immutable-after-submit, **shareable read-only proof link** at `/proof/[token]`.
- **Wedge instrumentation (D17):** "Share proof" action + mock recipient-open tracking.
- **Validation analytics (§12/§16):** a founder dashboard showing activation, retention, wedge share-rate, WTP intent — driven by the demo's own seeded + live data.
- **WTP fake-door (§12):** "Add property — $12/mo" → join-the-waitlist capture that logs intent.

**Explicitly mocked / deferred (PRD fast-follow — shown as "coming soon" or light mocks):**
- Real auth/RLS, Supabase backend → replaced by a role switcher + localStorage.
- Signed PDF, geofence verification badge → shown as labeled mocks/badges.
- AI tag-suggest, chemistry bather-load reminder → light client-side mocks (clearly flagged), to show the roadmap.
- Owner portal → demonstrated via the role switcher's read-only "Owner" view.

## Approach

Next.js 15 App Router + TypeScript + Tailwind. All state in a typed localStorage store (`lib/store.ts`) seeded on first load with realistic mock data (3 properties, staff, a few historical turnovers, share/open events). No network calls. Mobile-first layout (capture is a phone task). A top-bar **role switcher** (Operator / Staff / Owner) re-scopes the UI to demo the three PRD roles and RLS intent without real auth.

## Architecture / units (each small, one purpose)

| Unit | Purpose | Depends on |
|---|---|---|
| `lib/types.ts` | Domain types mirroring PRD §10 | — |
| `lib/store.ts` | localStorage CRUD + seed + analytics selectors | types |
| `lib/seed.ts` | Realistic mock org/properties/turnovers/events | types |
| `components/*` | Cockpit cards, capture wizard, photo slot, proof view, role switcher, stat tiles | store |
| `app/(routes)` | Cockpit `/`, property `/p/[id]`, capture `/p/[id]/new`, turnover `/t/[id]`, public proof `/proof/[token]`, analytics `/insights`, fake-door `/add-property` | components+store |

## Data model (client mirror of PRD §10)

`Org, User(role), Property(lat,lng,geofenceRadius), Turnover(submittedAtServer, status:locked, urgent, notes, photos[slot,dataUrl,suggestedTags,confirmedTags], shareToken), ShareEvent(sharedAt, opens[]), WaitlistIntent`.

## Demo flows

1. **Capture (Staff role):** cockpit → property → "New turnover" → 4-shot wizard → notes/urgent → submit → record **locks** (immutability) and gets a `shareToken`.
2. **Cockpit (Operator):** see the new turnover, last-visit, open issues, urgent alert; open the record; **Share proof** → copy `/proof/[token]`.
3. **Proof link (public, no login):** open `/proof/[token]` → photos + server timestamp + submitter + "Verified by TrackTub" badge; visiting logs a recipient **open** (wedge signal).
4. **Owner role:** read-only view of only their property's proof.
5. **Insights:** activation / retention / share-rate / WTP tiles update from real demo activity.
6. **Fake-door:** "Add property — $12/mo" → waitlist capture logs a WTP intent (shows on Insights).

## Error handling / quality

Empty states everywhere; guard localStorage access (SSR-safe); never crash on missing photos (placeholder). Accessible (labels, focus, contrast). Seed is idempotent + a "Reset demo" control.

## Iteration backlog (for the autonomous hour, after core works)

P1 core: store+seed → cockpit → capture wizard → proof link → share/open → insights → fake-door.
P2 polish: role switcher, urgent/geofence/overdue alerts, mobile capture camera input, "Verified" badge, copy-link toast, reset-demo.
P3 roadmap mocks (clearly labeled): AI tag-suggest on photos, photo-completeness nudge, chemistry bather-load reminder, signed-PDF "preview", owner-summary draft.
P4 stretch: a `/landing` marketing draft (per /goal Phase 1), simple charts on Insights, PWA manifest.

## Self-review

- Placeholders: none left in this spec.
- Consistency: scope matches PRD §8.0/§8.2 (D16) and gates (§12/§16); deferred items match fast-follow.
- Scope: single implementation focus (one local demo app); backlog is prioritized, not required.
- Ambiguity: "no backend" is explicit; mocks are labeled as mocks in-UI.
