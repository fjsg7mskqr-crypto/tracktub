# Landing Relaunch (ICP realignment) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realign the public `/landing` (and PRD §1/§3/§14 + a new marketing spec) from the old "3+-property operator / dispute-grade evidence" framing to the locked ICP — self-managed STR host, peace-of-mind lead, proof as the closer — then launch to prod.

**Architecture:** Evolve in place. Keep the approved glassmorphism system and the scoped `.tt-landing` CSS; this is **copy + new content sections + docs**, not a visual redesign. New sections reuse existing classes (`.section`, `.feat`/`.fcard`, `.glass`, `.price`); only the FAQ accordion and a numbered step-chip need new CSS. Spec: `docs/superpowers/specs/2026-06-11-landing-relaunch-design.md`.

**Tech Stack:** Next.js 15 (App Router), React 19, scoped CSS (`landing.css`), Supabase waitlist (existing `LandingWaitlist`), Vitest (existing suites must stay green).

**Verification note:** This is static marketing content, so per-task verification is **`npm run lint && typecheck && build` + visual QA**, not new per-line unit tests. The existing suites (`security-headers`, `env`, `url`, `email`, `middleware-session`) MUST stay green, and CSP must not gain new external origins. Run the dev server (`npm run dev -- -p 3001`) to eyeball each section.

---

## File Structure

- **Modify** `docs/PRD.md` — §1 TL;DR, §3 Buyer, §14 GTM (positioning text only).
- **Create** `docs/superpowers/specs/2026-06-11-marketing-plan-design.md` — the referenced-but-missing marketing plan.
- **Modify** `apps/web/src/app/landing/landing.css` — add FAQ accordion, numbered step chip, prose panel.
- **Create** `apps/web/src/app/landing/Faq.tsx` — semantic `<details>` accordion (no JS).
- **Modify** `apps/web/src/app/landing/page.tsx` — nav links, hero copy, 2 new sections (Why it matters, How it works), softened showcase header, prevention panel, pricing copy, FAQ wiring, early-access copy, SEO metadata + JSON-LD.

Work the docs first (Tasks 1–2), then CSS (Task 3) so sections can use it, then page sections top-to-bottom (Tasks 4–11), then gate + ship (Tasks 12–14).

---

### Task 1: PRD positioning edits

**Files:** Modify `docs/PRD.md` (§1 line ~22, §3 lines ~46-47, §14 lines ~295-300)

- [ ] **Step 1: §1 TL;DR — replace the opening sentence.** Find the sentence starting "TrackTub is the **dispute-grade evidence layer for short-term-rental (STR) turnovers**…" and replace with:

> TrackTub helps **self-managed short-term-rental hosts** know their hot tub was **guest-ready — without being there**, by turning each turnover into tamper-resistant proof (server timestamp, verified submitter, capture-time geolocation + geofence, immutable record, audit log, signed PDF). The "dispute-grade evidence" is the reassurance underneath — it's how a host can settle an owner or guest question — not the lead.

Keep the rest of §1 (wedge, chemistry layer, freemium, validation) unchanged.

- [ ] **Step 2: §3 Buyer — replace the buyer paragraph.** Under "### Buyer / primary user", replace the `[Hypothesis]` line ("Manages **3+ STR properties**…") with:

> `[Decision 2026-06-11]` A **self-managed Airbnb/VRBO host** in a seasonal tourist market (mountain/coastal/lake), **1–5 properties**, at least one with a hot tub, who manages turnovers **themselves or with one cleaner**. Tracks nothing formally today. Wants **peace of mind first** (was it guest-ready?), **proof second** (can I show it?). Larger portfolios and spa-service companies need team/dispatch features — a **v2** expansion, not the v1 buyer.

Update the heading from "STR operator or property manager" to "self-managed STR host". Leave Submitter/Recipient sections, but add to Submitter: "Often the host themselves on a 1–5 property operation."

