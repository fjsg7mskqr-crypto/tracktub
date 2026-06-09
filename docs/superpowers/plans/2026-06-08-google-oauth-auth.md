# Google OAuth Auth + Self-Serve Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace magic-link sign-in with Google OAuth, provision a fresh empty org (operator membership) for each new user, and make the auth redirect base correct across local/preview/prod.

**Architecture:** Client-side `signInWithOAuth({ provider: 'google' })` with a `getURL()`-derived `redirectTo`; the existing `/auth/callback` route already exchanges the OAuth code for a session. A `SECURITY DEFINER` signup trigger (extending `handle_new_user`) atomically creates `org` + `membership(role='operator')` so a brand-new user lands in their own empty workspace despite `membership_operator_write` RLS. RLS is otherwise unchanged.

**Tech Stack:** Next.js 15 (App Router), `@supabase/ssr`, Supabase (Postgres + Auth + RLS), Vitest (node env), Supabase MCP for migration apply + RLS verification.

**Spec:** `docs/superpowers/specs/2026-06-08-google-oauth-auth-design.md`

**Prerequisite (manual, operator):** Google Cloud OAuth client + Supabase Google provider + URL config, per the spec §4. The code deploys without it, but Google sign-in won't function until it's done.

---

### Task 1: `getURL()` redirect-base helper

**Files:**
- Create: `apps/web/src/lib/url.ts`
- Test: `apps/web/tests/url.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/tests/url.test.ts
import { describe, it, expect, afterEach, vi } from "vitest";
import { getURL } from "@/lib/url";

describe("getURL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers NEXT_PUBLIC_SITE_URL and strips a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://tracktub.vercel.app/");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getURL()).toBe("https://tracktub.vercel.app");
  });

  it("strips whitespace from a pasted site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "  https://tracktub.vercel.app\n");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getURL()).toBe("https://tracktub.vercel.app");
  });

  it("falls back to NEXT_PUBLIC_VERCEL_URL with an https scheme added", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "tracktub-git-feat.vercel.app");
    expect(getURL()).toBe("https://tracktub-git-feat.vercel.app");
  });

  it("falls back to window.location.origin when no env is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    vi.stubGlobal("window", { location: { origin: "https://browser.example" } });
    expect(getURL()).toBe("https://browser.example");
  });

  it("falls back to localhost when no env and no window", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getURL()).toBe("http://localhost:3000");
  });
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `cd apps/web && npx vitest run tests/url.test.ts`
Expected: FAIL — `Cannot find module '@/lib/url'`.

- [ ] **Step 3: Implement the helper**

```ts
// apps/web/src/lib/url.ts
/**
 * Canonical base URL for building absolute redirect targets (OAuth `redirectTo`,
 * email links, metadata). Bare `location.origin` is fragile: it pins a magic
 * link to wherever the browser happened to be (e.g. localhost during dev), and
 * is unavailable in SSR. Precedence here gives an explicit, stable base:
 *   1. NEXT_PUBLIC_SITE_URL    — canonical prod URL (set in Vercel)
 *   2. NEXT_PUBLIC_VERCEL_URL  — per-deploy URL (preview deploys)
 *   3. window.location.origin  — browser, when neither env is set
 *   4. http://localhost:3000   — final fallback (local dev / SSR)
 * Returned without a trailing slash so callers append `/auth/callback`.
 */
function cleanEnv(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const stripped = value.replace(/\s/g, "");
  return stripped === "" ? undefined : stripped;
}

export function getURL(): string {
  const vercel = cleanEnv(process.env.NEXT_PUBLIC_VERCEL_URL);
  const raw =
    cleanEnv(process.env.NEXT_PUBLIC_SITE_URL) ??
    (vercel ? `https://${vercel}` : undefined) ??
    (typeof window !== "undefined" ? window.location.origin : undefined) ??
    "http://localhost:3000";
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `cd apps/web && npx vitest run tests/url.test.ts`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/url.ts apps/web/tests/url.test.ts
git commit -m "feat(web): add getURL() redirect-base helper"
```

---

### Task 2: Use `getURL()` for `metadataBase`

**Files:**
- Modify: `apps/web/src/app/layout.tsx:20`

- [ ] **Step 1: Replace the localhost-defaulted metadataBase**

Change line 20 from:

```ts
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
```

to:

```ts
  metadataBase: new URL(getURL()),
```

And add the import near the top of the file (with the other imports):

```ts
import { getURL } from "@/lib/url";
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/web && npm run typecheck`
Expected: clean (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "refactor(web): derive metadataBase from getURL()"
```

---

### Task 3: Login page → "Continue with Google"

**Files:**
- Modify: `apps/web/src/app/login/page.tsx` (full rewrite of the form/logic)

No unit test: the repo has no React-rendering test setup (Vitest runs in `node`), and the login page is intentionally bare (brand track owns styling). Verified by typecheck/build + manual OAuth round-trip.

- [ ] **Step 1: Rewrite the page**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getURL } from "@/lib/url";

