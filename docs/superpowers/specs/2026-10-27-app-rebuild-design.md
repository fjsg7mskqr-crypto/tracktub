# App rebuild — design

**Status:** draft for founder approval
**Date:** 2026-10-27
**Supersedes:** `2026-09-03-app-surface-rebuild-design.md` (on branch `worktree-spec-core-flow-rebuild`)
**Mockup (the build reference):** https://claude.ai/artifact/VPpM57oyGvZD3qrgGp291U — 10 clickable phone screens. Source copy in the vault at `40 Brand/App mockup 2026-10/`.
**Decisions in force:** D23 (one record, four holders), D24 (operator is the buyer), D25 (no public price), D27 (two readings), D28 (calendar = tub care), Charter non-goals.

## Why

The app on production can't be used end to end: the July field flow had no entry point, three of four tabs 404'd, and two rival capture flows exist (see the September spec). The founder decided on 2026-09-02 to keep the database, auth, RLS and deploy pipeline and rebuild only the app surface, as one flow owned end to end.

October discovery sharpened what that flow is for. The founder compares each tub against **memory** of its last state, and the pain he has actually lived is **not knowing what he'll find until he shows up**. The app's job is to replace memory with a record: what the tub was like, what was done, and what's due.

## Who it's for

One solo operator, a hot-tub tech or small property manager servicing short-term-rental tubs for several clients. He's outside at the tub, often with wet or gloved hands, phone in one hand. He picks the phone up three times per visit: before the work, at the test strip, and after.

Build for **one user**. No teams, roles or invites (Charter). Google sign-in at `tracktub.com/login` stays exactly as it is.

## Success criterion

The founder services one of his own tubs on his phone, start to finish, sends himself the record, and wants to do it again next time. "The screens are built" is not the bar.

## Navigation

Four bottom tabs on every signed-in screen: **Home · Calendar · Tubs · Reports**. Sign-in lands on Home.

## The screens

Numbers match the mockup.

### 1. Sign in
Unchanged: Google OAuth at `/login`. After sign-in, go to Home.

### 2. Home
- Greeting and date.
- **Today**: a seven-day strip (today highlighted) with dots for care due (amber) and visits logged (blue), plus one line per tub with something today ("Logged 9:52 · sent", "Drain due"). Tapping it opens Calendar.
- **Needs attention**: tubs with something due or a drifting reading, worst first, each opening its tub. Rules for what qualifies are in the Calendar section.
- **This week**: visits logged, records sent, records opened.
- No empty state that celebrates; on a quiet day the attention list just says nothing is due.

### 3. Calendar (D28)
Day / Week / Month switch, default Week. Shows **only** two kinds of item:
1. **Visits logged**: from locked and partial visits. Tapping one opens its record.
2. **Care due**, projected from the tub's own history:
   - **Drain & refill**: last drained + the tub's drain interval.
   - **Filter change**: last filter replacement + filter interval.
   - **"Usually visited by now"**: the median gap between the tub's last few visits, once there are at least 3.

Intervals default to sensible values (drain 90 days, filter change 60 days), are learned from the tub's own history once enough exists, and can be edited per tub. **No bookings, no guest times, no assigning, no dispatch.**

### 4. Tubs
Every tub grouped by client, with a status dot (amber means something is due or the last as-found reading was out of range), days since the last visit, and the next due item. Has an **Add tub** button.

### 5. One tub
In order:
1. Name, client, address, volume.
2. **"Before you go in"**: four tiles:
   - days since drain (with the usual interval);
   - pH on arrival last time (with "high N visits running" when it applies);
   - days on the current filter;
   - days since the last visit (plus whether the owner opened the last record).
3. **Log**: a timeline, oldest at the top.
   - **Past visits** each collapse to one line: date, time span, found → left headline, work, photo count, plus locked/partial status. Tapping one opens its record.
   - **An open visit** shows as the newest entries, each timestamped: photo, reading, work, added. A dashed "Still to log" box lists what's missing, followed by **Continue visit**.
   - **With no open visit**, the button reads **Start visit**.

### 6. The visit
One scrolling page, opened at the start of the job and left open for the whole job. Draft state **survives a reload or a backgrounded tab**.