- [ ] **Step 3: §14 GTM — update positioning + path.** Replace the "**Positioning:**" bullet with: `**Positioning:** "Know your hot tub was guest-ready — without being there." Lead with peace of mind; close with proof. Avoid leading with "dispute-grade evidence" — too abstract for this buyer.` Then add a bullet: `**First 10 customers:** existing client (2 tubs) → DM outreach "do you have a system?" (not pitching) → physical demos in a tourist town → realtor warm intro. Public business email / Facebook only; no Airbnb DM, no scraped lists.`

- [ ] **Step 4: Verify build unaffected & commit.**

```bash
cd apps/web && npm run lint && cd ../..
git add docs/PRD.md
git commit -m "docs(prd): retarget §1/§3/§14 to the self-managed-host ICP"
```

---

### Task 2: Write the marketing spec

**Files:** Create `docs/superpowers/specs/2026-06-11-marketing-plan-design.md`

- [ ] **Step 1: Write the file** with these sections (content drawn from `.cursor/skills/goal/marketing-reference.md` + the ICP memory + the landing-relaunch spec §4):

```markdown
# TrackTub marketing plan & positioning

**Date:** 2026-06-11 · **Status:** active

## Executive summary
Self-managed STR hosts with a hot tub have no trustworthy record that the tub was guest-ready. TrackTub gives them peace of mind (was it done, was it ready) and proof (a shareable, tamper-resistant record). Freemium: free for 1 property, ~$12/property at 2+.

## ICP & messaging
- **ICP:** self-managed Airbnb/VRBO host, seasonal market, 1–5 properties, ≥1 hot tub, manages it themselves or with one cleaner. No formal tracking today.
- **Arc:** peace of mind → proof. Actor = "you or your cleaner". Don't lead with "dispute-grade evidence".

## Positioning & headline
"Know your hot tub was guest-ready — without being there."
Hooks: peace of mind · know it got done · prove it if anyone asks.

## Landing IA
(Mirror of `2026-06-11-landing-relaunch-design.md` §4: hero → why it matters → how it works → what's in the record → stays guest-ready → pricing → FAQ → early access.)

## Channels & cadence
Ranked: regional STR Facebook groups → BiggerPockets STR forum → LinkedIn → host meetups → YouTube/Loom demo → Instagram (optional). Reddit/X = learning only. Cadence per `.cursor/skills/goal/marketing-reference.md`.

## First-10-customers path
Existing client (2 tubs) → DM "do you have a system?" → physical demos in a tourist town → realtor warm intro.

## Outreach compliance
Public business email / Facebook page only. No Airbnb app messaging, no personal contact scraped from listings, no bought lists, no group spam.

## SEO
- title ≤60 chars, description ≤160, single h1, keyword in first 100 words.
- JSON-LD SoftwareApplication on the landing.
- OG/Twitter cards (1200×630) — already present.
- robots noindex on /login, /add-property, app routes; sitemap for marketing pages.
- Avoid bidding on "hot tub app" / "spa maintenance" (consumer intent).

## Metrics & go/no-go gates
Landing → free signup ≥5%; outreach → interview ≥15%; week-1 activation ≥60%; proof-link shared ≥~30%. (See PRD §16.)

## Appendix: feature ↔ message map
| Feature | Message |
|---|---|
| 4 guided photos | Know it got done |
| server timestamp + lock | Prove it if anyone asks |
| on-site geofence | It really happened, on-site |
| share link | No login for owner/guest |
| chemistry reminders (gated) | Stays guest-ready between guests |
```

- [ ] **Step 2: Commit.**

```bash
git add docs/superpowers/specs/2026-06-11-marketing-plan-design.md
git commit -m "docs(spec): add the 2026-06-11 marketing plan referenced by the PRD"
```

---

### Task 3: Add new landing CSS

**Files:** Modify `apps/web/src/app/landing/landing.css` (append before the `@media (prefers-reduced-motion…)` block, ~line 809)

- [ ] **Step 1: Append the new styles.** They reuse existing tokens (`--blue`, `--gline`, `--white`, `--slate4`, `--lmono`, `--disp`).

