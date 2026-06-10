# Public Landing Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship the founder-approved `/landing` (see spec: issue #34 comment, 2026-06-09) as a public, brand-correct page, with the waitlist persisting to Supabase.

**Architecture:** Build `/landing` as a **self-contained page** (its own nav + footer + scoped CSS), bypass the demo `Shell` chrome for `/landing` (the pattern `/proof` already uses), and make it **public** in middleware. Styling is a **scoped vanilla CSS file** ported from the locked mockup — NOT global Tailwind — so the existing hand-rolled demo/auth pages are untouched (outage-sensitive). Full Tailwind design system (#32) + route-group restructure (#33) remain separate. Waitlist → Supabase `waitlist` table (RLS: anon insert only) + a server action.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `next/font` (Inter + JetBrains Mono — brand fonts; the mockup's Space Grotesk/DM Sans were placeholders), Supabase (`@supabase/ssr`), scoped CSS.

**Reference:** mockup at `.superpowers/brainstorm/45410-1781037778/content/tracktub-landing-v10.html` (gitignored). The 4 proof photos are saved at `/tmp/p-{full,water,panel,cover}.jpg`.

---

## File structure

- Create `apps/web/public/landing/{full,water,panel,cover}.jpg` — self-hosted proof photos (placeholder licensed stock; ⚠ swap for real pilot photos before launch).
- Create `apps/web/src/app/landing/landing.css` — scoped styles (all selectors under `.tt-landing`), ported from the mockup.
- Rewrite `apps/web/src/app/landing/page.tsx` — the page, composed of section components.
- Create `apps/web/src/app/landing/_components/` — `Nav.tsx`, `Hero.tsx`, `ProofCard.tsx`, `FeatureShowcase.tsx`, `Pricing.tsx`, `LaunchSection.tsx`, `SiteFooter.tsx`, `BrandMark.tsx` (mark + lockup + waterline inline SVGs).
- Modify `apps/web/src/components/Shell.tsx` — add `/landing` to the chrome-bypass branch (alongside `/proof`).
- Modify `apps/web/src/lib/supabase/middleware.ts` — add `"/landing"` to `PUBLIC_PATHS`.
- Modify `apps/web/src/components/WaitlistForm.tsx` — call the server action; loading → success/error states; real `<label>`; validate on blur.
- Create `apps/web/src/app/landing/actions.ts` — `joinWaitlist(formData)` server action inserting into Supabase.
- Supabase migration (via MCP `apply_migration`) — `waitlist` table + RLS.

---

## Phase 1 — Landing UI live (no backend dependency)

### Task 1: Self-host the proof photos
**Files:** Create `apps/web/public/landing/{full,water,panel,cover}.jpg`

- [ ] **Step 1:** Copy the four chosen, resized images into the repo:
```bash
mkdir -p apps/web/public/landing
cp /tmp/p-full.jpg  apps/web/public/landing/full.jpg
cp /tmp/p-water.jpg apps/web/public/landing/water.jpg
cp /tmp/p-panel.jpg apps/web/public/landing/panel.jpg
cp /tmp/p-cover.jpg apps/web/public/landing/cover.jpg
ls -l apps/web/public/landing
```
Expected: four jpgs present.
- [ ] **Step 2: Commit** `git add apps/web/public/landing && git commit -m "feat(landing): add proof-card photos (placeholder licensed stock — swap before launch)"`

### Task 2: Scoped landing CSS
**Files:** Create `apps/web/src/app/landing/landing.css`

- [ ] **Step 1:** Port the mockup's `<style>` into `landing.css`, wrapping every selector under a root class `.tt-landing` (so it cannot leak into demo/auth pages). Map fonts to the existing CSS vars: `--font-inter` (display) and `--font-jbmono` (mono); body text uses Inter too (DM Sans was a placeholder). Keep the data-URI photos OUT — reference `/landing/*.jpg` instead. Keep: glass tokens, brand colors, grain, waterline, proof card, the 6 `.ui` components + map, pricing, launch, footer, focus rings, `prefers-reduced-motion`.
- [ ] **Step 2: Verify** `cd apps/web && npm run lint` (CSS import resolves; no TS yet). Expected: pass.
- [ ] **Step 3: Commit** `git commit -am "feat(landing): scoped landing stylesheet"`

### Task 3: Brand primitives + section components
**Files:** Create `apps/web/src/app/landing/_components/*.tsx`

- [ ] **Step 1:** `BrandMark.tsx` — export `Mark`, `Lockup`, `Waterline` (inline SVGs from `branding/` — mark `logo/mark/tracktub-mark-color-dark.svg`, lockup `logo/lockup/tracktub-horizontal-color-dark.svg`, device `device/waterline.svg`).
- [ ] **Step 2:** Build `Nav`, `Hero`, `ProofCard`, `FeatureShowcase`, `Pricing`, `LaunchSection`, `SiteFooter` as faithful JSX of the mockup sections (photos via `next/image` or `<img src="/landing/full.jpg">`; proof card uses the renamed "Lakeside Cottage · Jun 7, 2026", plain-English metadata, "✓ TrackTub verified"; 6 cards with their mini-UIs incl. the SVG geofence map; launch section + `Follow @tracktub on X`; footer with X icon). Reuse existing `WaitlistForm` in Hero + LaunchSection.
- [ ] **Step 3:** Rewrite `page.tsx` to import `landing.css` and render `<div className="tt-landing">` wrapping the sections.
- [ ] **Step 4: Verify** `npm run lint && npm run typecheck && npm run build`. Expected: green.
- [ ] **Step 5: Commit** `git commit -am "feat(landing): rebuild /landing from the locked design (self-contained, scoped)"`

### Task 4: Make /landing public + chrome-free
**Files:** Modify `Shell.tsx`, `middleware.ts`

- [ ] **Step 1:** In `Shell.tsx`, extend the bypass: `if (pathname.startsWith("/proof") || pathname.startsWith("/landing")) return <>{children}</>;`
- [ ] **Step 2:** In `middleware.ts`, `PUBLIC_PATHS = ["/login", "/auth/callback", "/landing"]`. (Tiny change — outage-sensitive lane.)
- [ ] **Step 3: Verify** `npm run dev -- -p 3001`, load `/landing` logged-out → renders the marketing page (no demo chrome, no login redirect). Run `npm run lint && npm run typecheck && npm run build`.
- [ ] **Step 4: Commit** `git commit -am "feat(landing): make /landing public and chrome-free"`

**→ Checkpoint: open PR for Phase 1 (landing live, waitlist still localStorage). Self-merge on green CI.**

---

## Phase 2 — Waitlist persists to Supabase

### Task 5: `waitlist` table + RLS
**Files:** Supabase migration (MCP `apply_migration`, project `slkxwpiiludisrnwnxlg`)

- [ ] **Step 1:** Apply migration:
```sql
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'landing',
  created_at timestamptz not null default now()
);
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));
alter table public.waitlist enable row level security;
-- anon may INSERT only; no SELECT/UPDATE/DELETE for anon (privacy)
create policy "anon can join waitlist" on public.waitlist
  for insert to anon with check (true);
```
- [ ] **Step 2: Verify RLS** via MCP role-impersonation in a rolled-back transaction (per memory `supabase-rls-verification`): anon INSERT succeeds; anon SELECT returns 0/denied.

### Task 6: Server action + form wiring (TDD on validation)
**Files:** Create `actions.ts`; Modify `WaitlistForm.tsx`; Test `_components/__tests__/waitlist.test.ts`

- [ ] **Step 1: Write failing test** for email validation helper `normalizeEmail`:
```ts
import { normalizeEmail } from "../actions";
it("lowercases + trims, rejects junk", () => {
  expect(normalizeEmail("  A@B.com ")).toBe("a@b.com");
  expect(() => normalizeEmail("nope")).toThrow();
});
```
- [ ] **Step 2: Run** `npm run test -- waitlist` → FAIL (no export).
- [ ] **Step 3: Implement** `normalizeEmail` + `joinWaitlist(formData)` server action: validate, insert via the anon server client, map unique-violation to a friendly "you're already on the list", return `{ok}|{error}`.
- [ ] **Step 4: Run** `npm run test -- waitlist` → PASS.
- [ ] **Step 5:** Update `WaitlistForm.tsx`: real `<label htmlFor>`, validate on blur, `useFormStatus`/state for loading → success/error, replace the localStorage stash with the action.
- [ ] **Step 6: Verify** `npm run lint && npm run typecheck && npm run build`; manual: submit on `/landing` (dev) → row appears in Supabase; duplicate → friendly message.
- [ ] **Step 7: Commit** `git commit -am "feat(landing): wire waitlist to Supabase (RLS anon-insert) with loading/success/error states"`

**→ Checkpoint: open PR for Phase 2. Self-merge on green CI. Then promote main→test→prod per CLAUDE.md when ready.**

---

## Self-review notes
- **Spec coverage:** nav/hero/proof/showcase/pricing/launch/footer = Task 3; public = Task 4; waitlist = Tasks 5–6; photos = Task 1. ✓
- **Deferred (tracked, not silently dropped):** global Tailwind v4 design system = #32; full `(marketing)`/`(app)`/`bare` route groups = #33; real pilot photos (swap placeholders) = note in #34; final display/subtext fonts = founder's parallel work (swap the `--font-*` vars).
- **Fonts:** plan uses Inter + JetBrains Mono (already wired in root layout); when the founder's fonts land, swap the `next/font` imports + CSS vars — no markup change.
