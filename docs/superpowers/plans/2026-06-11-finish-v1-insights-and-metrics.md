# Finish v1 — Insights + PRD Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the thin MVP — dispute-grade proof share/open tracking in Postgres, PostHog behavioral events, and an Insights page on real Supabase data (operator stats + founder gate metrics).

**Architecture:** A new append-only `proof_event` table records `share_copied` (authenticated insert via server action) and `link_opened` (anon, via a SECURITY DEFINER RPC validated by share token). PostHog (`posthog-js`, no-op without key) captures the PRD §16 funnel events client-side. Insights becomes a server component querying org-scoped data, plus a founder-only section fed by a SECURITY DEFINER `founder_metrics()` function gated by email both in SQL and via `ADMIN_EMAILS`.

**Tech Stack:** Next.js 15 (App Router, server actions), Supabase (Postgres/RLS), posthog-js, vitest RLS suite (`npm run test:rls` on ephemeral local Supabase).

**Tracking:** Epic #81 — sub-issues #82 (proof_event), #83 (PostHog), #84 (Insights).

---

### Task 1: `proof_event` migration + RLS

**Files:**
- Create: `apps/web/supabase/migrations/20260611120000_proof_events.sql`
- Test: `apps/web/tests/rls.test.ts` (extend)

- [ ] **Step 1: Write the migration**

```sql
-- Proof-event tracking (PRD §12/§16 wedge signal): append-only record of
-- proof-link shares and recipient opens. No IPs or fingerprints — just the
-- fact, the time (server), and (for shares) the acting user.

create table public.proof_event (
  id uuid primary key default gen_random_uuid(),
  turnover_id uuid not null references public.turnover(id) on delete cascade,
  kind text not null check (kind in ('share_copied', 'link_opened')),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null
);

create index proof_event_turnover_idx on public.proof_event (turnover_id, kind);

alter table public.proof_event enable row level security;

-- Org members may read their own org's events (powers operator Insights).
create policy proof_event_select on public.proof_event for select to authenticated
using (
  exists (
    select 1 from public.turnover t
    join public.property p on p.id = t.property_id
    where t.id = turnover_id and public.app_is_org_member(p.org_id)
  )
);

-- share_copied: only an org member, only as themselves, only on a locked turnover.
create policy proof_event_insert_share on public.proof_event for insert to authenticated
with check (
  kind = 'share_copied'
  and actor_user_id = auth.uid()
  and exists (
    select 1 from public.turnover t
    join public.property p on p.id = t.property_id
    where t.id = turnover_id
      and t.status = 'submitted_locked'
      and public.app_is_org_member(p.org_id)
  )
);
-- No update/delete policies: append-only.

-- link_opened: recorded server-side for anon proof views; the RPC validates the
-- share token so anon callers can't forge events for arbitrary turnovers.
create function public.record_proof_open(p_share_token text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.proof_event (turnover_id, kind)
  select t.id, 'link_opened'
  from public.turnover t
  where t.share_token = p_share_token
    and t.status = 'submitted_locked';
$$;

revoke execute on function public.record_proof_open(text) from public;
grant execute on function public.record_proof_open(text) to anon, authenticated;

-- Founder gate metrics (PRD §16), cross-org — SECURITY DEFINER with a hard
-- email allowlist so org RLS stays intact for everyone else.
create function public.founder_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'ethan@nhs-llc.com' then
    raise exception 'not authorized';
  end if;
  select jsonb_build_object(
    'orgs', (select count(*) from org),
    'activated_orgs', (
      select count(distinct p.org_id) from turnover t
      join property p on p.id = t.property_id
      join org o on o.id = p.org_id
      where t.status = 'submitted_locked'
        and t.submitted_at_server < o.created_at + interval '7 days'),
    'retained_orgs', (
      select count(distinct p.org_id) from turnover t
      join property p on p.id = t.property_id
      join org o on o.id = p.org_id
      where t.status = 'submitted_locked'
        and t.submitted_at_server >= o.created_at + interval '7 days'),
    'locked_turnovers', (select count(*) from turnover where status = 'submitted_locked'),
    'shared_turnovers', (
      select count(distinct turnover_id) from proof_event where kind = 'share_copied'),
    'opened_turnovers', (
      select count(distinct turnover_id) from proof_event where kind = 'link_opened'),
    'total_opens', (select count(*) from proof_event where kind = 'link_opened'),
    'wtp_intents', (select count(*) from waitlist where source = 'wtp_fake_door')
  ) into result;
  return result;
end;
$$;

revoke execute on function public.founder_metrics() from public, anon;
grant execute on function public.founder_metrics() to authenticated;
```