```css
/* numbered step chip — reuses .ichip box in the .feat grid */
.tt-landing .ichip.num {
  font-family: var(--disp);
  font-weight: 700;
  font-size: 20px;
  color: #fff;
  background: linear-gradient(135deg, var(--blue), var(--blue2));
}

/* single-column prose panel (prevention) */
.tt-landing .panel {
  padding: 26px 30px;
  max-width: 760px;
}
.tt-landing .panel p {
  color: var(--slate3);
  font-size: 16px;
  margin: 0;
}

/* FAQ accordion — native <details>, no JS */
.tt-landing .faq {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 760px;
}
.tt-landing .faq details {
  border: 1px solid var(--gline);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  padding: 0 18px;
}
.tt-landing .faq summary {
  list-style: none;
  cursor: pointer;
  padding: 16px 0;
  font-family: var(--disp);
  font-weight: 600;
  font-size: 15.5px;
  color: var(--white);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.tt-landing .faq summary::-webkit-details-marker {
  display: none;
}
.tt-landing .faq summary::after {
  content: "+";
  font-family: var(--lmono);
  font-size: 18px;
  color: var(--bluel);
  flex: none;
}
.tt-landing .faq details[open] summary::after {
  content: "\2013";
}
.tt-landing .faq details p {
  margin: 0 0 16px;
  color: var(--slate4);
  font-size: 14.5px;
  line-height: 1.55;
}
```

- [ ] **Step 2: Verify build & commit.**

```bash
cd apps/web && npm run lint && npm run build && cd ../..
git add apps/web/src/app/landing/landing.css
git commit -m "feat(landing): styles for FAQ accordion, step chip, prose panel"
```
Expected: build succeeds.

---

### Task 4: Hero + nav copy

**Files:** Modify `apps/web/src/app/landing/page.tsx` (nav `navlinks` ~37-39; hero chip/h1/sub/trust ~68-86; CTA button labels)

- [ ] **Step 1: Update nav links.** Replace the three `navlinks` anchors with:

```tsx
<a href="#why">Why it matters</a>
<a href="#how">How it works</a>
<a href="#pricing">Pricing</a>
<a href="#faq">FAQ</a>
```
And change the "Join the waitlist" nav button text to `Get early access` (keep `href="#join"`).

- [ ] **Step 2: Replace the hero chip + h1 + sub + trust.**

```tsx
<span className="chip">
  <span className="dot" />
  For self-managed hosts with a hot tub
</span>
<h1 style={{ marginTop: 18 }}>
  Know your hot <span className="tub">tub</span> was guest-ready — without being there.
</h1>
<p className="sub">
  Every turnover, you or your cleaner snap a quick guided photo set. TrackTub
  stamps the time, locks it, and confirms it was taken on-site — so you always
  have proof the tub was clean, safe, and ready, and a link to share the moment
  anyone asks.
</p>
<LandingWaitlist />
<div className="trust">
  <span className="vchip">
    <Check color="#34D399" w={3} />
    Free for your first property
  </span>
  <span>No app to install · ~$12/property at 2+</span>
</div>
```
Keep the `proofwrap`/proof-card block unchanged.

- [ ] **Step 3: Verify & commit.**

```bash
cd apps/web && npm run lint && npm run build && cd ../..
git add apps/web/src/app/landing/page.tsx
git commit -m "feat(landing): peace-of-mind hero + host-framed nav"
```
Visual QA at `npm run dev -- -p 3001`: hero leads with the new headline; nav has 4 anchors.

---

### Task 5: "Why it matters" section (peace of mind)

**Files:** Modify `page.tsx` — insert a new `.section` immediately AFTER the `divider` block (~line 133) and BEFORE the existing "FEATURE SHOWCASE" (`id="how"`).

- [ ] **Step 1: Insert the section.** Reuses `.section` / `.eyebrow` / `.sechead` / `.feat` / `.fcard` / `.ichip`.