// Functional sign-in — Google OAuth via Supabase. Plain elements + minimal
// inline styles; the UI/brand track restyles this once that foundation lands.
export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${getURL()}/auth/callback` },
    });
    // On success the browser is redirected to Google, so this line is only
    // reached on error.
    if (error) {
      setError(error.message);
      setPending(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 360,
        margin: "0 auto",
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 16,
        padding: "0 24px",
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
        Sign in to TrackTub
      </h1>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "#ededef",
          color: "#08090a",
          fontSize: 14,
          fontWeight: 600,
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
    </main>
  );
}
```

- [ ] **Step 2: Verify lint + typecheck**

Run: `cd apps/web && npm run lint && npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat(web): sign in with Google OAuth (replaces magic link)"
```

---

### Task 4: Workspace-on-signup migration

**Files:**
- Create: `apps/web/supabase/migrations/20260608190000_workspace_on_signup.sql`
- Modify: `apps/web/supabase/README.md` (add the migration to the table)

Provisions `org` + `membership(role='operator')` for every new auth user, plus an idempotent backfill for existing users (the test user `enovak13.5@gmail.com`).

- [ ] **Step 1: Write the migration**

```sql
-- Provision a workspace for each new user (self-serve Google signup).
-- Applied to the live project (ref slkxwpiiludisrnwnxlg) via the Supabase MCP.
-- Extends handle_new_user (previously profile-only) to also create an org and an
-- operator membership. SECURITY DEFINER so it can write membership despite
-- membership_operator_write RLS — a brand-new user is not yet an operator of
-- anything, so they cannot create their own membership from the client.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_name text;
begin
  -- 1. Profile (existing behavior; coalesce null email per prior hardening).
  insert into profile (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;

  -- 2. New empty workspace + operator membership. Skip if the user somehow
  --    already has a membership (idempotent on re-fire).
  if not exists (select 1 from membership m where m.user_id = new.id) then
    v_name := coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'My'
    ) || '''s workspace';
    insert into org (name) values (v_name) returning id into v_org_id;
    insert into membership (user_id, org_id, role) values (new.id, v_org_id, 'operator');
  end if;

  return new;
end; $$;

-- Re-lock execute (mirrors 20260608023717_lock_trigger_function_execute.sql):
-- only the trigger (definer context) runs this, never API roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Backfill: existing users with no membership get a workspace too. Idempotent.
do $$
declare
  r record;
  v_org_id uuid;
  v_name text;
begin
  for r in
    select p.id, p.email, p.full_name
    from profile p
    where not exists (select 1 from membership m where m.user_id = p.id)
  loop
    v_name := coalesce(
      nullif(r.full_name, ''),
      nullif(split_part(coalesce(r.email, ''), '@', 1), ''),
      'My'
    ) || '''s workspace';
    insert into org (name) values (v_name) returning id into v_org_id;
    insert into membership (user_id, org_id, role) values (r.id, v_org_id, 'operator');
  end loop;
end $$;
```

- [ ] **Step 2: Apply via the Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with:
- `project_id`: `slkxwpiiludisrnwnxlg`
- `name`: `workspace_on_signup`
- `query`: the SQL above.

Expected: success (no error).

- [ ] **Step 3: Add the migration to the README table**

Append a row to the migration table in `apps/web/supabase/README.md`:

```
| `20260608190000_workspace_on_signup.sql` | `workspace_on_signup` | new user → org + operator membership; backfill existing users |
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/supabase/migrations/20260608190000_workspace_on_signup.sql apps/web/supabase/README.md
git commit -m "feat(db): provision org + operator membership on signup"
```

---

### Task 5: Verify provisioning + RLS via MCP

No code — verification only, via `mcp__claude_ai_Supabase__execute_sql` against `slkxwpiiludisrnwnxlg`. Per project convention this runs through MCP (CI has no secrets).

- [ ] **Step 1: Backfill correctness — existing user now has exactly one operator membership**

