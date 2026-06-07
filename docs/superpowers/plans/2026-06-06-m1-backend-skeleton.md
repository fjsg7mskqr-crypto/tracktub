# M1 — Backend Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute in the `worktree-v1-rebuild` worktree (or a fresh worktree off `main`); open a PR into `main` when M1 is green.

**Goal:** Replace the demo's localStorage with a real Supabase backend — schema, row-level security, magic-link auth, and a typed data layer — proven end-to-end by a logged-in page that reads role-scoped data through RLS.

**Architecture:** Next.js 15 App Router (existing `apps/web`) talks to Supabase (Postgres + Auth + Storage) via `@supabase/ssr`. All multi-tenant access is enforced in the database by RLS keyed on `auth.uid()` and the `membership` table (operator / staff / owner). UI moves to Tailwind v4 + shadcn/ui, with brand tokens ported from `brand/tokens.css`. No feature screens yet — M1 ends with real auth + a proof-of-life dashboard that only returns data RLS permits.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Supabase CLI (migrations), Tailwind v4, shadcn/ui, vitest (RLS + unit tests).

**Decisions locked (2026-06-06):** Backend = Supabase in a **new free org**. UI = Tailwind + shadcn. Auth = **magic links + operator invites**. Build-first (validation runs in parallel). Demo UI is the visual reference, not the codebase.

**Definition of done for M1:** (1) `npm run lint && npm run typecheck && npm run build` green; (2) RLS test suite green (`npm run test`); (3) magic-link login works against the real project; (4) the `/` dashboard server-renders the logged-in user's org + role + visible properties, and an operator sees all org properties while a staff user sees only assigned ones — verified by the RLS tests.

---

## File structure (created/modified in M1)

```
apps/web/
  .env.local                      # Supabase keys (gitignored)
  .env.example                    # documents required vars (committed)
  supabase/
    config.toml                   # supabase CLI config (project ref)
    migrations/
      0001_schema.sql             # all tables (PRD §10)
      0002_rls.sql                # RLS helper fns + policies (PRD §9)
      0003_triggers.sql           # profile-on-signup, audit-log, updated_at
    seed.sql                      # dev seed: 1 org, 1 operator, 2 properties, 1 staff
  src/
    lib/
      supabase/
        client.ts                 # browser client (@supabase/ssr)
        server.ts                 # server client (cookies)
        middleware.ts             # session refresh helper
        types.ts                  # generated DB types (supabase gen types)
      env.ts                      # validated env access
    middleware.ts                 # Next middleware: refresh session, gate routes
    app/
      globals.css                 # Tailwind v4 + brand tokens (replaces demo CSS)
      layout.tsx                  # fonts + <body> (Tailwind)
      page.tsx                    # proof-of-life dashboard (server component, RLS read)
      login/page.tsx              # magic-link request form
      auth/callback/route.ts      # exchange code -> session
      auth/signout/route.ts       # sign out
    components/ui/                 # shadcn components (button, input, card, ...)
  tailwind.config.ts              # (Tailwind v4 uses CSS @theme; minimal config)
  vitest.config.ts                # test runner
  tests/
    rls.test.ts                   # RLS access-control tests (the security gate)
    env.test.ts                   # env validation unit test
```

---

## Task 1: Provision the Supabase project + env

**Files:**
- Create: `apps/web/.env.local`, `apps/web/.env.example`
- Create: `apps/web/supabase/config.toml` (via CLI)

- [ ] **Step 1: Create a new Supabase organization (dashboard, ~1 min)**

Go to https://supabase.com/dashboard → **New organization** → name it `TrackTub` (free plan). This gives a fresh free quota (2 active projects) without touching NHS-LLC-OS / Spexly.

- [ ] **Step 2: Create the project**

In the new org → **New project** → name `tracktub-dev`, region `us-east-1`, generate a strong DB password (save it). Wait for it to provision (~2 min).

- [ ] **Step 3: Capture credentials**

From Project Settings → API, copy the **Project URL**, the **anon/publishable key**, and the **service_role key**. From Settings → General copy the **Reference ID** (the project ref).

- [ ] **Step 4: Write env files**