```tsx
{/* WHY IT MATTERS */}
<div className="section" id="why">
  <span className="eyebrow">Peace of mind</span>
  <div className="sechead">
    <h2>You can&rsquo;t be at every check-in. Now you don&rsquo;t have to be.</h2>
  </div>
  <div className="feat">
    <div className="glass fcard">
      <div className="ichip" style={{ background: "linear-gradient(135deg,#60A5FA,#2563EB)" }}>
        <svg width="23" height="23" viewBox="0 0 24 24" className="ic"><path d="M5 12.5l4 4 9-10" /></svg>
      </div>
      <h3>Know it got done</h3>
      <p>A clear, guided routine every turnover, so nothing gets skipped — even when someone else does the clean.</p>
    </div>
    <div className="glass fcard">
      <div className="ichip" style={{ background: "linear-gradient(135deg,#3B82F6,#1D4ED8)" }}>
        <svg width="23" height="23" viewBox="0 0 24 24" className="ic"><path d="M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.6" /></svg>
      </div>
      <h3>Know it was safe &amp; ready</h3>
      <p>Water level, clarity, and the control panel, captured every time. <em>Coming: reminders so the water doesn&rsquo;t crash between back-to-back guests.</em></p>
    </div>
    <div className="glass fcard">
      <div className="ichip" style={{ background: "linear-gradient(135deg,#93C5FD,#3B82F6)" }}>
        <svg width="23" height="23" viewBox="0 0 24 24" className="ic"><path d="M7 3.5h7l4 4v13H7z" /><path d="M9.5 13l2 2 3.5-4" /></svg>
      </div>
      <h3>Prove it if anyone asks</h3>
      <p>A timestamped, locked record and a share link — for the owner, the guest, or an Airbnb claim.</p>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Verify & commit.**

```bash
cd apps/web && npm run lint && npm run build && cd ../..
git add apps/web/src/app/landing/page.tsx
git commit -m "feat(landing): add 'why it matters' peace-of-mind section"
```

---

### Task 6: "How it works" section (3 steps)

**Files:** Modify `page.tsx` — change the existing FEATURE SHOWCASE `id="how"` to `id="record"`, then insert a NEW "how it works" section before it (so `#how` from the nav lands on the steps).

- [ ] **Step 1: Re-id the showcase.** On the existing showcase `<div className="section" id="how">`, change `id="how"` → `id="record"`.

- [ ] **Step 2: Insert the steps section** before the showcase. Reuses `.feat` grid with a numbered `.ichip.num`.

```tsx
{/* HOW IT WORKS */}
<div className="section" id="how">
  <span className="eyebrow">How it works</span>
  <div className="sechead">
    <h2>Three steps. Under ten minutes.</h2>
  </div>
  <div className="feat">
    <div className="glass fcard">
      <div className="ichip num">1</div>
      <h3>Snap the guided set</h3>
      <p>Full frame, water, control panel, cover — the same four shots every turnover, right from your phone. No app to install.</p>
    </div>
    <div className="glass fcard">
      <div className="ichip num">2</div>
      <h3>It locks itself</h3>
      <p>TrackTub stamps the time on our clock, confirms it was on-site, and locks the record so it can&rsquo;t be edited or back-dated.</p>
    </div>
    <div className="glass fcard">
      <div className="ichip num">3</div>
      <h3>Share it or just relax</h3>
      <p>Keep it as peace of mind, or send a one-tap link to an owner, guest, or Airbnb. They open it — no login.</p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verify & commit.**

```bash
cd apps/web && npm run lint && npm run build && cd ../..
git add apps/web/src/app/landing/page.tsx
git commit -m "feat(landing): add 'how it works' 3-step section"
```
Visual QA: nav "How it works" scrolls to the steps; numbered chips render.

---

### Task 7: Soften the "what's in the record" header

**Files:** Modify `page.tsx` — the showcase `sechead` (~137-141)

- [ ] **Step 1: Replace the eyebrow + sechead** so it reads as reassurance, with proof as the closer (the 6 cards stay unchanged):

```tsx
<span className="eyebrow">What&rsquo;s in the record</span>
<div className="sechead">
  <h2>Everything that rides along with every turnover</h2>
  <p>Four photos become a record you can actually stand behind.</p>