The page has five numbered sections:
1. **Before**: a before-photo tile shown next to last visit's after photo.
2. **Reading as found**: the logged chips plus "Edit reading", or "Log reading" if there isn't one yet.
3. **The work**:
   - toggle chips: cleaned filter, wiped down, replaced filter, drained & refilled, topped off, cleaned cover;
   - **What you added**: product + amount rows, then "Add a product".
4. **Reading as left**: a single "Log reading as left" button.
5. **After**: photo tiles for full tub and cover on.

Below the sections are a **Notes** box and a **Flag something for the owner** entry.

Saving rules:
- **Autosave**, with a "Saved hh:mm" indicator in the header.
- **Nothing blocks Finish.** **Finish & lock record** locks the visit (the existing `turnover_lock_guard`). A visit missing a reading or a photo is marked **partial** on the record and in the log.
- **One capture flow only.** `/p/[id]/new` and `/field/turnover/[id]` are retired.
- **No side effects on GET**: the draft is created by an explicit action (Start visit), never while a page renders.

### 7. Log a reading (D27)
A bottom sheet with an **As found / As left** switch.

- **Rows:** alkalinity, pH, hardness, chlorine, in that order (buffer-correct). Each row has − / + buttons and the value between them.
- **Step sizes:** alkalinity 10, pH 0.1, hardness 10, chlorine 0.5.
- **Starting values:**
  - As found starts at **last visit's found values**.
  - As left starts at **this visit's found values**, so you only nudge the ones that changed.
- **Colours and labels:** out-of-range values show amber. Each row's sublabel shows its target range, and on As left it also shows the found value.
- **Log it** saves the reading with a server timestamp.
- **Rules: never record a number nobody read.** Each row starts **unset**, with the starting value shown greyed as a suggestion. A row becomes set when you tap − / + or tap the value to accept it as-is. **Log it** saves only the rows that are set; unset rows are stored as null and shown as "—". This stops a tap on Log it from copying last visit's numbers into today's record. *(Agent's call, from the founder's "evidence, not assertion" rule; the founder can veto it.)*
- **Targets** (chlorine tubs): alkalinity 80–120, pH 7.2–7.8, hardness 150–250, chlorine 1–3. Store them as configuration, not hard-coded per screen.

### 8. Camera
Full-screen viewfinder opened from a photo tile.
- **Last visit's shot of the same kind** sits bottom-left to frame against.
- **Controls:** shutter, Skip and close.
- **Camera capture only, never the camera roll:** `capture="environment"` or a `getUserMedia` stream.
- **Timestamps:** `captured_at` is stored separately from the server receipt time, as it already is.
- **Three photos are asked for:** before, after full tub, cover on. Extras are allowed but never prompted.

### 9. The record (owner-facing)
White, printable, the same facts for every holder (D23). It contains:
- masthead "TrackTub record";
- tub, client, date, operator, start–finish times;
- a **Locked hh:mm** badge;
- **Water** table: found (time), left (time), target, with an in-range tick on left;
- **Photos** with capture times;
- **Added** and **Work**, including unticked items as "— Not drained";
- **For the owner** flag, and notes;
- footer: how photos and times are captured, next due, record id and short link.

At the top, for the operator only: **Send to owner** and **Copy link**.

**Wording rules:** never "verified", "tamper-proof", "dispute-grade" or "immutable" (D23). The share link reuses `/proof/[token]`.

### 10. Reports
- **History report**: one tub over a period ("last 6 visits", "this season"). It's a page built from the records; PDF export is a later phase.
- **Sent**: each record sent, to whom, and Sent or **Opened** status.

## Visual system

Dark-first, from `branding/`:

| Role | Colour |
|---|---|
| Background | `#08090A` |
| Surface | `#131417` |
| Raised surface | `#191B20` |
| Text | `#EDEDEF` |
| Secondary text | `#8A8F98` / `#A1A6AF` |
| Primary buttons | `#2563EB` with white text |
| Brand blue (water) | `#3B82F6`, link text `#7FB0FF` |
| Amber: due / out of range | `#E8A33D`, text `#F2B85C` |
| Green: success / locked / in-range only | `#34D399`, `#0A7A55` on white |

- **Type: Archivo**, the working default from September, now used throughout the mockup. Update `branding/brand-notes.md` to match.
- **Shapes:** pill buttons, ~20–24px card radius, spacing instead of hairline dividers.
- **Accessibility:** tap targets at least 44px; text contrast at least 4.5:1.
- **Owner record:** light (white).

