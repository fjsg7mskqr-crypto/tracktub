# Home: today's route + status board (design)

Date: 2026-11-04 · Status: awaiting founder approval · Follows: `2026-10-27-app-rebuild-design.md` (screen 2)
Approved mockups (local, git-ignored): `.superpowers/brainstorm/94235-1793772756/content/home-b-v4.html` (final) and `home-b-v3.html` (care rings on every tile).

## Why
The founder reviewed the live rebuild: Home "looks dull and lacks valuable information." Between visits, what he actually carries in his head is **what he left unfinished and whether last time's problems were settled**. His words: "Did I soak filters in solution, previous issues from last checkups that need attention to ensure previous issues were settled." Home should hold that for him, and show every tub's condition at a glance, with some visual character.

Success: he opens Home and, without opening any tub, knows (1) where he's going today and what's next, (2) which tub needs him and why, (3) what he left open last time. Gate: he wants to use it again in the field.

Anti-goals: a dashboard of numbers for their own sake; making visits slower; anything that needs a booking system (Charter non-goal, D28).

## The screen, top to bottom

1. **Greeting + date.** Keep the current greeting.
2. **Summary row.** Three tiles:
   - **Needs you**: tubs in the problem state, in red;
   - **Left open**: unsettled open items across all tubs, in amber;
   - **Tubs**: the total.
3. **Today's route.** A horizontal strip of today's stops with connecting lines:
   - a stop fills in (blue) when its visit is locked, labelled "done 10:42";
   - the current stop is enlarged with a halo;
   - a stop whose tub has a problem gets a red ring;
   - the header reads "Today's route · N of M done";
   - tapping a stop opens its focus card, or starts or opens its visit.
4. **Focus card**, attached under the route with a pointer to its stop:
   - **Working on** (a draft visit exists for a tub on today's route; if several, the most recently opened):
     - "Working on · started 1:34", the tub name, and "2 of 4 steps";
     - a 4-segment progress bar: Before photo · Readings · Work · After photos (after + cover);
     - this tub's open items, each settleable right there;
     - a **Resume visit** button.
   - **Up next** (no draft): the first not-done stop. It shows:
     - the tub name and client;
     - the problem chip, e.g. "pH 7.9 Sat";
     - "last visit N days ago";
     - its open items;
     - **Bring:** a short list derived from open items and last as-left readings (e.g. pH high → "pH down, test strips");
     - drain and filter countdowns;
     - a **Start visit** button.
   - With no route today and no draft, the card is hidden.
5. **Status board**, "worst first". One tile per tub. Order: problem → has open items → care due soon → calm; ties broken by the soonest care.
   - **Care ring** (left): a circle that empties toward the next **drain**, with days left in the centre. Blue normally, amber within `DUE_SOON_DAYS` (7), red when overdue.
   - **Name + status chip.** Problem examples: "pH 7.9", "Owner flagged", "Drain overdue". Open-item examples: "2 open", "Waiting on part". Calm: "Balanced", in green. Green appears only on a verified balanced or all-clear state, per the brand rule.
   - **Sub-line:** the client, and "on today's route" or "visited today 10:42".
   - **Open items** as checkbox rows.
   - **Footer:** last visit date · report state ("Report not sent" / "Sent" / "Host opened report").
   - A calm tub collapses to a single row: ring + name + chip.
   - Tapping a tile opens the tub page. The tub page redesign is out of scope (#369).

The current "This week" section and the old today strip are replaced by the above. Keep Home's quick "start a visit" entry reachable, through the route stop and Start visit.

## Open items: new, tracked data
An **open item** is something left unfinished at one visit that should be settled at a later one.

- **Created during a visit**, from a new "Leave for next time" control on the visit screen. Quick chips:
  - **Filters soaking**
  - **Re-check reading**
  - **Part needed**
  - **Other** (free text)

  Each takes an optional note. When the as-left reading is still out of range, the visit screen suggests "Re-check <reading>" as one tap (a suggestion, never automatic, and never blocking: "never gate save").
- **Settled** with one tap from:
  - the next visit to that tub (open items appear at the top of the visit screen);
  - the Home focus card;
  - a Home tile.

  Settling records when and in which visit it was settled. An item can also be dismissed ("no longer needed").
- **Stored** additively on the existing `task` table (`property_id, title, status, …`, write-RLS = `app_can_capture_property`). Add nullable columns:
  - `kind` (`filter_soak | recheck | part | other`)
  - `note`
  - `opened_visit_id`
  - `settled_visit_id`
  - `settled_at`
  - `created_by`

  `status` goes open → settled | dismissed. Additive only. **No change to existing policies or functions** (shared DB rule). If the builder finds `task`'s existing RLS insufficient, stop and flag it; do not alter it.
- **Not shown on the host report** — internal to the operator for now (my call).

## Today's route: where stops come from
<!-- Founder approved this default 2026-11-04. -->
Default (my call unless the founder says otherwise): today's stops are the union of
- tubs with a visit locked today or a draft open,
- tubs whose care is due or overdue today (`careDue`: drain, filter, "usually visited by now"),
- tubs the operator **adds to today** by hand (a "Add to today" action on any status-board tile; removable).

Order: done stops first (by lock time), then the in-progress one, then the rest by urgency (problem → overdue → due). No clock times (the app has no bookings). Hand-added stops need a small additive table, `route_stop(org_id, property_id, day date, created_by, created_at)`, with RLS mirroring `task` (team members of the org). A new table on the shared DB is additive.

## Constraints
- Next.js 16 in `apps/web` (read `node_modules/next/dist/docs` first). Signed-in pages stay dynamic (CSP nonce rule). Keep the #368 perf shape: one round of parallel reads on Home, with `loading.tsx` updated to the new layout.
- Shared DB: additive migrations only, validated locally + in CI's `rls` suite before applying. Coordinator applies to prod after review.
- Brand: dark-first, Inter, tokens in `app-tokens.css`. No gradient-hue backgrounds or playful-rounded look (founder dislikes). Rings and route are inline SVG/CSS, no chart library.
- Phone-first, 320–430 px wide. Tap targets ≥ 44 px.
- Fast: no new sequential round trips; derive everything from the Home load plus `task` and `route_stop` in the same `Promise.all`.

## Left to the builder
Exact copy, the Bring mapping table, empty states (new account with no tubs; no route today), how many open-item rows a tile shows before "+N more", skeleton shapes, animation (keep it subtle), and test strategy (pure models for ordering, route, focus-card choice, progress steps, and ring state, all unit-tested like `calendar-model`).

## Out of scope
Tub page redesign (#369) · route clock times / bookings · notifications · host-visible open items.