</div>
```

- [ ] **Step 2: Verify & commit.**

```bash
cd apps/web && npm run lint && cd ../..
git add apps/web/src/app/landing/page.tsx
git commit -m "feat(landing): soften the record-section lead toward reassurance"
```

---

### Task 8: "Stays guest-ready" prevention panel

**Files:** Modify `page.tsx` — insert after the showcase section, before PRICING.

- [ ] **Step 1: Insert a light prose panel** (kept modest — chemistry is gated in PRD §8.8):

```tsx
{/* STAYS GUEST-READY */}
<div className="section" id="ready">
  <span className="eyebrow">More than a clean</span>
  <div className="sechead">
    <h2>A tub that stays guest-ready between guests.</h2>
  </div>
  <div className="glass panel">
    <p>
      Back-to-back bookings are when water chemistry crashes. TrackTub uses the
      photos you already take to flag cloudy water and nudge you when a heavy
      weekend means the tub needs attention — so the next guest steps into a tub
      that&rsquo;s actually ready. <em>(Rolling out as we learn what hosts need most.)</em>
    </p>
  </div>
</div>
```

- [ ] **Step 2: Verify & commit.**

```bash
cd apps/web && npm run lint && npm run build && cd ../..
git add apps/web/src/app/landing/page.tsx
git commit -m "feat(landing): add light 'stays guest-ready' prevention panel"
```

---

### Task 9: Pricing copy reframe

**Files:** Modify `page.tsx` — pricing `sechead` + Free card copy (~324-344)

- [ ] **Step 1: Reframe.** Change the pricing `sechead h2` to `Start free. Add properties when you grow.` Change the Free card `.d` to `Your first property — free. All features.` Leave the Pro card and all feature lists/prices unchanged.

- [ ] **Step 2: Verify & commit.**

```bash
cd apps/web && npm run lint && cd ../..
git add apps/web/src/app/landing/page.tsx
git commit -m "feat(landing): reframe pricing for the single-property host"
```

---

### Task 10: FAQ component + section

**Files:** Create `apps/web/src/app/landing/Faq.tsx`; modify `page.tsx` (import + section before the CTA).

- [ ] **Step 1: Create `Faq.tsx`.**

```tsx
const FAQS: { q: string; a: string }[] = [
  { q: "Do I need a cleaner to use this?", a: "No. Use it yourself, or hand the guided capture to whoever does your turnover — it's built for one-person operations." },
  { q: "What does my guest or owner see?", a: "A clean, read-only link with the photos, timestamp, and verification — no login, nothing to install." },
  { q: "I already take photos. Why this?", a: "Camera-roll photos aren't stamped on a trusted clock, locked against edits, or shareable as proof. TrackTub makes them count." },
  { q: "Is it hard to set up?", a: "Add one property and you're capturing in a few minutes. Free to start, no card." },
  { q: "What about privacy?", a: "The photos are yours. Share links show only what you choose to send; nothing is public." },
  { q: "Do I need to know hot tub chemistry?", a: "No — the guided set is just photos. Simple water reminders are coming to help, not to require expertise." },
];

