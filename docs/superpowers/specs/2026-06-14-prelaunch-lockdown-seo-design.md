# Pre-launch lockdown + SEO foundation — design

**Date:** 2026-06-14
**Status:** Approved (founder)
**Author:** Claude (landing-page owner agent)

## Problem

Two related problems with what TrackTub exposes to the public:

1. **Discoverability** — the founder can't find TrackTub via search. Audit shows
   good metadata + JSON-LD already exist, but there is **no `sitemap.xml` and no
   `robots.txt`** (both prescribed in `2026-06-11-marketing-plan-design.md` but
   never built), and the domain hasn't been submitted to Google Search Console.

2. **Premature exposure** — the app is currently **self-serve on prod**: anyone
   can hit `/login`, sign in with Google, and get an auto-provisioned workspace
   (`src/lib/role.ts:18`). The founder wants a **pre-launch lockdown**: the
   public should reach **only `/landing` and `/blog`**; the entire app is the
   founder's alone until launch.

A blog (the original ask) is the long-term content play for SEO, but it is
**deferred** until the founder supplies source docs — tracked as its own issue.

## Decisions (from founder)

- **Authoring (future blog):** agent-authored Markdown/MDX in-repo, via PR, from
  founder-supplied source docs. No CMS, no new service/cost.
- **Sequencing:** SEO foundation + lockdown first; blog second.
- **Access gate identity:** Google login + `ADMIN_EMAILS` allowlist (already used
  by `src/app/insights/page.tsx`). Only allowlisted emails reach the app.
- **Rollout:** land on `main`, then promote `test → prod` now, to close the
  current open-signup exposure. `ADMIN_EMAILS` must be set in prod first so the
  founder is not locked out.

## Part A — Pre-launch access lockdown

**Goal:** public reaches only `/landing` and `/blog`; app is admin-only.

### A1. Middleware gate (`src/lib/supabase/middleware.ts`)
Preserve the existing outage-hardened structure (never throw → never a site-wide
500; fail-open on missing/invalid env or Supabase errors). Change only the
*gate decision* for non-public paths:

- **Public paths** (no session required): `/landing`, `/blog`, `/login`,
  `/auth/callback`. (`/proof` and `/invite` are *removed* from the public set
  for the pre-launch window — they are capability links nobody holds yet, and
  the founder wants strictly landing+blog public. Revisit at launch.)
- **Non-public paths:** require a signed-in user **whose email is in
  `ADMIN_EMAILS`**. Otherwise redirect to `/landing` (fail **closed** for the
  gate decision).
- **Environment scope:** enforce the admin requirement only when
  `NODE_ENV === "production"` (prod + Vercel preview builds). In local dev the
  app stays open so the seeded localhost demo and `/dev` login bypass keep
  working unchanged. The pre-existing "logged-out → redirect" behavior is
  unchanged in all envs.

`ADMIN_EMAILS` parsing reuses the existing pattern (comma-split, trim,
lowercase). Extracted into a small shared helper `src/lib/admin.ts`
(`isAdminEmail(email)`) so middleware and `insights/page.tsx` share one source
of truth.

### A2. Auth-callback guard (`src/app/auth/callback/route.ts`)
After a successful `exchangeCodeForSession` / `verifyOtp`, fetch the user; if the
email is not an admin (only enforced when `NODE_ENV === "production"`), sign them
out and redirect to `/landing`. Prevents non-admins from ever holding a session
or using an auto-provisioned workspace. Admins continue to `next` (default `/`).

### A3. Fail-safe behavior
- Gate decision fails **closed** (→ `/landing`).
- Outage protection unchanged: env-missing / exception paths still pass through
  without throwing (pages self-protect via their own `getEnv()` + RLS). If
  `ADMIN_EMAILS` is empty in prod, the happy-path gate denies everyone
  (including the founder) — setting it is a required owner step.

## Part B — SEO foundation

- **B1. `src/app/robots.ts`** — `allow: ["/landing", "/blog"]`; `disallow: ["/"]`
  scoped so app/auth/api paths are excluded while landing+blog are explicitly
  allowed; reference the sitemap URL. Built off `getURL()`.
- **B2. `src/app/sitemap.ts`** — emit `sitemap.xml` for indexable URLs
  (`/landing` now; blog posts added in Part C) with `lastModified`, off
  `getURL()`.
- **B3. `noindex`** — add `robots: { index: false, follow: false }` metadata to
  `/login` (defense-in-depth; app routes are gated anyway).
- **B4. Google Search Console** — wire `metadata.verification.google` from
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (no-op when unset). Provide the founder
  a short checklist: add the env var, redeploy, verify the property, submit
  `sitemap.xml`.

## Part C — Blog (deferred)

Separate GitHub issue. When the founder supplies source docs: in-repo MDX,
`/blog` index + `/blog/[slug]`, `BlogPosting` JSON-LD, sitemap entries, on-brand
design matching `/landing`. Not built in this change.

## Testing

- **Unit:** `isAdminEmail` (allowlist parsing: empty, whitespace, case, multi).
- **Unit/logic:** a pure helper for the gate decision
  (`gateDecision({ path, user, isProd })` → `"allow" | "/landing" | "/login"`)
  so the redirect matrix is tested without a live request:
  - logged-out + `/team` → `/landing`
  - logged-out + `/landing`, `/blog`, `/login` → allow
  - non-admin user + `/team` (prod) → `/landing`
  - admin user + `/team` (prod) → allow
  - non-admin user + `/team` (dev) → allow (gate off in dev)
- **Build/lint/typecheck** green.
- **Manual (localhost):** logged-out can see `/landing` and `/blog` placeholder;
  app routes redirect to `/landing`; dev demo unaffected.
- **robots/sitemap:** fetch `/robots.txt` and `/sitemap.xml`, assert contents.

## Rollout

1. PR → `main` (CI green, self-merge).
2. **Set `ADMIN_EMAILS=ethan@nhs-llc.com` in Vercel (Production + Preview)**
   before promotion, and confirm — otherwise the founder is locked out.
3. Promote `main → test`, QA the test URL, `test → prod`.
4. Owner: set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, redeploy, submit sitemap in
   Search Console.

## Out of scope

- The blog itself (Part C, separate issue).
- A separate staging database (still shared per CLAUDE.md).
- Any change to RLS / data-access auth (middleware + callback only; RLS remains
  the real protection).
