# Google OAuth auth + self-serve workspaces — design

**Date:** 2026-06-08
**Status:** Approved (design); implementation pending
**Supersedes (in part):** the M1 decision "auth = magic links + operator invites"
(`docs/superpowers/plans/2026-06-06-m1-backend-skeleton.md`) — sign-in moves from
magic link to Google OAuth; the invite flow remains future work.

## Problem & motivation

Two things prompted this:

1. **Reported symptom:** clicking the sign-in link in the email redirected to
   `http://localhost:3000`. Root cause (confirmed via Supabase auth logs): the
   login code derives the email redirect from `location.origin`
   (`apps/web/src/app/login/page.tsx:21`), and the only recent magic-link email
   was generated from a `localhost:3000` session — so the link correctly pointed
   back to localhost. The fragility is real, though: any flow that falls back to
   the Supabase **Site URL** (if it is still the `http://localhost:3000` default)
   would send production users to localhost.
2. **Product decision:** offer a real sign-in method, not just an email link.
   Chosen method: **Google OAuth via Supabase Auth**. First-time users get a
   brand-new empty workspace (self-serve signup, matching the PRD free-signup
   funnel). A user must never be able to land in someone else's account.

## Goals

- Replace the magic-link login UI with **"Continue with Google."**
- A first-time Google user is provisioned a **new, empty org** and made its
  **operator** (the admin role).
- Make the auth redirect base correct across local / preview / prod (kill the
  localhost-redirect fragility for good).
- Preserve the existing isolation guarantee: a signed-in user sees only their
  own org's data (RLS), and a new user gets a fresh org — never anyone else's.

## Non-goals (YAGNI)

- Invite acceptance / hybrid provisioning (invited user joins an existing org).
  The `invite` table exists but acceptance is future work.
- Additional OAuth providers (GitHub, etc.) or email+password.
- Org-rename UX, multi-org switching.
- Login-page visual styling — owned by the brand/UI track; the page stays bare.

## Architecture

### 1. Sign-in flow (Google OAuth)

- `apps/web/src/app/login/page.tsx` becomes a single **"Continue with Google"**
  button:
  ```ts
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${getURL()}/auth/callback` },
  });
  ```
- The existing `apps/web/src/app/auth/callback/route.ts` already handles the
  OAuth `code` (PKCE) flow via `exchangeCodeForSession` — **no change required**.
- The magic-link / email-OTP form is removed from the UI. The email provider may
  stay **enabled server-side** in Supabase as a break-glass; it is simply not
  surfaced.

### 2. Redirect-base helper (`getURL()`)

New `apps/web/src/lib/url.ts`. Precedence:

1. `NEXT_PUBLIC_SITE_URL` (explicit canonical, e.g. `https://tracktub.vercel.app`)
2. `https://${NEXT_PUBLIC_VERCEL_URL}` (Vercel-injected per-deploy URL)
3. `window.location.origin` (browser, when neither env is set)
4. `http://localhost:3000` (final fallback)

Returned value is normalized (scheme present, no trailing slash) so callers can
append `/auth/callback`. Used by the login page and by `layout.tsx`'s
`metadataBase` (replacing the bare `?? "http://localhost:3000"`).

### 3. Workspace provisioning (DB trigger — Approach A)

Extend signup provisioning so a new `auth.users` row atomically gets:

- a `profile` row (existing behavior), **plus**
- a new `org` (name derived from `full_name`, else email local-part, e.g.
  *"Ethan's workspace"*), **plus**
- a `membership(user_id, org_id, role = 'operator')`.

All inside a `SECURITY DEFINER` function so it bypasses RLS. This is required:
`membership_operator_write` only lets an **existing** operator insert
memberships, so a brand-new user cannot create their own membership from the
client — it must be done by a privileged trigger.

- New migration `apps/web/supabase/migrations/<ts>_workspace_on_signup.sql`,
  mirrored to the live shared project (ref `slkxwpiiludisrnwnxlg`) via the
  Supabase MCP, per the repo's deploy model.
- `execute` on the function is revoked from `public`/`anon`/`authenticated`,
  mirroring `20260608023717_lock_trigger_function_execute.sql`.
- **Backfill:** the existing test user `enovak13.5@gmail.com` is given an org +
  operator membership in the same migration (idempotent — guard on "has no
  membership").

**Upgrade path:** when invite acceptance lands, either branch in the trigger on
an invite token in `raw_user_meta_data`, or move provisioning to a server-side
RPC on `/auth/callback` (Approach B). Out of scope here.

### 4. Supabase + Google configuration (manual, operator action)

Prerequisite, not code:

- **Google Cloud Console:** OAuth consent screen (External; default
  `email`/`profile`/`openid` scopes — no verification needed; **Publish** to
  allow arbitrary users) + an OAuth 2.0 **Web** client whose Authorized redirect
  URI is `https://slkxwpiiludisrnwnxlg.supabase.co/auth/v1/callback`.
- **Supabase → Auth → Providers → Google:** enable, paste Client ID + Secret.
  (The secret lives only in Supabase — never in the repo or any env var.)
- **Supabase → Auth → URL Configuration:**
  - Site URL: `https://tracktub.vercel.app`
  - Redirect URLs: `http://localhost:3000/**`, `https://tracktub.vercel.app/**`,
    `https://*.vercel.app/**`

## Security model ("no accidental access to someone's account")

- Each user authenticates as their own **verified** Google identity — there is
  no mistyped-email path into a different account.
- Supabase automatically links a new provider to an existing user when the
  verified email matches, so the existing magic-link test user is not duplicated.
- RLS is unchanged. A signed-in user can read a row only via `app_is_member` /
  role helpers keyed on `membership`. A newly provisioned user is operator of a
  fresh, empty org and a member of nothing else, so they can see only their own
  (empty) workspace.

## Testing (TDD)

- **`getURL()` unit tests** (Vitest): env precedence (NEXT_PUBLIC_SITE_URL >
  VERCEL_URL > origin > localhost), trailing-slash normalization.
- **Provisioning + RLS verification** via Supabase MCP role-impersonation inside
  a **rolled-back transaction** (CI cannot run this — no secrets; project
  convention):
  - inserting an `auth.users` row yields exactly one `org` + one
    `membership(role='operator')` for that user;
  - user A (impersonated) cannot `select` user B's `org` / `property` /
    `turnover`;
  - backfill is idempotent (re-running creates no duplicate org).
- **Quality gate:** `npm run lint && npm run typecheck && npm run build` +
  Vitest green, from `apps/web`.

## Rollout / workflow

- Feature branch in a worktree → PR to `main` → CI green → CodeRabbit review →
  squash-merge. Promote `main → test → prod` via fast-forward PRs.
- The migration is applied to the shared Supabase project via MCP; the Google +
  URL configuration (above) is a manual dashboard step and a **release
  prerequisite** — Google sign-in will not work until it's done.

## Open defaults (chosen; flag if wrong)

- New self-serve users get the **operator** role.
- Org auto-named from the user's name/email.
- Email provider stays enabled server-side as a break-glass, hidden from the UI.
