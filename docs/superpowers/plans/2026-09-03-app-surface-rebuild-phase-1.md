> **Superseded** by [`2026-10-27-app-rebuild-design.md`](../specs/2026-10-27-app-rebuild-design.md) (2026-10-27). Kept for history.

# App Surface Rebuild — Phase 1: Stop the Silent Failures

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Find and fix the reason a tap on "New turnover" silently does nothing, make that class of failure impossible to ship again, and add the `client` tier the new flow needs — without touching a single screen yet.

**Architecture:** Three defensive changes and one additive migration. Error boundaries so a server throw during client-side navigation surfaces instead of being swallowed; a filesystem guard so a nav link can never again point at a route that does not exist; a `client` table with a nullable FK from `property`, backfilled so nothing breaks. Draft-turnover creation moves off page render, where it is currently a side effect of a GET.

**Tech Stack:** Next.js 16.3 (App Router, RSC), React 19, TypeScript (strict), Supabase (Postgres + RLS), Vitest 4 (node env; jsdom opt-in per file via `// @vitest-environment jsdom`), `@` aliased to `apps/web/src`.

**Spec:** `docs/superpowers/specs/2026-09-03-app-surface-rebuild-design.md`

## Scope

This is **phase 1 of 3**. It ships on its own and leaves the app working exactly as it does today, minus the silent failures.

- **Phase 1 (this plan):** correctness floor + `client` data model.
- **Phase 2:** the five screens, replacing the surface; deletion of Operations / Team / Insights / the desktop console / the orphaned `/field` routes happens at the *end* of phase 2, once the new flow exists. Deleting first would leave the app with nothing.
- **Phase 3:** the record — PDF generation, email delivery, shareable link, multi-visit period report. Genuinely separate: it needs a PDF library and an email provider, neither of which is in `package.json` today.

## Global Constraints

Copied from the spec. Every task's requirements implicitly include these.

- **Never commit or push to `main`, `test` or `prod`.** Work on a feature branch in a worktree; reach `main` via PR with green CI. (`CLAUDE.md`, golden rules.)
- **No table is ever dropped.** Removal means removal from the app surface only. `maintenance_task`, `scheduled_item`, `equipment`, `supply` and the rest keep their rows.
- **Schema changes to SHARED objects** — existing functions, triggers, RLS policies on existing tables, or any `drop`/`alter` of existing schema — **must be flagged to the founder for sign-off before being applied to the shared database.** All three tiers share one Postgres (ref `slkxwpiiludisrnwnxlg`). Additive changes (new tables, new nullable columns, new policies on new tables) are low-risk and may be applied via the Supabase MCP.
- **Migration timestamps are reserved, not guessed.** Parallel agents have collided on `schema_migrations_pkey` before. This plan reserves `20260903120000`.
- **CSP:** do not change route render modes or `src/lib/csp.ts` without reading `docs/incidents/`. The `tests/csp-nonce-coverage.test.ts` guard stays green.
- **Quality gate before any PR**, from `apps/web`: `npm run lint && npm run typecheck && npm run build && npm run test`.
- **`npm install` in a worktree needs its own cache** to avoid an EEXIST race with parallel agents: `npm install --cache /tmp/tt-npm-cache-phase1`.

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/docs/dead-tap-findings.md` *(temporary, deleted in Task 1 Step 7)* | Scratch record of the reproduction; its conclusion is folded into the spec and the commit message |
| `apps/web/src/app/error.tsx` | Root route-segment error boundary — the one that is missing today |
| `apps/web/src/app/p/[id]/error.tsx` | Boundary for the property subtree, where the dead tap happens |
| `apps/web/tests/error-boundary-coverage.test.ts` | Guard: every route segment with a `page.tsx` has an `error.tsx` at or above it |
| `apps/web/tests/nav-route-coverage.test.ts` | Guard: every `href` in a nav component resolves to a real route |
| `apps/web/src/lib/routes.ts` | Pure `routeExists(href, appDir)` resolver, shared by the guard test |
| `apps/web/supabase/migrations/20260903120000_client.sql` | New `client` table, `property.client_id`, RLS, backfill |
| `apps/web/src/lib/supabase/types.ts` | Regenerated Supabase types including `client` |
| `apps/web/tests/client-rls.test.ts` | RLS isolation for `client` — a member of org A cannot read org B's clients |
| `apps/web/src/app/p/[id]/new/page.tsx` | Stops creating a draft during render |
| `apps/web/src/app/p/[id]/page.tsx` | "New turnover" becomes a form action, not a `<Link>` to a side-effecting GET |

---

### Task 1: Reproduce the dead tap

**This task produces a finding, not a feature.** Do not write a fix in it. The spec records a hypothesis — the missing error boundary — and shipping a fix for an unconfirmed cause is exactly how this gets missed again.

**Files:**
- Create (temporary): `apps/web/docs/dead-tap-findings.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a confirmed root cause, recorded in the Task 1 commit message and folded into the spec's "The dead tap" section. Tasks 2 and 5 assume the cause is one of the two candidates below; if it is neither, **stop and re-plan** rather than continuing.

