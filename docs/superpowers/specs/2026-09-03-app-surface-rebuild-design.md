# App surface rebuild — design

**Status:** draft for founder review
**Date:** 2026-09-03
**Supersedes:** `2026-07-15-mobile-first-redesign-design.md`, `2026-07-21-core-flow-rebuild-design.md`
**Design canvas:** https://claude.ai/code/artifact/d7ab9c0b-5162-42f2-bbcb-bca114bcfd19

## Why we are doing this

The founder returned on 2026-09-02 after five weeks away and could not complete a
turnover on production. Investigation found the cause is not the platform:

- Google auth works. He signed in at 02:27 UTC and browsed four property pages.
- RLS is correct. Impersonating his user id in a rolled-back transaction,
  `app_can_capture_property` returns true for all four properties.
- The schema holds real data and prod deploys fine.

What is broken is the surface:

1. **The July field flow is unreachable.** `/field/today` and
   `/field/turnover/[id]` shipped to production (PRs #253–#257) with **no link to
   them from anywhere in the app**, and `BottomTabBar` advertises four tabs of
   which three — `/field/tubs`, `/field/history`, `/field/more` — have no route
   and 404.
2. **Two rival capture flows exist.** The desktop wizard `/p/[id]/new` and the
   mobile field flow both call `ensureDraftTurnoverAction`, and neither knows the
   other exists.
3. **A tap on "New turnover" silently does nothing.** See "The dead tap" below.

This is the same failure named in the July retro: work was built as parallel
module-issues and nobody owned the path end to end.

**The decision (founder, 2026-09-02):** keep the database, auth, RLS and deploy
pipeline. Rebuild only the app surface, as one flow owned end to end.

## Who this is for

A **solo operator** — a property manager or hot-tub tech who services tubs for
short-term-rental clients. He owns the business and does the work; there is no
dispatcher and no crew. He has multiple clients and multiple tubs. He is standing
outside at a tub, often with wet or gloved hands, in the cold, holding a phone.

His words: *"I actually don't track our tubs history."*

**Deferred, explicitly:** multiple roles and multiple accounts. Build for one
user. Google auth stays as-is so nothing has to be rebuilt when roles return.

## Data model

**Client → Tub.** A client has many tubs; a tub carries its own name and address.
No third level — the founder asked for "multiple clients, multiple tubs", not a
property tier between them.

Today `property` is a flat table where a property *is* a tub. The change is
additive:

- New `client` table (`id`, `org_id`, `name`, contact email, timestamps).
- `property.client_id` nullable FK → `client.id`.
- Backfill: one client per existing org, all properties assigned to it.

`property` is **not** renamed. Renaming it touches every RLS policy, helper
function and trigger in the database, and per `CLAUDE.md` all three tiers share
one Postgres — that is a shared-object change requiring founder sign-off and it
buys nothing but a nicer identifier. The UI says "tub"; the table stays
`property`.

Everything else — `turnover`, `photo`, `water_reading`, `share_token`, the audit
log — is kept as-is.

## The flow

Five screens. One path. Nothing else ships until these are good.

### 1. Today

- Date header.
- **Up next** — tubs due, worst first. A single due tub renders as a full card
  with its photo, last readings and one primary action; it must never render as
  a one-row list.
- **Your tubs** — every tub, always visible, sorted by attention: thumbnail,
  name, client, days since service, status dot.
- Bottom tabs: **Today · Tubs · Reports**.

**There is no "done today" list.** The founder rejected it as repetitive, and
Jobber — the closest verified comparable — ships no completed-today list to a
technician either. A done-list is a dispatcher's progress bar; he was there.

On a day with nothing due, the roster is the content, headed "Nothing due today ·
N tubs tracked", oldest-serviced first. No empty state, no celebration.

### 2. Tub

In order: **last visit in full** (readings with in/out-of-range colour and a
delta against the previous visit) → **a sparkline** for pH → **"last time
you…"** (drained, cleaned the filter, sent a report, each with days since) →
the **chronological visit list, demoted to the bottom**.

The list is the artifact. The four blocks above it are the product. Skimmer's
top App Store complaint is having to click week-by-week through history; that is
the failure mode this ordering avoids.

### 3. The visit — one scrolling sheet

Photo tiles and chemistry on **one screen**, not a wizard. Skimmer enters
chemistry on a scrolling screen; every forced "Next" is a failure point with wet
gloves, and a scroll survives a mistap where a wizard step does not.

- **Photos**: four tiles — before, water level, full frame, cover on. A tile
  opens the camera.
- **The water**: alkalinity, pH, calcium hardness, sanitizer — in that order,
  which is buffer-correct. Each row shows **last visit's value inline**, because
  reading a strip is a judgement call and the previous number is the reference.
- **What you added**: dosage chips with amounts.
- **Notes**.

**Nothing gates save.** Properly and Breezeway block completion until photos are
done; both exist to police employees. He is the owner. A visit saves with photos
and no chemistry, or chemistry and no photos, and is marked partial so the
history stays honest. Two taps to a saved visit must be possible.

### 4. The camera

Full-bleed viewfinder opened from a photo tile, with a dashed framing oval and
the previous visit's shot at bottom-left to frame against. Shutter, and Skip.

**Camera capture only — no camera-roll uploads.** Skimmer enforces this, and it
is what makes the timestamps defensible to a client. It is the whole
dispute-grade claim; without it the report footer's on-site assertion is a lie.

### 5. The record

Two audiences, one set of facts.

**In the app**: delivery status (sent, opened) · before/after photos each stamped
with its own capture time · readings with **target ranges** printed beside them ·
**dosages with amounts** · a work-completed checklist including unticked items ·
notes · a separately flagged item for the owner · arrival and finish times, next
due, record id.

**To the client**: the same, set for print on white — masthead, property and
technician block, verified stamp, readings table with in-range markers, products
and work side by side, captioned photo strip with times, notes, flagged item.
Footer carries the on-site photo assertion, next due date, record id and a
short link.

Delivery: **email, PDF, and a shareable link**. Turno and Properly both send
links; links survive email size limits and get forwarded to guests. Plus a
**multi-visit period report** ("last 6 visits") — the differentiator is history,
and a single-visit report does not sell it.

## Visual direction

Dark-first, per `branding/`. Blue `#3B82F6` is water and brand; green is
**verified/success only**, never decoration.

**Type: one sober sans. No serif, no monospace.** Hierarchy comes from weight and
size alone. This departs from `branding/brand-notes.md`, which specifies Inter +
JetBrains Mono — the founder rejected that pairing on 2026-09-02 as blocky, and
rejected an Instrument Serif display cut as "too fruity". **Open question:** the
family itself. The canvas carries a live switcher across Archivo, Schibsted
Grotesk, Manrope and Instrument Sans; **Archivo is the working default**. It is
one token — settle it before build, but it does not block this design.
`brand-notes.md` must be updated to match whatever is chosen.

**Anti-blockiness rules**, all rejection-driven: pill buttons; ~24px card radii;
circular tap targets; **spacing instead of hairline dividers**; the brand
waterline wave as the cut between photo and content. The waterline is a section
device, **not** a camera framing guide — the founder had it removed from the
viewfinder.

Minimum tap target 44px throughout.

## What gets deleted

The Operations hub (`/operations/*` — maintenance, schedule, supplies,
equipment), `/team`, `/insights`, `/chemistry`, the desktop console shell, and
the orphaned `/field` routes. They are unreachable, half-built, or serve a
multi-role product we have deferred.

**Deletion is removal from the app surface, not from the database.** No tables
are dropped. `maintenance_task`, `scheduled_item`, `equipment` and the rest keep
their rows so the schedule work can return without a migration.

`/landing`, `/blog`, `/login`, `/auth/*` and `/proof/[token]` are untouched.

## Correctness requirements

These are not polish; each one is a bug we have already paid for.

1. **`error.tsx` boundaries.** The app currently has only `global-error.tsx`,
   which catches root-layout failures alone. Every route segment gets an
   `error.tsx`. A server-component throw during a client-side navigation with no
   boundary in the segment tree makes the router abort **silently** — a tap that
   does nothing, which is the leading explanation for the dead tap below.
2. **No orphan routes.** Every tab and link resolves to a route that exists. A CI
   check should assert that each `href` in the nav has a matching page file —
   three of four field tabs 404'd in production for six weeks.
3. **One capture flow.** `/p/[id]/new` and `/field/turnover/[id]` collapse into
   one. Two flows is what produced this situation.
4. **No side effects on GET.** `/p/[id]/new` creates a draft turnover row while
   *rendering*. Draft creation moves to an explicit action.
5. **CSP.** Read `docs/incidents/` on the nonce-vs-prerendered-route bug before
   touching render modes. The CI guard stays.

### The dead tap — unresolved

The founder tapped "New turnover" and nothing happened. Established:
`can_capture` is true so the button renders; `/p/[id]/new` creates a draft row on
render and **zero draft rows exist**, so it never rendered; Vercel logs show no
request for it. Leading hypothesis is the missing error boundary (1 above).
**Not yet reproduced locally. Reproduce before fixing** — requirement 1 may
already cure it, but shipping a fix for an unconfirmed cause is how this gets
missed again.

### Separately

`/landing`'s waitlist form 500s for returning visitors on cached HTML
("Failed to find Server Action" — stale action id against a newer deployment).
Real, user-facing, and distinct from the CSP-nonce bug. Out of scope here; needs
its own issue.

## Success criterion

The founder services one of his own tubs, on his phone, start to finish, and
sends himself the report — then wants to do it again next time.

Not "the screens are built."

## Open questions

1. **Typeface** — Archivo, Schibsted Grotesk, Manrope or Instrument Sans.
2. **Photo count** — four tiles may be one or two too many for a real turnover.
3. **Reports tab** — earns a tab because a client may ask for a record while he
   is away from a tub. Unconfirmed against his actual habit.
4. **Offline** — a tub in a canyon may have no signal. Not addressed in this
   design; needs a decision before build, since it shapes the draft model.
