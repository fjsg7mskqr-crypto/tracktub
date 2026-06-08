# Production Outage — site-wide 500

| | |
|---|---|
| **Date** | 2026-06-08 |
| **Severity** | High (full outage) |
| **Status** | Resolved |
| **Customer impact** | None (pre-launch) |
| **Data loss** | None |

## Summary
The live site (`tracktub.vercel.app`) returned **HTTP 500 on every route**
(`MIDDLEWARE_INVOCATION_FAILED`) for an extended stretch the morning of
2026-06-08. Every page — `/`, `/login`, everything — was down. Supabase and the
database were healthy throughout; the failure was purely the web layer refusing
to start.

## Root cause — two layers
It took two distinct things lining up:

1. **Proximate (what crashed it).** The M1 backend added a root `middleware.ts`
   that runs on *every* route and builds a Supabase client. It called `getEnv()`,
   which **throws** when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   are unset. Those vars were **never set in Vercel's production environment**. A
   throw inside edge middleware is a 500 on 100% of requests. (These are
   `NEXT_PUBLIC_*`, so they're inlined at *build* time — fixing them required a
   redeploy, not just saving them.)

2. **Systemic (why it reached production at all).** Vercel's **Production Branch
   was `main`, not `prod`.** So merging M1 to `main` auto-published
   Supabase-dependent code **straight to the live site**, bypassing the documented
   `main → test → prod` promotion/QA gate. The `test` and `prod` branches were
   frozen six commits behind and had never been used. The promotion model existed
   on paper (`CLAUDE.md`) but was never wired into the infrastructure.

**Contributing factors.** The middleware was written to "fail loud" (throw) on
missing config — reasonable for a single data page, fatal for code that runs on
every route. And CI runs without Supabase secrets, so it could never have caught
the runtime env requirement.

## Impact
- 100% of routes returned 500 for the duration.
- No data loss or exposure — Supabase was healthy; the web layer simply failed to
  boot.
- Pre-launch, so no customer impact, but a significant dev-time cost to diagnose.

## Why it cost so much time
The 500 was opaque (`MIDDLEWARE_INVOCATION_FAILED` doesn't name the cause), and
the real problem spanned three systems — Vercel (env + branch wiring), Supabase
(ruled out), and the deploy model — so diagnosis meant checking all of them. The
fix then surfaced a **second failure mode**: once the env vars were set, they were
briefly set to an *invalid* value (a malformed URL → `Invalid supabaseUrl`), which
500'd it again. So it was effectively two incidents back-to-back, plus the
structural realignment.

## Resolution
- **Restored:** set the `NEXT_PUBLIC_SUPABASE_*` vars in Vercel + redeploy.
- **Hardened (#6):** middleware now **degrades** (passes the request through) when
  the Supabase env is *missing*, instead of crashing the whole site.
- **Hardened (#7):** extended that to *invalid / unreachable* config too (try/catch
  around the Supabase call) — middleware can no longer take the site down over any
  Supabase env problem.
- **Realigned the deploy model:** promoted `main → test → prod`, flipped Vercel's
  Production Branch to **`prod`** (verified), and corrected `CLAUDE.md`.
- **Added** a `promo:status` script for at-a-glance pipeline visibility.

## Prevention — what's different now
- **Merges to `main` can no longer auto-publish to production.** `main` builds
  previews only; production moves only via a deliberate `test → prod` promotion. A
  repeat of "merge → instant broken prod" is now structurally impossible.
- **A missing or invalid Supabase env can no longer 500 the whole site** —
  middleware fails open with a loud log.
- The docs now match reality, and the env-var requirement is written down in
  `CLAUDE.md`.

## Follow-ups (not urgent)
- **No isolated staging DB yet** — all tiers share one Supabase project. Add a
  dedicated test DB at launch / on the Supabase Pro plan.
- **Optional:** a CI smoke test that boots the app *with* env to catch missing-env
  regressions before they ship.
- **Cleanup:** the Vercel "Production Branch" *deploy hook* is a misnomer (it's not
  the routing setting) — rename or delete it to prevent future confusion.
- **Pre-existing:** `tracktub.com` is unregistered; only the `*.vercel.app` URL
  exists.

## One-line takeaway
The outage wasn't really a code bug — it was a **config + process gap** (unset env
vars + production wired to `main`). Both are now closed.