**Background — what is already established.** Do not redo this work:
- `app_can_capture_property` returns `true` for the founder's user on all four properties (verified by impersonating his uid in a rolled-back transaction), so the "New turnover" button definitely renders.
- `/p/[id]/new` creates a draft `turnover` row as a side effect of *rendering* (it calls `ensureDraftTurnoverAction` at `apps/web/src/app/p/[id]/new/page.tsx:35`). The database contains **zero** draft rows.
- Vercel production logs show no request for `/p/*/new` during the founder's session.

Together these mean the page never rendered, on the server or speculatively.

- [ ] **Step 1: Start the local stack**

```bash
cd apps/web
npm install --cache /tmp/tt-npm-cache-phase1
npx supabase start
npm run dev -- -p 3001
```

Port 3001 because the demo on `main` holds 3000.

- [ ] **Step 2: Sign in and reach a property page**

Open `http://localhost:3001/login` and use the dev-only bypass (it 404s in production; see `src/app/dev/`). Seed data if the local database is empty — `npm run tt-demo` if present, otherwise create one property through the UI.

Navigate to `/p/<id>` for that property and confirm the "New turnover" button renders. If it does not, the local state does not match production and the rest of this task is invalid — stop and say so.

- [ ] **Step 3: Instrument both sides before clicking**

In the browser: open DevTools, Network tab, "Preserve log" **on**, Console tab visible.

In the terminal running `npm run dev`, watch for a server-side stack trace.

- [ ] **Step 4: Click "New turnover" and record exactly what happens**

Record all four, verbatim:
1. Did a network request fire? To what URL? What status? (An RSC navigation shows as a request with `?_rsc=` in the query string.)
2. Any console error?
3. Any server-side stack trace in the dev terminal?
4. Did the URL change?

- [ ] **Step 5: Classify the result**

**Candidate A — server throw swallowed by a missing boundary.** A request fires, the server logs a throw, the browser stays put, no visible error. Confirms the spec's hypothesis. Task 2 is the fix.

**Candidate B — the side-effecting GET fails.** The request fires and returns a 500 from `ensureDraftTurnoverAction` itself (a Supabase insert rejected, `redirect()` misused inside a `"use server"` function called during render, etc.). Task 5 is the fix; Task 2 makes it visible rather than silent.

**Neither.** If no request fires at all — a hydration failure, a CSP block, an event handler never attached — **stop.** That is a different bug than the spec assumes, and Tasks 2–5 do not address it. Report the finding and re-plan.

- [ ] **Step 6: Write the finding down**

Create `apps/web/docs/dead-tap-findings.md` with: the four recorded observations from Step 4 verbatim, the classification from Step 5, and the full stack trace if there was one.