> Check `app_is_org_member` is the actual helper name in `20260607022847_rls_policies.sql` before writing — use whatever helper the existing `turnover` select policy uses. If `org` has no `created_at`, key activation off the org's first property `created_at` instead — verify against `20260607022815_core_schema.sql`.

- [ ] **Step 2: Extend the RLS suite with failing tests**

Add to `apps/web/tests/rls.test.ts` (inside the existing describe, reusing `operatorA`, `operatorB`, the locked-turnover fixture, and the anon client pattern already there):

```ts
describe("proof_event", () => {
  it("org member can insert share_copied as themselves on a locked turnover", async () => {
    const { error } = await operatorA.client.from("proof_event").insert({
      turnover_id: lockedTurnoverId,
      kind: "share_copied",
      actor_user_id: operatorA.id,
    });
    expect(error).toBeNull();
  });

  it("cannot insert link_opened directly or as someone else", async () => {
    const direct = await operatorA.client.from("proof_event").insert({
      turnover_id: lockedTurnoverId, kind: "link_opened", actor_user_id: operatorA.id,
    });
    expect(direct.error).not.toBeNull();
    const spoofed = await operatorA.client.from("proof_event").insert({
      turnover_id: lockedTurnoverId, kind: "share_copied", actor_user_id: operatorB.id,
    });
    expect(spoofed.error).not.toBeNull();
  });

  it("other orgs and anon cannot read events; append-only (no update/delete)", async () => {
    const otherOrg = await operatorB.client.from("proof_event").select("id");
    expect(otherOrg.data).toEqual([]);
    const anonRead = await anonClient.from("proof_event").select("id");
    expect(anonRead.data ?? []).toEqual([]);
    const del = await operatorA.client.from("proof_event").delete().eq("turnover_id", lockedTurnoverId);
    expect(del.error ?? { blocked: true }).toBeTruthy();
    const after = await admin.from("proof_event").select("id").eq("turnover_id", lockedTurnoverId);
    expect((after.data ?? []).length).toBeGreaterThan(0);
  });

  it("anon record_proof_open works for a valid token only", async () => {
    const ok = await anonClient.rpc("record_proof_open", { p_share_token: shareToken });
    expect(ok.error).toBeNull();
    const bad = await anonClient.rpc("record_proof_open", { p_share_token: "nope" });
    expect(bad.error).toBeNull(); // silently no-op
    const rows = await admin.from("proof_event").select("kind").eq("turnover_id", lockedTurnoverId);
    expect(rows.data!.filter((r) => r.kind === "link_opened")).toHaveLength(1);
  });

  it("founder_metrics is denied for normal users and anon", async () => {
    const denied = await operatorA.client.rpc("founder_metrics");
    expect(denied.error).not.toBeNull();
    const anonDenied = await anonClient.rpc("founder_metrics");
    expect(anonDenied.error).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run suite against local Supabase, verify new tests fail** — `supabase start` (if not running), `supabase db reset`, then `npm run test:rls`. Expected: new tests FAIL (table missing) before the migration is applied, PASS after `supabase db reset` picks it up.
- [ ] **Step 4: Regenerate types** — `npx supabase gen types typescript --local > src/lib/supabase/types.ts` (match however types.ts was generated before; check its header).
- [ ] **Step 5: Run `npm run test:rls`** — Expected: all green including the 5 new tests.
- [ ] **Step 6: Commit** — `git commit -m "feat(db): proof_event tracking + founder_metrics (#82)"`

### Task 2: Record opens + shares in the app

**Files:**
- Modify: `apps/web/src/app/proof/[token]/page.tsx`
- Modify: `apps/web/src/app/t/[id]/ProofActions.tsx`
- Create: `apps/web/src/lib/actions/proofEvent.ts`

- [ ] **Step 1: Record `link_opened` on proof render** — in `proof/[token]/page.tsx` after the turnover loads successfully (after the `notFound()` guard):

```ts
// Wedge-signal instrumentation (PRD §16): count the recipient open server-side.
await supabase.rpc("record_proof_open", { p_share_token: token });
```

- [ ] **Step 2: Server action for shares** — `src/lib/actions/proofEvent.ts`:

```ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function recordProofShare(turnoverId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("proof_event").insert({
    turnover_id: turnoverId,
    kind: "share_copied",
    actor_user_id: user.id,
  });
}
```

- [ ] **Step 3: Wire ProofActions** — add `turnoverId: string` to `Props` (pass it from `t/[id]/page.tsx`), call `recordProofShare(turnoverId)` (fire-and-forget, `void`) in both `copyLink()` and the "Open public view" link's `onClick`.
- [ ] **Step 4: Verify** — `npm run lint && npm run typecheck && npm run build`. Manual: copy a link, open the proof page, confirm two rows in `proof_event` via local studio.
- [ ] **Step 5: Commit** — `git commit -m "feat(proof): record share and open events (#82)"`

### Task 3: WTP fake-door logs intent

**Files:**
- Modify: `apps/web/src/lib/actions/property.ts` (add `joinPaidWaitlistAction`)
- Modify: `apps/web/src/app/add-property/page.tsx`

- [ ] **Step 1: Server action** appended to `property.ts`:

```ts
export async function joinPaidWaitlistAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false };
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: user.email, source: "wtp_fake_door" });
  // Unique-email conflict still counts as intent.
  return { ok: !error || error.code === "23505" };
}
```

- [ ] **Step 2: Fake-door UI** — in the `showWtp` card, add a primary "Join the paid waitlist" button calling the action in a transition; on success swap to "You're on the list — we'll reach out." Keep the back-to-cockpit link.
- [ ] **Step 3: Verify** — lint/typecheck/build; manual: trigger fake-door with a 2nd property, join, check `waitlist` row `source='wtp_fake_door'`.
- [ ] **Step 4: Commit** — `git commit -m "feat(wtp): fake-door joins paid waitlist (#83)"`

### Task 4: PostHog instrumentation (#83)

**Files:**
- Create: `apps/web/src/lib/analytics.ts`
- Modify: `apps/web/src/app/layout.tsx`, `apps/web/src/app/add-property/page.tsx`, `apps/web/src/app/p/[id]/new/CaptureWizard.tsx`, `apps/web/src/app/t/[id]/ProofActions.tsx`, `apps/web/src/components/WaitlistForm.tsx`, `apps/web/src/components/Shell.tsx`

- [ ] **Step 1:** `npm install posthog-js`
- [ ] **Step 2: Analytics wrapper** — `src/lib/analytics.ts`:

```ts
"use client";