```sql
select p.email, count(m.*) as memberships,
       bool_and(m.role = 'operator') as all_operator,
       count(distinct m.org_id) as orgs
from profile p
left join membership m on m.user_id = p.id
group by p.email;
```
Expected: each existing profile (incl. `enovak13.5@gmail.com`) shows `memberships = 1`, `all_operator = true`, `orgs = 1`.

- [ ] **Step 2: Trigger correctness — a synthetic new signup provisions a workspace (rolled back)**

```sql
begin;
insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        'verify-trigger@example.com', '{}'::jsonb, '{"full_name":"Verify Trigger"}'::jsonb, now(), now());
select o.name as org_name, m.role
from membership m
join org o on o.id = m.org_id
where m.user_id = (select id from auth.users where email = 'verify-trigger@example.com');
rollback;
```
Expected: one row — `org_name = 'Verify Trigger''s workspace'`, `role = 'operator'`. (If the `auth.users` insert errors on a missing NOT NULL column, add it and re-run; the assertion is unchanged.)

- [ ] **Step 3: RLS isolation — an impersonated user sees only their own org**

```sql
begin;
select set_config('request.jwt.claims',
  json_build_object('sub', (select user_id from membership limit 1), 'role', 'authenticated')::text, true);
set local role authenticated;
select count(*) as visible_orgs from org;          -- expect 1 (their own)
select count(*) as visible_props from property;     -- expect 0 (empty workspace)
rollback;
```
Expected: `visible_orgs = 1`, `visible_props = 0`. Confirms a user cannot see other orgs.

- [ ] **Step 4: Advisor check**

Use `mcp__claude_ai_Supabase__get_advisors` (service `security`) for `slkxwpiiludisrnwnxlg`.
Expected: no new security advisories introduced by the migration.

---

### Task 6: Quality gate

- [ ] **Step 1: Run the full local gate**

Run: `cd apps/web && npm run lint && npm run typecheck && npm run build && npm test`
Expected: lint clean, typecheck clean, build succeeds, tests green (existing + new `url.test.ts`; `rls.test.ts` may skip without local secrets — that's expected).

- [ ] **Step 2: Format**

Run: `cd apps/web && npm run format`
Then stage + commit any formatting changes:
```bash
git add -A && git commit -m "chore(web): prettier" || echo "nothing to format"
```

---

### Task 7: PR + deploy prerequisites

- [ ] **Step 1: Push the branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: Open the PR to main**

```bash
gh pr create --base main --title "feat(auth): Google OAuth sign-in + self-serve workspaces" \
  --body "Implements docs/superpowers/specs/2026-06-08-google-oauth-auth-design.md. Replaces magic-link with Google OAuth, adds getURL() redirect-base helper, and provisions org + operator membership on signup (backfilled). Manual prerequisite before release: Google provider + Supabase URL config (spec §4)."
```

- [ ] **Step 3: CI + review**

Wait for the `web (lint · typecheck · build)` check to pass. Run `/code-review` (CodeRabbit). Address feedback via the receiving-code-review skill.

- [ ] **Step 4: Merge**

```bash
gh pr merge --squash
```

- [ ] **Step 5: Record the release prerequisites** (do NOT silently rely on them)

Before promoting `main → test → prod`, confirm the operator completed spec §4 (Google provider enabled, Site URL + Redirect URLs set) and that `NEXT_PUBLIC_SITE_URL=https://tracktub.vercel.app` is set in Vercel Production env (build-time inlined → redeploy after setting). Google sign-in is non-functional until these are done.

---

## Self-Review

**Spec coverage:**
- Sign-in flow (Google OAuth) → Task 3. ✓
- `/auth/callback` unchanged → confirmed (no task needed). ✓
- `getURL()` helper → Task 1; used in layout (Task 2) and login (Task 3). ✓
- Workspace provisioning trigger + backfill → Task 4. ✓
- Security model / RLS unchanged → verified in Task 5 (steps 1–3). ✓
- Supabase + Google config → Task 7 step 5 + prerequisite note (manual; not code). ✓
- Testing (getURL unit + MCP RLS in rolled-back tx) → Tasks 1, 5. ✓
- Workflow (worktree → PR → promote) → Tasks 6–7. ✓

**Placeholder scan:** none — all steps carry concrete code/commands.

**Type consistency:** `getURL()` signature `(): string` used identically in Tasks 1–3. Migration function `handle_new_user()` matches the existing trigger binding (re-created via `create or replace`, trigger untouched). Roles use the `member_role` enum value `'operator'` consistently.