- [ ] **Step 7: Fold the finding into the spec and delete the scratch file**

Replace the spec's "The dead tap — unresolved" section with the confirmed cause. Then:

```bash
rm apps/web/docs/dead-tap-findings.md
```

The finding belongs in the spec and the commit message, not in a loose file — `CLAUDE.md` is explicit that planning markdown must not be scattered across the repo.

- [ ] **Step 8: Commit**

```bash
git add docs/superpowers/specs/2026-09-03-app-surface-rebuild-design.md
git commit -m "docs: root-cause the silent dead tap on New turnover"
```

The commit message body must contain the four observations and the classification. This is the only durable record of the reproduction.

---

### Task 2: Error boundaries, and a guard that keeps them

**Files:**
- Create: `apps/web/src/app/error.tsx`
- Create: `apps/web/src/app/p/[id]/error.tsx`
- Create: `apps/web/tests/error-boundary-coverage.test.ts`

**Interfaces:**
- Consumes: Task 1's confirmed cause.
- Produces: `error.tsx` boundaries. No exported symbols other tasks depend on.

**Why:** the app has only `global-error.tsx`, which replaces the **root layout** and therefore only catches throws in the root layout itself. A throw in a page during a *client-side* navigation, with no `error.tsx` in that segment's tree, aborts the navigation with no UI change at all.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/error-boundary-coverage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/**
 * Guard for the 2026-09-02 "dead tap": tapping "New turnover" did nothing and
 * showed nothing. In the App Router, a server component that throws during a
 * CLIENT-SIDE navigation, with no `error.tsx` anywhere in its segment tree,
 * makes the router abort silently — the screen simply does not change. There is
 * no error, no log the user can see, and no navigation.
 *
 * `global-error.tsx` does NOT cover this: it replaces the root layout and only
 * catches throws originating in that layout.
 *
 * So: every route segment that renders a page must have an `error.tsx` at or
 * above it. This test walks the real app directory, so a new route added
 * without a boundary fails here rather than in the founder's hands.
 */

const APP_DIR = join(__dirname, "..", "src", "app");

/** Every directory under src/app containing a page.tsx, as segment arrays. */
async function findPageDirs(dir: string, base = dir): Promise<string[][]> {
  const out: string[][] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  if (entries.some((e) => e.isFile() && e.name === "page.tsx")) {
    const rel = relative(base, dir);
    out.push(rel === "" ? [] : rel.split(sep));
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      out.push(...(await findPageDirs(join(dir, entry.name), base)));
    }
  }
  return out;
}

/** True when this segment, or any ancestor, holds an error.tsx. */
async function hasBoundary(segments: string[]): Promise<boolean> {
  for (let i = segments.length; i >= 0; i--) {
    const dir = join(APP_DIR, ...segments.slice(0, i));
    const entries = await readdir(dir, { withFileTypes: true });
    if (entries.some((e) => e.isFile() && e.name === "error.tsx")) return true;
  }
  return false;
}