## Data changes

All tiers share one database (`CLAUDE.md`). Every change is validated on the local stack and in the CI `rls` replay before it touches the shared DB. **One agent owns all migrations, in sequence.** Parallel migration timestamps have collided before.

| Change | Kind | Notes |
|---|---|---|
| `client` table (`id`, `org_id`, `name`, contact email, timestamps); `property.client_id` nullable FK; backfill one client per org | Additive | RLS scoped like `property` |
| `water_reading.kind` (`found` \| `left`), existing rows backfilled `found`; unique `(turnover_id, kind)` replaces unique `(turnover_id)` | **Shared object, founder signed off 2026-10-27** (D27) | Update RLS/insert paths that assume one row |
| New `turnover.cleaning_steps` codes: `filter_replaced`, `drained_refilled`, `cover_cleaned` | Values only | Keep existing codes |
| Per-tub intervals: `property.drain_interval_days`, `property.filter_interval_days` (nullable = use default) | Additive | Powers Calendar and the brief (D28) |
| Record opened tracking: `share_token.first_opened_at`, `last_opened_at` (or an append-only `share_view` table) | Additive | Set by the `/proof/[token]` route |
| Audit readings columns against prod (alkalinity/hardness drift fixed via MCP in July) | Check | Migrations must match prod |
| Regenerate `types.ts` after each change | — | |

Nothing is dropped. `maintenance_task`, `scheduled_item`, `equipment` and the rest keep their rows and are simply unused by the new surface.

## What gets removed from the app surface
`/operations/*`, `/team`, `/insights`, `/chemistry`, `/field/*`, `/p/[id]/new`, `/add-property` (replaced by Add tub), `/dev/ui`, and the desktop console shell.

Untouched: `/landing`, `/blog`, `/login`, `/auth/*`, `/proof/[token]`, `/invite/[token]`.

## Correctness requirements (each one a bug already paid for)
1. **An `error.tsx` in every route segment.** A throw during navigation must show an error, never do nothing. Phase-1 work for this is on branch `worktree-spec-core-flow-rebuild` (now pushed); land it first.
2. **No orphan routes.** CI asserts every nav `href` has a page (the same branch has the test).
3. **One capture flow.**
4. **No side effects on GET.**
5. **CSP:** read `docs/incidents/` and the CSP memory before touching render modes. Signed-in pages stay dynamic; the CI guard stays.

## Out of scope
- Offline capture. A connection is required; the revisit signal from the September spec stands.
- Bookings and guest times (D28).
- Multi-user.
- Invoicing.
- PDF export, which comes after the shared link works.
- Email delivery beyond a share link and the device share sheet.
- Pools, saunas and other equipment.

## Left to the builder
- Component structure and server/client split.
- Exact route names, within the tab set.
- How draft state persists across reloads.
- Learned-interval maths, beyond "default, then the tub's own history".
- Empty states, which should be plain, never celebratory.

## Build lanes (parallel agents, one Orca worktree each)

| Lane | Scope | Depends on | Owns |
|---|---|---|---|
| **0 Foundation** | Land phase-1 branch (error boundaries + nav-route test); 4-tab shell with stub pages; design tokens + Archivo; remove retired routes | — | `app/layout`, shell/nav components, tokens, deletions |
| **1 Database** | All data changes above, in order, plus type regeneration | — (runs alongside 0) | `supabase/migrations`, `types.ts` |
| **2 Visit** | Screens 6, 7, 8: draft lifecycle, autosave, reading sheet, camera, finish & lock | 0, 1 | visit, reading and camera routes and components |
| **3 Tub** | Screens 4, 5: tubs list by client, brief tiles, log timeline | 0, 1 (client) | tubs routes |
| **4 Record & Reports** | Screens 9, 10: owner record on `/proof/[token]`, send/copy, opened tracking, history report | 0, 1 | proof route, reports routes |
| **5 Home & Calendar** | Screens 2, 3: due-care projection and attention rules | 0, 1, and the data from 2 and 3 | home, calendar routes, due-care module |

**Rules:**
- Lanes 2–4 run in parallel and touch only their own routes. A shared component goes to lane 0 as a small PR, never edited in place by two lanes.
- Every lane follows `CLAUDE.md`: worktree → PR → green CI → squash-merge to `main`.
- Promotion to test and prod happens only when the founder asks.