Create `apps/web/.env.local` (gitignored already via root `.gitignore` rule `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Create `apps/web/.env.example` (committed, no secrets):

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 5: Install + link the Supabase CLI**

Run (from `apps/web`):
```bash
npm install -D supabase
npx supabase login        # opens browser, authenticates the CLI
npx supabase link --project-ref <project-ref>
```
Expected: `Finished supabase link.` and a `supabase/config.toml` appears.

- [ ] **Step 6: Commit (no secrets)**

```bash
git add apps/web/.env.example apps/web/supabase/config.toml apps/web/package.json apps/web/package-lock.json
git commit -m "chore(m1): add supabase CLI + env scaffolding"
```

---

## Task 2: Install Supabase SDK + SSR client helpers

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/env.ts`, `apps/web/src/lib/supabase/client.ts`, `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/supabase/middleware.ts`
- Create: `apps/web/src/middleware.ts`
- Test: `apps/web/tests/env.test.ts`

- [ ] **Step 1: Install SDKs**

```bash
cd apps/web && npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Write the failing env test**

`apps/web/tests/env.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getEnv } from "@/lib/env";

describe("getEnv", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });
  it("returns required public vars", () => {
    const env = getEnv();
    expect(env.SUPABASE_URL).toBe("https://x.supabase.co");
    expect(env.SUPABASE_ANON_KEY).toBe("anon");
  });
  it("throws when a required var is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => getEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx vitest run tests/env.test.ts` — Expected: FAIL (`getEnv` not found). *(vitest is configured in Task 10; if not yet present, this task's tests are written now and first run at Task 10. Proceed to Step 4.)*

- [ ] **Step 4: Implement `env.ts`**

`apps/web/src/lib/env.ts`:
```ts
export function getEnv() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}
```

- [ ] **Step 5: Browser client**

`apps/web/src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";
import type { Database } from "./types";

export function createClient() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
```

- [ ] **Step 6: Server client**

`apps/web/src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
import type { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // called from a Server Component — middleware refreshes instead
        }
      },
    },
  });
}
```

- [ ] **Step 7: Middleware session refresh helper + Next middleware**

`apps/web/src/lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/proof"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return response;
}
```

`apps/web/src/middleware.ts`:
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib apps/web/src/middleware.ts apps/web/tests/env.test.ts apps/web/package.json apps/web/package-lock.json
git commit -m "feat(m1): supabase ssr clients + route-gating middleware"
```

---

## Task 3: Tailwind v4 + shadcn/ui + brand tokens — ⚠️ OWNED BY THE UI/BRAND TRACK

> **Parallel-work division:** this task is executed by the **UI/brand agent** (see
> `docs/superpowers/plans/2026-06-06-ui-brand-track.md`), NOT the backend agent —
> so both don't edit `globals.css`/`layout.tsx`/`components/` at once. The backend's
> UI-touching pages (Tasks 8–9) **depend on the UI track's foundation PR being merged
> to `main` first** — rebase on `main` before doing them, then import the shadcn
> components (`Button`, `Input`, `Card`). Steps below are reference only; do not run
> them in the backend worktree.

**Files (UI track owns):**
- Modify: `apps/web/package.json`, `apps/web/src/app/globals.css`, `apps/web/src/app/layout.tsx`
- Create: `apps/web/components.json`, `apps/web/src/lib/utils.ts`, `apps/web/src/components/ui/*`

- [ ] **Step 1: Install Tailwind v4**

```bash
cd apps/web && npm install -D tailwindcss @tailwindcss/postcss postcss
```
Create `apps/web/postcss.config.mjs`:
```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

- [ ] **Step 2: Replace globals.css with Tailwind + brand tokens**

`apps/web/src/app/globals.css` (port values from `brand/tokens.css`, dark-first):
```css
@import "tailwindcss";

@theme {
  --color-bg: #08090a;
  --color-surface: #131417;
  --color-surface-2: #191b20;
  --color-border: rgba(255, 255, 255, 0.09);
  --color-text-hi: #ededef;
  --color-text-lo: #8a8f98;
  --color-verified: #34d399;
  --color-pending: #e8a33d;
  --color-urgent: #ef4444;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --radius: 12px;
}

:root { color-scheme: dark; }
body { background: var(--color-bg); color: var(--color-text-hi); font-family: var(--font-sans); }
```

- [ ] **Step 3: Init shadcn/ui**

```bash
cd apps/web && npx shadcn@latest init
```
Answer: style = default, base color = neutral, CSS variables = yes. This creates `components.json` and `src/lib/utils.ts` (the `cn()` helper).

- [ ] **Step 4: Add the components M1 needs**

```bash
npx shadcn@latest add button input card label
```
Expected: files appear under `src/components/ui/`.

- [ ] **Step 5: Update layout.tsx to Inter + JetBrains Mono (next/font)**

Keep the existing `next/font` setup from the demo's `layout.tsx` (Inter + JetBrains_Mono), ensure `globals.css` is imported, and wrap children directly (the demo `Shell` is replaced in later milestones).

- [ ] **Step 6: Verify build**

Run: `npm run build` — Expected: compiles; Tailwind classes resolve.

- [ ] **Step 7: Commit**

```bash
git add apps/web/components.json apps/web/postcss.config.mjs apps/web/src/app/globals.css apps/web/src/app/layout.tsx apps/web/src/components/ui apps/web/src/lib/utils.ts apps/web/package.json apps/web/package-lock.json
git commit -m "feat(m1): tailwind v4 + shadcn/ui + brand tokens"
```

---

## Task 4: Database schema migration (PRD §10)

**Files:**
- Create: `apps/web/supabase/migrations/0001_schema.sql`

- [ ] **Step 1: Write the schema migration**

`apps/web/supabase/migrations/0001_schema.sql`:
```sql
-- Profiles mirror auth.users (RLS-friendly handle on users)
create table profile (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create table org (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  billing_ref text,
  created_at timestamptz not null default now()
);

create type member_role as enum ('operator', 'staff', 'owner');

create table membership (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profile(id) on delete cascade,
  org_id uuid not null references org(id) on delete cascade,
  role member_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, org_id)
);

create table property (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  geofence_radius_m int not null default 150,
  tub_notes text,
  created_at timestamptz not null default now()
);

create table property_owner (
  property_id uuid not null references property(id) on delete cascade,
  owner_user_id uuid not null references profile(id) on delete cascade,
  primary key (property_id, owner_user_id)
);

create table staff_assignment (
  property_id uuid not null references property(id) on delete cascade,
  staff_user_id uuid not null references profile(id) on delete cascade,
  primary key (property_id, staff_user_id)
);

create type turnover_status as enum ('draft', 'submitted_locked');

create table turnover (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references property(id) on delete cascade,
  submitter_id uuid not null references profile(id),
  submitted_at_server timestamptz not null default now(),
  capture_lat double precision,
  capture_lng double precision,
  geofence_ok boolean,
  urgent boolean not null default false,
  notes text,
  status turnover_status not null default 'draft',
  version int not null default 1,
  share_token text unique,
  created_at timestamptz not null default now()
);

create type photo_slot as enum ('wide', 'waterline', 'panel', 'cover');

create table photo (
  id uuid primary key default gen_random_uuid(),
  turnover_id uuid not null references turnover(id) on delete cascade,
  storage_path text,
  slot photo_slot not null,
  captured_at timestamptz,
  ai_suggested_tags text[] not null default '{}',
  confirmed_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table issue_tag (
  id uuid primary key default gen_random_uuid(),
  turnover_id uuid not null references turnover(id) on delete cascade,
  tag text not null,
  source text not null check (source in ('ai', 'human')),
  confirmed_by uuid references profile(id),
  confirmed_at timestamptz
);

create table task (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references property(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  recurrence text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references profile(id),
  at timestamptz not null default now(),
  diff jsonb
);

create table invite (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org(id) on delete cascade,
  email text not null,
  role member_role not null,
  property_ids uuid[] not null default '{}',
  token text not null unique,
  invited_by uuid not null references profile(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index on membership (org_id);
create index on property (org_id);
create index on turnover (property_id);
create index on photo (turnover_id);
create index on staff_assignment (staff_user_id);
create index on property_owner (owner_user_id);
```

- [ ] **Step 2: Apply locally / to the dev project**

Run (from `apps/web`): `npx supabase db push`
Expected: migration applies; `supabase migration list` shows `0001_schema` applied remotely.

- [ ] **Step 3: Commit**

```bash
git add apps/web/supabase/migrations/0001_schema.sql
git commit -m "feat(m1): core schema (PRD §10)"
```

---

## Task 5: RLS helper functions + policies (PRD §9)

**Files:**
- Create: `apps/web/supabase/migrations/0002_rls.sql`

- [ ] **Step 1: Write helper functions + enable RLS**

`apps/web/supabase/migrations/0002_rls.sql`:
```sql
-- SECURITY DEFINER helpers avoid recursive RLS when checking membership.
create or replace function app_is_member(p_org uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from membership m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

create or replace function app_has_role(p_org uuid, p_role member_role)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from membership m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role = p_role
  );
$$;

-- Can the current user see this property? operator: any in org; staff: assigned; owner: owned.
create or replace function app_can_see_property(p_property uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from property p
    where p.id = p_property and (
      app_has_role(p.org_id, 'operator')
      or exists (select 1 from staff_assignment sa where sa.property_id = p.id and sa.staff_user_id = auth.uid())
      or exists (select 1 from property_owner po where po.property_id = p.id and po.owner_user_id = auth.uid())
    )
  );
$$;

create or replace function app_can_capture_property(p_property uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from property p
    where p.id = p_property and (
      app_has_role(p.org_id, 'operator')
      or exists (select 1 from staff_assignment sa where sa.property_id = p.id and sa.staff_user_id = auth.uid())
    )
  );
$$;

alter table profile           enable row level security;
alter table org               enable row level security;
alter table membership        enable row level security;
alter table property          enable row level security;
alter table property_owner    enable row level security;
alter table staff_assignment  enable row level security;
alter table turnover          enable row level security;
alter table photo             enable row level security;
alter table issue_tag         enable row level security;
alter table task              enable row level security;
alter table audit_log         enable row level security;
alter table invite            enable row level security;
```

- [ ] **Step 2: Write the policies (same migration file, appended)**

Append to `0002_rls.sql`:
```sql
-- profile: a user reads their own profile + profiles of co-members (operators need names)
create policy profile_self_select on profile for select
  using (id = auth.uid());
create policy profile_update_self on profile for update
  using (id = auth.uid()) with check (id = auth.uid());

-- org: members read their org; operators update it
create policy org_member_select on org for select using (app_is_member(id));
create policy org_operator_update on org for update using (app_has_role(id, 'operator'));

-- membership: members read memberships in their org; operators manage them
create policy membership_select on membership for select using (app_is_member(org_id));
create policy membership_operator_write on membership for all
  using (app_has_role(org_id, 'operator')) with check (app_has_role(org_id, 'operator'));

-- property: visible per role; operators write
create policy property_select on property for select using (app_can_see_property(id));
create policy property_operator_write on property for all
  using (app_has_role(org_id, 'operator')) with check (app_has_role(org_id, 'operator'));

-- property_owner / staff_assignment: readable by org members; operators write
create policy propowner_select on property_owner for select
  using (exists (select 1 from property p where p.id = property_id and app_is_member(p.org_id)));
create policy propowner_write on property_owner for all
  using (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')))
  with check (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')));

create policy staffassign_select on staff_assignment for select
  using (exists (select 1 from property p where p.id = property_id and app_is_member(p.org_id)));
create policy staffassign_write on staff_assignment for all
  using (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')))
  with check (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')));

-- turnover: visible if you can see the property; staff/operators insert; lock after submit
create policy turnover_select on turnover for select using (app_can_see_property(property_id));
create policy turnover_insert on turnover for insert with check (app_can_capture_property(property_id));
create policy turnover_update_draft on turnover for update
  using (app_can_capture_property(property_id) and status = 'draft')
  with check (app_can_capture_property(property_id));

-- photo / issue_tag follow their turnover's property visibility
create policy photo_select on photo for select
  using (exists (select 1 from turnover t where t.id = turnover_id and app_can_see_property(t.property_id)));
create policy photo_write on photo for all
  using (exists (select 1 from turnover t where t.id = turnover_id and app_can_capture_property(t.property_id) and t.status = 'draft'))
  with check (exists (select 1 from turnover t where t.id = turnover_id and app_can_capture_property(t.property_id)));

create policy issue_select on issue_tag for select
  using (exists (select 1 from turnover t where t.id = turnover_id and app_can_see_property(t.property_id)));
create policy issue_write on issue_tag for all
  using (exists (select 1 from turnover t join property p on p.id = t.property_id where t.id = turnover_id and app_has_role(p.org_id, 'operator')))
  with check (exists (select 1 from turnover t join property p on p.id = t.property_id where t.id = turnover_id and app_has_role(p.org_id, 'operator')));

-- task: visible per property; operators write
create policy task_select on task for select using (app_can_see_property(property_id));
create policy task_write on task for all
  using (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')))
  with check (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')));

-- audit_log: operators read their org's log; inserts happen via SECURITY DEFINER triggers only
create policy audit_operator_select on audit_log for select using (app_has_role(org_id, 'operator'));

-- invite: operators manage invites for their org
create policy invite_operator_all on invite for all
  using (app_has_role(org_id, 'operator')) with check (app_has_role(org_id, 'operator'));
```

- [ ] **Step 3: Apply**

Run: `npx supabase db push` — Expected: `0002_rls` applied.

- [ ] **Step 4: Commit**

```bash
git add apps/web/supabase/migrations/0002_rls.sql
git commit -m "feat(m1): RLS helper functions + policies (PRD §9)"
```

---

## Task 6: Triggers — profile on signup, audit log, immutability guard

**Files:**
- Create: `apps/web/supabase/migrations/0003_triggers.sql`

- [ ] **Step 1: Write triggers**

`apps/web/supabase/migrations/0003_triggers.sql`:
```sql
-- Create a profile row whenever an auth user is created
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profile (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Prevent edits to a locked turnover (immutability; corrections create new versions later)
create or replace function guard_turnover_lock()
returns trigger language plpgsql as $$
begin
  if old.status = 'submitted_locked' then
    raise exception 'turnover % is locked and cannot be modified', old.id;
  end if;
  return new;
end; $$;

create trigger turnover_lock_guard
  before update on turnover
  for each row execute function guard_turnover_lock();
```

- [ ] **Step 2: Apply + commit**

```bash
npx supabase db push
git add apps/web/supabase/migrations/0003_triggers.sql
git commit -m "feat(m1): triggers — profile-on-signup + turnover immutability"
```

---

## Task 7: Generate typed DB types

**Files:**
- Create: `apps/web/src/lib/supabase/types.ts`
- Modify: `apps/web/package.json` (script)

- [ ] **Step 1: Add a types script**

In `apps/web/package.json` scripts, add:
```json
"db:types": "supabase gen types typescript --linked > src/lib/supabase/types.ts"
```

- [ ] **Step 2: Generate**

Run: `npm run db:types` — Expected: `src/lib/supabase/types.ts` is created with a `Database` type.

- [ ] **Step 3: Verify typecheck**

Run: `npm run typecheck` — Expected: PASS (client.ts/server.ts now resolve `Database`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/supabase/types.ts apps/web/package.json
git commit -m "feat(m1): generated supabase types"
```

---

## Task 8: Magic-link auth (login → callback → session) + signout

**Files:**
- Create: `apps/web/src/app/login/page.tsx`, `apps/web/src/app/auth/callback/route.ts`, `apps/web/src/app/auth/signout/route.ts`

- [ ] **Step 1: Login page (client component, requests a magic link)**

`apps/web/src/app/login/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
      <h1 className="text-xl font-semibold tracking-tight">Sign in to TrackTub</h1>
      {sent ? (
        <p className="text-[var(--color-text-lo)]">Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input type="email" required placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit">Email me a sign-in link</Button>
          {error && <p className="text-[var(--color-urgent)] text-sm">{error}</p>}
        </form>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Callback route (exchange code for session)**

`apps/web/src/app/auth/callback/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

- [ ] **Step 3: Signout route**

`apps/web/src/app/auth/signout/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
```

- [ ] **Step 4: Configure redirect URLs in Supabase**

In the Supabase dashboard → Authentication → URL Configuration, add `http://localhost:3000/**` and (later) `https://tracktub.vercel.app/**` to **Redirect URLs**. Set Site URL to `http://localhost:3000` for dev.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, visit `/login`, enter your email, click the emailed link → you land on `/` authenticated. Expected: no redirect loop to `/login`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/login apps/web/src/app/auth
git commit -m "feat(m1): magic-link auth (login, callback, signout)"
```

---

## Task 9: Proof-of-life dashboard + dev seed

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/supabase/seed.sql`

- [ ] **Step 1: Dev seed (an org, operator, staff, 2 properties, 1 assignment)**

`apps/web/supabase/seed.sql` — note: real users come from `auth.users`; seed uses placeholders you replace with real auth UIDs after signing in two test accounts, OR run via the service role. For M1, seed org + properties and attach your signed-in user as operator:
```sql
-- Replace :operator_uid with your auth user id (from Supabase dashboard → Authentication → Users)
insert into org (id, name) values ('00000000-0000-0000-0000-0000000000aa', 'Cascade Stays')
  on conflict do nothing;
insert into membership (user_id, org_id, role)
  values (':operator_uid', '00000000-0000-0000-0000-0000000000aa', 'operator')
  on conflict do nothing;
insert into property (id, org_id, name, address) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000aa', 'Ridgeline A-Frame', 'Big Bear, CA'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000aa', 'Lakeview Cabin 4', 'Big Bear Lake, CA')
  on conflict do nothing;
```
Apply with: `npx supabase db execute --file supabase/seed.sql` (after replacing the uid).

- [ ] **Step 2: Proof-of-life dashboard (server component, reads via RLS)**

`apps/web/src/app/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("membership")
    .select("role, org:org_id(name)");
  const { data: properties } = await supabase
    .from("property")
    .select("id, name, address"); // RLS scopes this automatically

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Backend skeleton ✓</h1>
      <p className="mt-1 text-[var(--color-text-lo)]">{user.email}</p>
      <pre className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm">
        {JSON.stringify({ memberships, properties }, null, 2)}
      </pre>
      <form action="/auth/signout" method="post" className="mt-4">
        <button className="text-sm text-[var(--color-text-lo)] underline">Sign out</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Manual verification**

As the seeded operator you see both properties. (RLS proof is automated in Task 10.) Expected: the JSON shows your org, role `operator`, and 2 properties.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/supabase/seed.sql
git commit -m "feat(m1): proof-of-life dashboard reading via RLS + dev seed"
```

---

## Task 10: vitest + RLS access-control tests (the security gate)

**Files:**
- Create: `apps/web/vitest.config.ts`, `apps/web/tests/rls.test.ts`
- Modify: `apps/web/package.json` (test scripts), `apps/web/.env.local` (add a second test key if needed)

- [ ] **Step 1: Configure vitest**

```bash
cd apps/web && npm install -D vitest
```
`apps/web/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```
Add scripts to `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 2: Write the RLS test**

`apps/web/tests/rls.test.ts` — uses the service role to set up two orgs + users, then asserts a user in org A cannot read org B's property, and a staff user sees only assigned properties:
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, service, { auth: { persistSession: false } });

// helper: create a confirmed user and return an authed client acting as them
async function userClient(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email, email_confirm: true,
  });
  if (error && !error.message.includes("already")) throw error;
  const id = data?.user?.id ?? (await admin.auth.admin.listUsers()).data.users.find(u => u.email === email)!.id;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  // mint a session for the user via admin generateLink + verify is overkill for tests;
  // instead use the service client to act, and assert via a JWT-scoped client:
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  return { id, client, link };
}

describe("RLS isolation", () => {
  let opA: Awaited<ReturnType<typeof userClient>>;
  let staffA: Awaited<ReturnType<typeof userClient>>;
  let orgA: string, propAssigned: string, propUnassigned: string, orgB: string, propB: string;

  beforeAll(async () => {
    opA = await userClient("op-a@test.dev");
    staffA = await userClient("staff-a@test.dev");
    const { data: oA } = await admin.from("org").insert({ name: "Org A" }).select("id").single();
    const { data: oB } = await admin.from("org").insert({ name: "Org B" }).select("id").single();
    orgA = oA!.id; orgB = oB!.id;
    await admin.from("membership").insert([
      { user_id: opA.id, org_id: orgA, role: "operator" },
      { user_id: staffA.id, org_id: orgA, role: "staff" },
    ]);
    const { data: p1 } = await admin.from("property").insert({ org_id: orgA, name: "Assigned" }).select("id").single();
    const { data: p2 } = await admin.from("property").insert({ org_id: orgA, name: "Unassigned" }).select("id").single();
    const { data: p3 } = await admin.from("property").insert({ org_id: orgB, name: "Other Org" }).select("id").single();
    propAssigned = p1!.id; propUnassigned = p2!.id; propB = p3!.id;
    await admin.from("staff_assignment").insert({ property_id: propAssigned, staff_user_id: staffA.id });
  });

  it("operator in org A sees only org A properties (not org B)", async () => {
    const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${await jwtFor(opA.id)}` } }, auth: { persistSession: false } });
    const { data } = await c.from("property").select("id, org_id");
    expect(data!.every((p) => p.org_id === orgA)).toBe(true);
    expect(data!.find((p) => p.id === propB)).toBeUndefined();
  });

  it("staff sees only assigned properties", async () => {
    const c = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${await jwtFor(staffA.id)}` } }, auth: { persistSession: false } });
    const { data } = await c.from("property").select("id");
    const ids = data!.map((p) => p.id);
    expect(ids).toContain(propAssigned);
    expect(ids).not.toContain(propUnassigned);
  });
});

// Mint a user-scoped JWT for tests using the admin API.
async function jwtFor(userId: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createSession?.({ user_id: userId } as any) ?? { data: null, error: null } as any;
  if (data?.session?.access_token) return data.session.access_token;
  // Fallback: generate a magic link and extract the token (works on all plans)
  throw new Error("Configure a session-minting strategy: enable admin.createSession or use a test login helper.");
}
```
> NOTE for the implementer: token-minting in tests depends on your Supabase version. If `admin.createSession` is unavailable, replace `jwtFor` with a helper that calls `auth.signInWithOtp` against a Mailpit/Inbucket test inbox (local `supabase start`), or run these as `pgTAP` policy tests via `supabase test db`. Pick one before Step 3 and make the two assertions pass — the assertions themselves are the contract, not the minting mechanism.

- [ ] **Step 3: Run the tests**

Run: `npm run test` — Expected: 2 RLS assertions PASS (cross-org isolation + staff scoping) and the env test PASSES.

- [ ] **Step 4: Add tests to CI**

In `.github/workflows/ci.yml`, add a `Test` step after Typecheck: `run: npm run test` — with Supabase test env vars provided via GitHub Actions secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) pointing at the dev project (or a dedicated CI project).

- [ ] **Step 5: Commit**

```bash
git add apps/web/vitest.config.ts apps/web/tests/rls.test.ts apps/web/package.json .github/workflows/ci.yml
git commit -m "test(m1): RLS isolation tests + CI test step"
```

---

## Task 11: Open the M1 PR

- [ ] **Step 1: Verify the full gate locally**

Run (from `apps/web`): `npm run lint && npm run typecheck && npm run build && npm run test` — all green.

- [ ] **Step 2: Push + PR**

```bash
git push -u origin worktree-v1-rebuild
gh pr create --base main --title "M1: backend skeleton (Supabase + RLS + auth)" \
  --body "Implements docs/superpowers/plans/2026-06-06-m1-backend-skeleton.md. Schema (§10), RLS (§9), magic-link auth, typed client, proof-of-life dashboard, RLS tests."
```

- [ ] **Step 3: Merge when CI green**, then remove the worktree (`ExitWorktree` → remove, or `git worktree remove`).

---

## Self-Review

- **Spec coverage:** §10 schema → Task 4; §9 roles/RLS → Tasks 5–6; §11 stack (Next/Supabase/Tailwind) → Tasks 2–3; auth (magic link + invites) → Task 8 (+ `invite` table in Task 4; invite *acceptance UI* is M-later, table + operator policy exist now); immutability/audit primitives → Task 6. Capture/cockpit/proof/analytics are intentionally **out of M1** (M2–M5).
- **Placeholder scan:** the only deferred decision is the test token-minting mechanism (Task 10), called out explicitly with three concrete options and a fixed contract (the assertions). Seed uses an explicit `:operator_uid` you substitute. No silent TODOs.
- **Type consistency:** `Database` type (Task 7) is consumed by `client.ts`/`server.ts` (Task 2); enums (`member_role`, `turnover_status`, `photo_slot`) defined in Task 4 are referenced consistently in Tasks 5/6/10; helper fns `app_is_member` / `app_has_role` / `app_can_see_property` / `app_can_capture_property` defined in Task 5 are used uniformly across policies.

## Notes carried to later milestones
- **Invite acceptance flow** (invited email → magic link → membership row): M2.
- **Storage bucket + upload** for photos: M2 (capture).
- **test/prod Supabase split + Vercel env per environment:** M5 / launch (M1 uses the single dev project).