import posthog from "posthog-js";

// Privacy-safe defaults for an evidence platform: no input autocapture, no
// session replay. No-ops entirely when the key is absent (e.g. local dev).
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
let ready = false;

export function initAnalytics() {
  if (!key || ready) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
    person_profiles: "identified_only",
  });
  ready = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!ready) return;
  posthog.capture(event, props);
}

export function identify(id: string, email?: string) {
  if (!ready) return;
  posthog.identify(id, email ? { email } : undefined);
}
```

- [ ] **Step 3: Init + identify** — a small `"use client"` `AnalyticsProvider` component (can live in `analytics.ts`'s sibling `src/components/Analytics.tsx`) that calls `initAnalytics()` in a `useEffect` and identifies the signed-in user (Shell already has the user email — pass id/email down or fetch via supabase browser client). Mount it inside `<body>` in `layout.tsx`.
- [ ] **Step 4: Events** (each a one-line `track()` call at the success point):
  - `property_created` — add-property success path
  - `wtp_fake_door_viewed` — when `showWtp` flips true
  - `paid_waitlist_joined` — Task 3 button success
  - `turnover_started` / `turnover_submitted` — CaptureWizard mount / successful submit
  - `proof_link_copied` — ProofActions `copyLink` success
  - `waitlist_joined` — WaitlistForm (landing) success
  - `signed_up` — auth callback first-session (if not cheap to detect, rely on PostHog first-identify; don't overbuild)
- [ ] **Step 5: Verify** — lint/typecheck/build green with **no key set** (everything no-ops).
- [ ] **Step 6: Commit** — `git commit -m "feat(analytics): posthog events for PRD §16 funnel (#83)"`

### Task 5: Insights rebuild (#84)

**Files:**
- Rewrite: `apps/web/src/app/insights/page.tsx` (server component)
- Create: `apps/web/src/app/insights/FounderSection.tsx` (server component, conditional)

- [ ] **Step 1: Operator section** — server component: auth-gate (redirect `/login`), then query the user's org data: properties, locked turnovers (last 28 days, with `submitted_at_server`, photo counts, unconfirmed issue tags), `proof_event` counts grouped by kind. Compute: turnovers/week per property, % of locked turnovers with 4 photos, open-issue count, shares + opens. Reuse the existing `tiles`/`Gate` markup (keep `Gate` as a tiny local component — it has no client hooks, so it works in a server component).
- [ ] **Step 2: Founder section** — render only when `process.env.ADMIN_EMAILS?.split(",").map(s => s.trim()).includes(user.email)`; calls `supabase.rpc("founder_metrics")` and renders the §12 gates: activation % (`activated_orgs/orgs` vs ≥60%), retention (`retained_orgs/activated_orgs` vs ≥50%), share rate (`shared_turnovers/locked_turnovers` vs ≥30%), opens trend, WTP intents. Note under the section: "Cross-org founder view — PostHog has the cohort-accurate funnels."
- [ ] **Step 3: Delete dead demo code** — remove `useDB`/selectors imports; if `src/lib/store.ts` / `seed.ts` / `selectors.ts` are now unreferenced (`grep -rn "store\"\|selectors\|seed" src/`), delete them and `DemoGuide.tsx` if orphaned.
- [ ] **Step 4: Verify** — lint/typecheck/build; manual on local stack: insights as operator (stats render), as `ethan@nhs-llc.com` with `ADMIN_EMAILS` set (founder section renders), as another user (it doesn't).
- [ ] **Step 5: Commit** — `git commit -m "feat(insights): rebuild on Supabase — operator stats + founder gates (#84)"`

### Task 6: Apply to live DB, PR, ship

- [ ] **Step 1:** Apply `20260611120000_proof_events.sql` to the live project (`slkxwpiiludisrnwnxlg`) via Supabase MCP `apply_migration` (keeps `list_migrations` in sync per #76 convention).
- [ ] **Step 2:** Full local gate: `npm run lint && npm run typecheck && npm run build && npm run test:rls`.
- [ ] **Step 3:** Push, `gh pr create --base main` linking #81/#82/#83/#84; CI (`web` + `rls`) green; `/code-review`; squash-merge.
- [ ] **Step 4:** Owner actions (comment on #81): create PostHog project → set `NEXT_PUBLIC_POSTHOG_KEY` (+ optional `NEXT_PUBLIC_POSTHOG_HOST`) and `ADMIN_EMAILS=ethan@nhs-llc.com` in Vercel Preview+Production → redeploy.
- [ ] **Step 5:** Promote main→test→prod per CLAUDE.md once QA'd.
