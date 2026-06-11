# TrackTub landing relaunch — ICP realignment & expansion

**Date:** 2026-06-11
**Status:** Approved design → ready for implementation plan
**Scope:** landing copy + new sections, PRD §1/§3/§14, marketing spec. NOT the app build (next cycle, #78) or a visual redesign.

## 1. Context & goal

The committed PRD and the live `/landing` still speak the original framing — a 3+-property STR operator, leading with "the dispute-grade evidence layer." The locked ICP (2026-06-11) is different: a **self-managed Airbnb/VRBO host in a seasonal tourist market, 1–5 properties, at least one hot tub, who manages turnovers themselves or with one cleaner.** Positioning leads with **peace of mind**, not legal/evidence language.

This work realigns the public story to that ICP, expands the landing with the content a self-managed host needs, and launches it. Three deliverables:

1. **PRD** — update §1, §3, §14 to the new ICP/positioning.
2. **Marketing spec** — write the referenced-but-missing `docs/superpowers/specs/2026-06-11-marketing-plan-design.md`.
3. **Landing** — realign copy + add sections (glassmorphism look unchanged), then promote to prod.

**Out of scope:** the app build + demo (next cycle, per Phase-2 handoff #78); any visual/aesthetic redesign; producing real pilot photos or the demo video (placeholders only — assets pending #69 / Remotion).

## 2. ICP & positioning (source of truth)

- **ICP:** self-managed STR host, seasonal market (mountain/coastal/lake), 1–5 properties, ≥1 hot tub, manages it themselves or with one cleaner. No formal tracking today.
- **Headline:** *"Know your hot tub was guest-ready — without being there."*
- **Arc:** lead with peace of mind; close with proof. Do NOT lead with "dispute-grade evidence."
- **Pricing (unchanged):** free for 1 property; ~$12/property at 2+.
- **Why not the operator/PM:** spa-service companies & large portfolios need team/dispatch features — a v2 expansion, not the v1 buyer.

## 3. Messaging principles

- Speak to the host's worry — *"I can't be at every check-in."* Every section turns a worry into relief.
- Actor language: **"you or your cleaner"** (not "your cleaners").
- Proof/evidence/dispute language stays — but as the *reassuring closer*, never the opener.
- Keep claims honest: chemistry/prevention is gated (PRD §8.8) — present it as light and forward-looking, not a shipped guarantee.
- Founder authenticity is real (the builder is the buyer), but kept subtle — no dedicated bio section (see §11 Parked); let the product lead.

## 4. Landing information architecture

Keep the existing glassmorphism system, scoped `.tt-landing` CSS, and the proof-card hero visual. ✅ = ship now · ⏳ = placeholder, asset pending.

### 1. Nav ✅
Links: **How it works · Why it matters · Pricing · FAQ** · Sign in · **Get early access**

### 2. Hero ✅ (keep proof-card visual)
- **chip:** For self-managed hosts with a hot tub
- **H1:** Know your hot **tub** was guest-ready — without being there.
- **sub:** Every turnover, you or your cleaner snap a quick guided photo set. TrackTub stamps the time, locks it, and confirms it was taken on-site — so you always have proof the tub was clean, safe, and ready, and a link to share the moment anyone asks.
- **trust:** Free for your first property · No app to install
- **CTA:** Get early access

### 3. Why it matters — peace of mind ✅
- **eyebrow:** Peace of mind
- **header:** You can't be at every check-in. Now you don't have to be.
- **Know it got done** — A clear, guided routine every turnover, so nothing gets skipped — even when someone else does the clean.
- **Know it was safe & ready** — Water level, clarity, and the control panel, captured every time. *(Coming: simple reminders so the water doesn't crash between back-to-back guests.)*
- **Prove it if anyone asks** — A timestamped, locked record and a share link — for the owner, the guest, or an Airbnb claim.

### 4. How it works — 3 steps ✅
- **eyebrow:** How it works · **header:** Three steps. Under ten minutes.
1. **Snap the guided set** — Full frame, water, control panel, cover — the same four shots every turnover, right from your phone. No app to install.
2. **It locks itself** — TrackTub stamps the time on our clock, confirms it was on-site, and locks the record so it can't be edited or back-dated.
3. **Share it or just relax** — Keep it as peace of mind, or send a one-tap link to an owner, guest, or Airbnb. They open it — no login.

### 5. What's in the record ✅ (keep the 6 cards, soften the lead)
- **header:** Everything that rides along with every turnover
- **sub:** Four photos become a record you can actually stand behind.
- Cards unchanged: 4 guided photos · server timestamp · tamper-proof record · one-tap share link · captured on-site · **dispute-ready export** (the closer).

### 6. Stays guest-ready — prevention, light ✅
- **eyebrow:** More than a clean · **header:** A tub that stays guest-ready between guests.
- **body:** Back-to-back bookings are when water chemistry crashes. TrackTub uses the photos you already take to flag cloudy water and nudge you when a heavy weekend means the tub needs attention — so the next guest steps into a tub that's actually ready. *(Rolling out as we learn what hosts need most.)*

### 7. Pricing ✅ (reframe Free)
- **header:** Start free. Add properties when you grow.
- **Free** — Your first property, free. All features, 1 property.
- **Pro** — $12 / property / mo, 2+ properties. Multi-property cockpit + dispute-ready exports.

### 8. FAQ ✅
- **Do I need a cleaner to use this?** No. Use it yourself, or hand the guided capture to whoever does your turnover — it's built for one-person operations.
- **What does my guest or owner see?** A clean, read-only link with the photos, timestamp, and verification — no login, nothing to install.
- **I already take photos. Why this?** Camera-roll photos aren't stamped on a trusted clock, locked against edits, or shareable as proof. TrackTub makes them count.
- **Is it hard to set up?** Add one property and you're capturing in a few minutes. Free to start, no card.
- **What about privacy?** The photos are yours. Share links show only what you choose to send; nothing is public.
- **Do I need to know hot tub chemistry?** No — the guided set is just photos. Simple water reminders are coming to help, not to require expertise.

### 9. Early access + demo ✅ (video ⏳ Remotion)
- **eyebrow:** Launching soon · building in public · **header:** Be one of the first hosts on TrackTub.
- **body:** We're onboarding hosts in small batches and shipping in the open. Join the early-access list, then follow the build on X.
- Waitlist + Follow @tracktub on X. Reserve a slot for the demo video.

### 10. Footer ✅ — keep.

## 5. PRD changes

- **§1 TL;DR** — lead with the host + peace of mind; demote "dispute-grade" to a supporting clause. New opening: *"TrackTub helps self-managed short-term-rental hosts know their hot tub was guest-ready — without being there — by turning each turnover into tamper-resistant proof (server timestamp, on-site verification, immutable record, shareable link)."* Keep the wedge, chemistry layer, vision, and freemium paragraphs.
- **§3 Who we serve — Buyer** — replace "Manages 3+ STR properties… feels pain past ~5" with: self-managed host, 1–5 properties, seasonal market, manages turnovers themselves or with one cleaner; holds the budget; wants peace of mind first, proof second. Note spa-service companies / larger portfolios = **v2**. Keep Submitter/Recipient roles, noting the host is often also the submitter.
- **§14 GTM** — positioning headline → the new H1; reflect the peace-of-mind lead; add the first-10 path: existing client (2 tubs) → DM outreach "do you have a system?" (not pitching) → physical demos in a tourist town → realtor warm intro; compliance: public business email / Facebook only, no Airbnb DM, no scraped lists.
- (Light: §2/§5 keep "evidence as moat" but ensure the lead framing is host/peace-of-mind, not operator/dispute. Optional minor edits.)

## 6. Marketing spec (new file)

`docs/superpowers/specs/2026-06-11-marketing-plan-design.md` — Executive summary · ICP & messaging (peace of mind → proof) · Positioning & headline · Landing IA (this doc §4) · Channels & cadence (from `.cursor/skills/goal/marketing-reference.md` + ICP memory) · First-10-customers path · Outreach compliance · SEO (title/desc, JSON-LD `SoftwareApplication`, OG, sitemap/robots) · Metrics & go/no-go gates · Appendix: feature ↔ message map. Consolidates the existing marketing-reference with the locked ICP.

## 7. Technical & SEO notes

- Keep `apps/web/src/app/landing/` structure (`page.tsx`, scoped `landing.css`, `_marks.tsx`, `LandingWaitlist.tsx`). New sections reuse the existing `.glass` / `.section` / `.eyebrow` patterns — no new design system.
- Add a small `Faq` component (semantic, keyboard-accessible) if interactive; otherwise plain markup. Other sections inline in `page.tsx` matching current style.
- SEO: update `metadata` title (≤60 chars) + description (≤160) to the new positioning; add JSON-LD `SoftwareApplication`; keep a single `<h1>`. OG/Twitter images already exist.
- CSP-safe: no new external origins, images self-hosted, no new inline handlers — stays within the current report-only CSP allowlist.
- Accessibility: heading order, WCAG-AA contrast, keyboard-navigable FAQ.
- Waitlist: reuse `LandingWaitlist` + the existing Supabase action; CTA copy "Get early access."

## 8. Launch plan

1. Implement on `worktree-landing+relaunch-icp`: PRD edits + marketing spec + landing changes.
2. Quality gate: `npm run lint && npm run typecheck && npm run test && npm run build`.
3. PR → `main`; CI green (`web` + `rls` required); self-merge.
4. QA the `main` preview → promote `main→test`, QA the test URL → `test→prod` (the production release).

## 9. Success criteria

- Landing leads with peace of mind for the self-managed host; "you or your cleaner" throughout; proof is the closer.
- New sections present (why-it-matters, how-it-works, FAQ).
- PRD §1/§3/§14 + the marketing spec reflect the locked ICP — the repo finally matches the decision.
- Live on prod; waitlist works; no new CSP violations.

## 10. Assumptions (correct any)

- Glassmorphism aesthetic unchanged; this is copy + content + docs.
- Founder/credibility section is **parked** (not shipping) — see §11.
- Pilot photo + demo video are placeholders; swap when assets land (#69 / Remotion).
- Pricing numbers unchanged ($0 / $12).

## 11. Parked (not shipping now)

- **Founder / "built by an operator" section** — cut from the landing at the founder's request (2026-06-11). Drafted blurb kept here for a possible future About page or social bio: *"I'm Ethan — I service hot tubs for short-term rentals in a seasonal market… I built TrackTub because paper logs and a camera roll full of photos weren't proof of anything. I use it on my own turnovers first. If it doesn't make my job easier, it doesn't ship."* Founder credibility instead rides quietly in the "building in public / early access" framing.