describe("error boundary coverage", () => {
  it("every route segment with a page has an error.tsx at or above it", async () => {
    const pageDirs = await findPageDirs(APP_DIR);
    expect(pageDirs.length).toBeGreaterThan(0);

    const unguarded: string[] = [];
    for (const segments of pageDirs) {
      if (!(await hasBoundary(segments))) {
        unguarded.push("/" + segments.join("/"));
      }
    }

    expect(unguarded).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run tests/error-boundary-coverage.test.ts`

Expected: FAIL. `unguarded` lists every route — roughly twenty paths including `/`, `/p/[id]`, `/p/[id]/new`, `/operations`, `/team` — because no `error.tsx` exists anywhere.

- [ ] **Step 3: Add the root boundary**

Create `apps/web/src/app/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Root route-segment error boundary.
 *
 * Its absence is what made the 2026-09-02 dead tap invisible: without an
 * `error.tsx` in the segment tree, a server component throwing during a
 * client-side navigation aborts that navigation and changes nothing on screen.
 * `global-error.tsx` does not cover this — it only catches root-LAYOUT throws.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main style={{ padding: "48px 24px", maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Something went wrong</h1>
      <p style={{ marginBottom: 20, lineHeight: 1.6 }}>
        This screen failed to load. The error has been reported.
      </p>
      {error.digest && (
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
          Reference: {error.digest}
        </p>
      )}
      <button onClick={reset} style={{ padding: "12px 20px", fontSize: 15 }}>
        Try again
      </button>
    </main>
  );
}
```

- [ ] **Step 4: Add the property-subtree boundary**

Create `apps/web/src/app/p/[id]/error.tsx`. A failure here should not throw the operator back to a generic page — this is the subtree where the dead tap happened.

```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

/** Error boundary for the property subtree, including the capture flow. */
export default function PropertyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main style={{ padding: "48px 24px", maxWidth: 560, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>This tub failed to load</h1>
      <p style={{ marginBottom: 20, lineHeight: 1.6 }}>
        Nothing you captured has been lost. Try again, or go back and reopen it.
      </p>
      {error.digest && (
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
          Reference: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={reset} style={{ padding: "12px 20px", fontSize: 15 }}>
          Try again
        </button>
        <Link href="/" style={{ padding: "12px 20px", fontSize: 15 }}>
          All tubs
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run tests/error-boundary-coverage.test.ts`

Expected: PASS. The root `error.tsx` covers every segment beneath it.

- [ ] **Step 6: Verify the boundary actually catches a throw**

Temporarily add `throw new Error("boundary smoke test");` as the first line of the `/p/[id]` page component, load that page in the browser, and confirm you see "This tub failed to load" rather than a blank or unchanged screen. **Remove the throw.**

This step is not optional. The test above proves a *file exists*; only this proves the boundary *works*.

- [ ] **Step 7: Run the full suite and the build**

Run: `cd apps/web && npm run lint && npm run typecheck && npm run build && npm run test`

Expected: all pass. Note that `error.tsx` opts its segment out of static generation — confirm `tests/csp-nonce-coverage.test.ts` is still green, since it reads real build output.

- [ ] **Step 8: Commit**

```bash
git add src/app/error.tsx src/app/p/\[id\]/error.tsx tests/error-boundary-coverage.test.ts
git commit -m "fix: add error boundaries so failed navigations stop failing silently"
```

---

### Task 3: A guard against orphaned nav links

**Files:**
- Create: `apps/web/src/lib/routes.ts`
- Create: `apps/web/tests/nav-route-coverage.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `routeExists(href: string, appDir: string): boolean` from `@/lib/routes` — a pure resolver. Phase 2 reuses it when building the new tab bar.

**Why:** `BottomTabBar` ships four tabs; `/field/tubs`, `/field/history` and `/field/more` have no route and 404. That was live in production for six weeks and no test noticed.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/nav-route-coverage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routeExists } from "@/lib/routes";

/**
 * Guard for the orphaned-tab bug found 2026-09-02: BottomTabBar advertised
 * Today / Tubs / History / More, and three of those four had no route at all.
 * They 404'd in production for six weeks.
 *
 * Nav components are the one place a broken link is guaranteed to be hit, so
 * every href they hard-code must resolve to a real route.
 */

const APP_DIR = join(__dirname, "..", "src", "app");

/** Files whose hard-coded hrefs must all resolve. Add new nav components here. */
const NAV_FILES = [
  "src/components/field/BottomTabBar.tsx",
  "src/components/Shell.tsx",
];

/** Pull `href: "/x"` and `href="/x"` literals; ignore template strings. */
function hrefsIn(relPath: string): string[] {
  const source = readFileSync(join(__dirname, "..", relPath), "utf8");
  const matches = source.matchAll(/href[:=]\s*"(\/[^"{}]*)"/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

describe("nav route coverage", () => {
  for (const file of NAV_FILES) {
    it(`every hard-coded href in ${file} resolves to a route`, () => {
      const hrefs = hrefsIn(file);
      expect(hrefs.length).toBeGreaterThan(0);

      const broken = hrefs.filter((href) => !routeExists(href, APP_DIR));
      expect(broken).toEqual([]);
    });
  }
});
```

- [ ] **Step 2: Write the resolver**

Create `apps/web/src/lib/routes.ts`:

```ts
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Does `href` resolve to a real App Router route under `appDir`?
 *
 * Walks the href's segments against the filesystem, matching a literal
 * directory first and falling back to a dynamic segment (`[id]`, `[...slug]`).
 * A route exists when the final directory holds a `page.tsx`.
 *
 * Node-only (uses `fs`) — for tests and build-time checks, never the browser.
 */
export function routeExists(href: string, appDir: string): boolean {
  const path = href.split("?")[0].split("#")[0];
  const segments = path.split("/").filter(Boolean);

  let dir = appDir;
  for (const segment of segments) {
    const literal = join(dir, segment);
    if (existsSync(literal)) {
      dir = literal;
      continue;
    }
    const dynamic = readdirSync(dir, { withFileTypes: true }).find(
      (entry) => entry.isDirectory() && entry.name.startsWith("["),
    );
    if (!dynamic) return false;
    dir = join(dir, dynamic.name);
  }

  return existsSync(join(dir, "page.tsx"));
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run tests/nav-route-coverage.test.ts`

Expected: FAIL on `BottomTabBar.tsx` with `broken` containing `["/field/tubs", "/field/history", "/field/more"]`.

- [ ] **Step 4: Make it pass by removing the orphaned tabs**

In `apps/web/src/components/field/BottomTabBar.tsx`, cut the `tubs`, `history` and `more` entries from `TABS`, leaving only `today`. Narrow the `FieldTab` type to match, and simplify `activeTab()` in `apps/web/src/app/field/layout.tsx` to always return `"today"`.

Do **not** build the missing routes. `/field` is deleted at the end of phase 2; the point here is that the app stops advertising doors that open onto nothing.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run tests/nav-route-coverage.test.ts`

Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `cd apps/web && npm run lint && npm run typecheck && npm run test`

Expected: all pass. `tests/field/shell.test.tsx` asserts tab-bar behaviour and may reference the removed tabs — update it to the single-tab reality rather than deleting the assertions.

- [ ] **Step 7: Commit**

```bash
git add src/lib/routes.ts tests/nav-route-coverage.test.ts src/components/field/BottomTabBar.tsx src/app/field/layout.tsx tests/field/shell.test.tsx
git commit -m "fix: drop nav tabs that 404, and guard against re-adding them"
```

---

### Task 4: The `client` tier

**Files:**
- Create: `apps/web/supabase/migrations/20260903120000_client.sql`
- Modify: `apps/web/src/lib/supabase/types.ts` (regenerated)
- Create: `apps/web/tests/client-rls.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: table `client (id uuid, org_id uuid, name text, contact_email text, contact_name text, created_at timestamptz, archived_at timestamptz)` and column `property.client_id uuid null references client(id)`. Phase 2's Today and Tubs screens group by `property.client_id`.

**Constraint:** this migration is **additive only** — a new table, a new nullable column, new policies on the new table. It touches no existing function, trigger or policy, so per `CLAUDE.md` it may be applied to the shared database without founder sign-off. **If you find yourself needing to alter an existing policy or function, stop and ask.**

- [ ] **Step 1: Write the migration**

Create `apps/web/supabase/migrations/20260903120000_client.sql`:

```sql
-- client: the person or company a tub belongs to (2026-09-03 app surface rebuild).
-- Reference data, not dispute evidence -> no audit trigger, mirroring `equipment`.
create table client (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references org(id) on delete cascade,
  name          text not null,
  contact_name  text,
  contact_email text,
  created_at    timestamptz not null default now(),
  archived_at   timestamptz   -- soft delete
);
create index on client (org_id);

-- Nullable: a tub without a client stays valid, and the backfill below is a
-- convenience rather than a constraint. Nothing in the app may assume non-null.
alter table property add column client_id uuid references client(id) on delete set null;
create index on property (client_id);

alter table client enable row level security;

-- Org members read; operators write. Mirrors org_note in 20260629120000.
create policy client_select on client for select to authenticated
  using (app_is_member(org_id));
create policy client_operator_write on client for all to authenticated
  using (app_has_role(org_id, 'operator'))
  with check (app_has_role(org_id, 'operator'));

-- Backfill: one client per org that owns properties, named for the org, with
-- every one of that org's properties attached. Idempotent — re-running adds
-- nothing, because it only touches orgs that have no client row yet.
with seeded as (
  insert into client (org_id, name)
  select distinct p.org_id, o.name
  from property p
  join org o on o.id = p.org_id
  where not exists (select 1 from client c where c.org_id = p.org_id)
  returning id, org_id
)
update property p
   set client_id = s.id
  from seeded s
 where p.org_id = s.org_id
   and p.client_id is null;
```

- [ ] **Step 2: Apply it locally and verify the backfill**

```bash
cd apps/web
npx supabase db reset
```

Then confirm every property got a client:

```bash
npx supabase db query "select count(*) filter (where client_id is null) as orphans, count(*) as total from property;"
```

Expected: `orphans = 0` when the local database has seeded properties. If the local database is empty, both are `0` — that is a pass, but note it, because it means the backfill went untested. In that case seed a property and an org first, then re-run `db reset`.

- [ ] **Step 3: Write the failing RLS test**

Create `apps/web/tests/client-rls.test.ts`. Follow the structure of `tests/rls.test.ts` — same `makeUser` helper, same loud skip when Supabase env is absent.

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ready = Boolean(url && anon && service);
if (!ready) {
  console.warn(
    "⚠ client RLS suite SKIPPED — Supabase env not configured; this gate is NOT enforced in this run.",
  );
}

describe.skipIf(!ready)("client RLS isolation", () => {
  let admin!: SupabaseClient<Database>;
  const password = `pw-${randomUUID()}`;
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  async function makeOrgWithOperator(label: string) {
    const email = `client-rls-${label}-${randomUUID()}@tracktub.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser returned no user");
    createdUserIds.push(data.user.id);

    const { data: org, error: orgErr } = await admin
      .from("org")
      .insert({ name: `org-${label}-${randomUUID()}` })
      .select("id")
      .single();
    if (orgErr || !org) throw orgErr ?? new Error("org insert failed");
    createdOrgIds.push(org.id);

    const { error: memErr } = await admin
      .from("membership")
      .insert({ org_id: org.id, user_id: data.user.id, role: "operator" });
    if (memErr) throw memErr;

    const client = createClient<Database>(url!, anon!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;

    return { orgId: org.id, client };
  }

  beforeAll(async () => {
    admin = createClient<Database>(url!, service!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterAll(async () => {
    for (const id of createdOrgIds) await admin.from("org").delete().eq("id", id);
    for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);
  });

  it("an operator sees their own org's clients and never another org's", async () => {
    const a = await makeOrgWithOperator("a");
    const b = await makeOrgWithOperator("b");

    const { error: insertErr } = await a.client
      .from("client")
      .insert({ org_id: a.orgId, name: "Cascade Stays" });
    expect(insertErr).toBeNull();

    const { data: own } = await a.client.from("client").select("name");
    expect(own?.map((r) => r.name)).toContain("Cascade Stays");

    const { data: other } = await b.client.from("client").select("name");
    expect(other ?? []).toEqual([]);
  });

  it("an operator cannot insert a client into another org", async () => {
    const a = await makeOrgWithOperator("c");
    const b = await makeOrgWithOperator("d");

    const { error } = await b.client
      .from("client")
      .insert({ org_id: a.orgId, name: "Should Not Exist" });

    expect(error).not.toBeNull();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run tests/client-rls.test.ts`

Expected: FAIL — TypeScript cannot resolve `"client"` as a table on `Database`, because the types have not been regenerated.

- [ ] **Step 5: Regenerate the Supabase types**

```bash
cd apps/web
npx supabase gen types typescript --local > src/lib/supabase/types.ts
```

Check the diff. It must add `client` and `property.client_id` and change nothing else. If unrelated tables shift, the local database has drifted from the migration history (a known issue — see `docs/incidents/`); reconcile before continuing rather than committing a noisy diff.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run tests/client-rls.test.ts`

Expected: PASS. If it skips, the Supabase env is missing — set it and re-run. **A skipped security test is not a passing one.**

- [ ] **Step 7: Run the full suite and build**

Run: `cd apps/web && npm run lint && npm run typecheck && npm run build && npm run test`

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260903120000_client.sql src/lib/supabase/types.ts tests/client-rls.test.ts
git commit -m "feat(db): add client tier with RLS and backfill"
```

- [ ] **Step 9: Apply to the shared database**

Apply `20260903120000_client.sql` via the Supabase MCP (`apply_migration`) against project `slkxwpiiludisrnwnxlg`. It is additive, so this needs no sign-off — but **say in your report that you applied it**, with the orphan count from the backfill afterwards.

---

### Task 5: Draft creation stops happening on GET

**Files:**
- Modify: `apps/web/src/app/p/[id]/new/page.tsx`
- Modify: `apps/web/src/app/p/[id]/page.tsx`
- Create: `apps/web/tests/draft-creation.test.ts`

**Interfaces:**
- Consumes: Task 1's finding; Task 2's boundaries (so a failure here is now visible).
- Produces: `startTurnoverAction(formData: FormData): Promise<void>` exported from `@/lib/actions/turnover` — takes `propertyId`, optionally `turnoverId`, creates or resumes the draft, then redirects to the capture route. Phase 2 calls this from the new visit sheet.

**Why:** `/p/[id]/new` currently writes a `turnover` row while *rendering a GET*. A prefetch, a crawler, a double-tap or a retried navigation each create a draft. It also means the page cannot be safely retried by an error boundary — the retry writes another row.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/draft-creation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `/p/[id]/new` used to call ensureDraftTurnoverAction while RENDERING, so a
 * GET wrote a row. Prefetches, double-taps and error-boundary retries each
 * created another draft turnover.
 *
 * Draft creation belongs in an explicit action reached by a POST. This guard is
 * static because rendering an RSC page in vitest would need a full Next
 * runtime; what actually matters — "the page module does not call the
 * mutating action" — is visible in the source.
 */

const PAGE = join(__dirname, "..", "src", "app", "p", "[id]", "new", "page.tsx");

describe("draft turnover creation", () => {
  it("is not triggered by rendering the capture page", () => {
    const source = readFileSync(PAGE, "utf8");
    expect(source).not.toMatch(/ensureDraftTurnoverAction\s*\(/);
  });

  it("the capture page still loads an existing draft by id", () => {
    const source = readFileSync(PAGE, "utf8");
    expect(source).toMatch(/loadDraftSnapshot|getDraftTurnover/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/web && npx vitest run tests/draft-creation.test.ts`

Expected: FAIL on the first assertion — `page.tsx:35` calls `ensureDraftTurnoverAction`.

- [ ] **Step 3: Add the explicit action**

In `apps/web/src/lib/actions/turnover.ts`, add:

```ts
/**
 * Start or resume a draft for `propertyId`, then send the operator into the
 * capture flow. This is the ONLY way a draft turnover comes into existence —
 * rendering a page must never create one (a GET that writes is retried by
 * prefetches, double-taps and error-boundary resets alike).
 */
export async function startTurnoverAction(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  if (!propertyId) throw new Error("Missing propertyId");

  const raw = formData.get("turnoverId");
  const turnoverId = typeof raw === "string" && raw.length > 0 ? raw : null;

  const snapshot = await ensureDraftTurnoverAction(propertyId, turnoverId);
  redirect(`/p/${propertyId}/new?turnover=${snapshot.turnoverId}`);
}
```

`redirect` is already imported in that file. `ensureDraftTurnoverAction` keeps its existing access check via `requireCapturer`.

- [ ] **Step 4: Make the page read-only**

In `apps/web/src/app/p/[id]/new/page.tsx`, replace the `ensureDraftTurnoverAction` call with a read of the draft named by `?turnover=`. When the parameter is absent or names no draft the operator can see, `redirect()` back to `/p/${propertyId}` — the property page is where a turnover is started.

Export `loadDraftSnapshot` from `@/lib/actions/turnover` so the page can call it (it is currently module-private).

- [ ] **Step 5: Turn the button into a form**

In `apps/web/src/app/p/[id]/page.tsx:114`, replace the `<Link href={captureHref}>` with a form posting to the action:

```tsx
{canCapture && (
  <form action={startTurnoverAction}>
    <input type="hidden" name="propertyId" value={propertyId} />
    {draftTurnover && (
      <input type="hidden" name="turnoverId" value={draftTurnover.id} />
    )}
    <button type="submit" className="btn primary">
      <Icon name={draftTurnover ? "camera" : "plus"} size={15} />{" "}
      {draftTurnover ? "Resume turnover" : "New turnover"}
    </button>
  </form>
)}
```

Apply the same change to the second `captureHref` link below it (the "Turnover in progress — resume" note). Remove the now-unused `captureHref` variable.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/web && npx vitest run tests/draft-creation.test.ts`

Expected: PASS.

- [ ] **Step 7: Verify the real flow end to end**

With the dev server running: open a property page, click "New turnover", confirm you land in the capture wizard with a draft. Then check that exactly **one** draft row exists:

```bash
npx supabase db query "select count(*) from turnover where status = 'draft';"
```

Reload the capture page twice and re-run the count. It must not increase. That is the whole point of this task.

- [ ] **Step 8: Run the full suite and build**

Run: `cd apps/web && npm run lint && npm run typecheck && npm run build && npm run test`

- [ ] **Step 9: Commit**

```bash
git add src/lib/actions/turnover.ts src/app/p/\[id\]/new/page.tsx src/app/p/\[id\]/page.tsx tests/draft-creation.test.ts
git commit -m "fix: create draft turnovers from an action, not from rendering a GET"
```

---

## Finishing phase 1

- [ ] Run the full gate from `apps/web`: `npm run lint && npm run typecheck && npm run build && npm run test`
- [ ] Push the branch and open a PR against `main`: `gh pr create --base main`
- [ ] CI must be green — the `web (lint · typecheck · build)` check is required
- [ ] Self-merge once green: `gh pr merge --squash`
- [ ] Report to the founder: the confirmed cause of the dead tap, whether the fix resolved it, and the backfill's orphan count

**Do not promote to `test` or `prod` in this phase.** The surface is mid-rebuild; phases 2 and 3 land first.

## Self-review notes

Checked against the spec:

- Correctness requirements 1 (error boundaries), 2 (no orphan routes) and 4 (no side effects on GET) → Tasks 2, 3, 5.
- Requirement 3 (one capture flow) → **phase 2**, since collapsing the two flows means building the new one.
- Requirement 5 (CSP guard stays) → Task 2 Step 7 explicitly re-checks it, because `error.tsx` changes static-generation behaviour.
- Data model → Task 4. `property` is deliberately not renamed, per the spec.
- The dead tap → Task 1, with an explicit stop-and-re-plan branch if the cause is neither candidate.
- The `/landing` waitlist 500 is **not** in this plan. The spec puts it out of scope and says it needs its own issue; it remains unfiled.