export function Faq() {
  return (
    <div className="faq">
      {FAQS.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `page.tsx`.** Add `import { Faq } from "./Faq";` near the other imports, and insert before the LAUNCH/CTA block:

```tsx
{/* FAQ */}
<div className="section" id="faq">
  <span className="eyebrow">Questions</span>
  <div className="sechead">
    <h2>The stuff hosts ask first.</h2>
  </div>
  <Faq />
</div>
```

- [ ] **Step 3: Verify & commit.**

```bash
cd apps/web && npm run lint && npm run typecheck && npm run build && cd ../..
git add apps/web/src/app/landing/Faq.tsx apps/web/src/app/landing/page.tsx
git commit -m "feat(landing): add FAQ accordion section"
```
Visual QA: each item expands/collapses; keyboard (Tab/Enter) works.

---

### Task 11: Early-access copy + SEO metadata + JSON-LD

**Files:** Modify `page.tsx` — CTA block copy (~370-377), `metadata` export (~7-11), and add JSON-LD.

- [ ] **Step 1: CTA copy.** In the `cta` block, change the `<h2>` to `Be one of the first hosts on TrackTub.` and the `<p>` to: `We're onboarding hosts in small batches and shipping in the open. Join the early-access list, then follow the build on X.`

- [ ] **Step 2: SEO metadata.** Replace the `metadata` export:

```tsx
export const metadata: Metadata = {
  title: "TrackTub — know your hot tub was guest-ready",
  description:
    "For self-managed STR hosts: capture each hot-tub turnover, lock it as tamper-proof proof, and share it in one tap. Free for your first property.",
};
```
(title 49 chars, description 156 chars — within limits.)

- [ ] **Step 3: JSON-LD.** At the top of the returned `<div className="tt-landing">`, add a SoftwareApplication block (inline JSON-LD is allowed under the current report-only CSP; the scheduled #41 nonce work will carry it forward):

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "TrackTub",
      applicationCategory: "BusinessApplication",
      description:
        "Guest-ready hot tub proof for self-managed short-term-rental hosts.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    }),
  }}
/>
```

- [ ] **Step 4: Verify & commit.**

```bash
cd apps/web && npm run lint && npm run typecheck && npm run build && cd ../..
git add apps/web/src/app/landing/page.tsx
git commit -m "feat(landing): early-access copy + ICP-aligned SEO metadata + JSON-LD"
```

---

### Task 12: Full quality gate

- [ ] **Step 1: Run the whole gate.**

```bash
cd apps/web
npm run lint && npm run typecheck && npm run test && npm run build
cd ../..
```
Expected: lint clean, typecheck clean, all existing tests pass (security-headers etc.), build succeeds. Fix anything red before proceeding; the landing change must NOT alter the security-headers test outcome (no new CSP origins).

- [ ] **Step 2: Visual QA pass** at `npm run dev -- -p 3001`: scroll the full page — hero, why-it-matters, how-it-works, record, stays-guest-ready, pricing, FAQ, early-access, footer. Check the 880px and 560px breakpoints (nav links hide; grids collapse). Confirm the waitlist form still submits.

---

### Task 13: PR → main

- [ ] **Step 1: Push & open the PR.**

```bash
git push -u origin HEAD
gh pr create --base main --title "feat(landing): relaunch on the self-managed-host ICP" \
  --body "Realigns /landing to peace-of-mind positioning (PRD §1/§3/§14 + new marketing spec). New sections: why-it-matters, how-it-works, stays-guest-ready, FAQ. Keeps the glassmorphism aesthetic. Spec: docs/superpowers/specs/2026-06-11-landing-relaunch-design.md"
```

- [ ] **Step 2: Wait for CI.** Required checks `web (lint · typecheck · build)` and `rls (isolation suite · ephemeral supabase)` must pass. (SonarCloud may flag new-code coverage — non-blocking.) Then `gh pr merge --squash`.

---

### Task 14: Launch (promote to prod)

- [ ] **Step 1: QA the `main` preview** (Vercel preview URL from the merged PR).

- [ ] **Step 2: Promote to staging.**

```bash
gh pr create --base test --head main --title "Promote to test: landing relaunch"
# merge → QA the test URL
```

- [ ] **Step 3: Promote to prod (the live release).**

```bash
gh pr create --base prod --head test --title "Promote to prod: landing relaunch"
# merge → tracktub.com serves the relaunched landing
```

- [ ] **Step 4: Verify live** — load tracktub.com, confirm the new hero + sections, submit a test waitlist entry, and check Sentry for any new CSP report-only violations from the JSON-LD/script (should be none under report-only).

---

## Self-review

- **Spec coverage:** hero ✅(T4) · why-it-matters ✅(T5) · how-it-works ✅(T6) · record-soften ✅(T7) · stays-guest-ready ✅(T8) · pricing ✅(T9) · FAQ ✅(T10) · early-access+SEO ✅(T11) · PRD §1/§3/§14 ✅(T1) · marketing spec ✅(T2) · launch ✅(T14). Founder section intentionally omitted (parked, spec §11).
- **Placeholders:** none — every section has its exact copy and JSX.
- **Consistency:** nav anchors (`#why`,`#how`,`#pricing`,`#faq`) match the section `id`s created in T5/T6/T9/T10; showcase re-id'd to `#record` (T6) so `#how` lands on the steps. `.ichip.num` (T3) used in T6. `Faq` export name (T10) matches its import.
- **Verification honesty:** static-content change → build + visual QA, existing suites stay green; no new unit tests claimed.
