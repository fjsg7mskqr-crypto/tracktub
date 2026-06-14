# Turnover-complete → host notification (demo)

Issue: #117 · Epic: #113 (demo-ready) · Branch: `fjsg7mskqr-crypto/d-turnover-complete-host-notification-demo-113`

## Goal
When a cleaner submits a turnover, the property's host/operator (and any org
owner) is notified in-app that the tub is **turned over and guest-ready**. The
notification appears on the web **Dashboard** (`/`) for recipients. A real email
send is **stubbed/logged locally only** — real delivery is a fast-follow,
out of scope for this epic.

## The hard part: RLS for server-authored rows
The submit action (`turnover.ts`) runs as the **authenticated submitter**. It
cannot directly `insert` notification rows for *other* users — any correct RLS
would reject `user_id <> auth.uid()`. The repo already solves this two ways:
`audit_log` (SECURITY DEFINER trigger) and `record_proof_open` (SECURITY DEFINER
RPC). We follow the **RPC** pattern.

### Chosen approach — SECURITY DEFINER RPC called from the action
A function `notify_turnover_ready(p_turnover_id uuid)`:
- `security definer`, `set search_path = public`, EXECUTE granted to
  `authenticated` only (revoked from `public`/`anon`), mirroring
  `record_proof_open`.
- Resolves the turnover's property (name, org_id) and `submitter_id`.
- Only acts on a **locked** turnover (`status = 'submitted_locked'`) — defensive,
  so it can't be abused to spam notifications for a draft.
- Inserts one `turnover_ready` notification per **operator + owner** membership of
  the property's org, **excluding `submitter_id`**.
- Builds the message in SQL: `<property name> turned over — guest-ready`.
- `returns table(email text)` — the recipient emails (from `profile`) — so the
  action can fire the email stub per recipient without a second RLS-sensitive
  query.

The `notification` table gets **only** a `select`-own and `update`-own policy —
**no** authenticated INSERT policy. This keeps the RLS suite trivially provable
(a user sees/updates only their own rows; nobody can forge a notification) and
all writes flow through the definer RPC.

**Recipients (confirmed):** org-level operator + owner memberships, minus the
submitter. (Per-property `property_owner` scoping was considered and rejected as
out of scope for the issue.)

## Schema — `20260613130000_notification.sql`
```sql
create type notification_type as enum ('turnover_ready');

create table notification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references org(id) on delete cascade,
  type notification_type not null,
  turnover_id uuid references turnover(id) on delete cascade,
  property_id uuid references property(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on notification (user_id, read_at);

alter table notification enable row level security;

-- recipients read their own; mark-as-read is the only allowed update
create policy notification_select_own on notification
  for select to authenticated using (user_id = auth.uid());
create policy notification_update_own on notification
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- NO insert policy: all writes go through notify_turnover_ready() (definer).

create or replace function notify_turnover_ready(p_turnover_id uuid)
returns table (email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_org_id uuid;
  v_property_name text;
  v_submitter uuid;
begin
  select t.property_id, p.org_id, p.name, t.submitter_id
    into v_property_id, v_org_id, v_property_name, v_submitter
  from turnover t
  join property p on p.id = t.property_id
  where t.id = p_turnover_id and t.status = 'submitted_locked';

  if v_org_id is null then
    return;  -- unknown or not-locked turnover: no-op
  end if;

  insert into notification (user_id, org_id, type, turnover_id, property_id, message)
  select m.user_id, v_org_id, 'turnover_ready', p_turnover_id, v_property_id,
         v_property_name || ' turned over — guest-ready'
  from membership m
  where m.org_id = v_org_id
    and m.role in ('operator', 'owner')
    and m.user_id <> v_submitter;

  return query
    select pr.email
    from membership m
    join profile pr on pr.id = m.user_id
    where m.org_id = v_org_id
      and m.role in ('operator', 'owner')
      and m.user_id <> v_submitter;
end;
$$;

revoke execute on function public.notify_turnover_ready(uuid) from public, anon;
grant  execute on function public.notify_turnover_ready(uuid) to authenticated;
```
Migration applied to the live project via Supabase MCP after local replay
(per repo convention; prod is source of truth — `migration-history-drift`).

## `turnover.ts` — emit on submit
After the lock `update` succeeds, before `return`:
```ts
const { data: recipients } = await supabase.rpc("notify_turnover_ready", {
  p_turnover_id: turnover.id,
});
for (const r of recipients ?? []) {
  await sendReadyEmail(r.email, propertyName);
}
```
`propertyName` requires adding `name` to the property select at the top of the
action (`.select("id, org_id, name")`). The whole block is best-effort — wrap so
a notification failure never breaks the (already-committed) turnover submit.

## `email.ts` — stub
Append to the existing `src/lib/email.ts` (it currently holds `normalizeEmail`):
```ts
// Stubbed email for the local demo. Logs the message; no real delivery.
// Real send (Supabase edge/cron) is a fast-follow — see epic #113 out-of-scope.
export async function sendReadyEmail(to: string, propertyName: string) {
  console.info(
    `[email:stub] to=${to} subject="${propertyName} is guest-ready" — turnover complete`,
  );
}
```

## `notification.ts` — mark-read action
New `src/lib/actions/notification.ts`:
```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);          // RLS scopes to the caller's own rows
  revalidatePath("/");
}
```
A "mark all read" variant (no `.eq("id")`, filter `read_at is null`) powers the
banner's dismiss-all control.

## Dashboard (`app/page.tsx`)
- Query the current user's **unread** notifications:
  `select id, message, created_at, property_id from notification
   where read_at is null order by created_at desc` (RLS already scopes to the
  user). Only operators/owners reach the dashboard branch (cleaners get
  `CleanerHome`), which is exactly who receives these.
- Render a feed of on-brand `note`/`badge`-styled rows at the top of the
  `stack`, above "Your hot tubs": each shows `● <message> · <timeAgo>` with a
  small "Mark read" button (a tiny client component calling
  `markNotificationRead`), plus a "Mark all read" affordance when >1.
- Green dot = the brand's verified/ready state (allowed per brand rule).

## Types — `src/lib/supabase/types.ts`
Regenerate (or hand-add) the `notification` table row/insert/update types and the
`notification_type` enum + the `notify_turnover_ready` function signature so
`turnover.ts`, the action, and the dashboard query are typed.

## Testing
- **RLS suite** (`tests/rls.test.ts`): add a case proving a user sees **only their
  own** notifications — seed two users in two orgs (or operator vs owner), call
  the RPC (or insert via admin) for each, assert each authenticated client's
  `select` returns only its own rows and zero of the other's.
- `supabase db reset` + `npm run test:rls` replay clean.
- `npm run lint && npm run typecheck && npm run build` green.
- Manual in `tt-demo`: submit as cleaner → sign in as host/operator → see the
  ready notification on the Dashboard → mark read → it clears; email stub line
  appears in the dev server log.

## Done when
Submitting a turnover creates a host-visible "ready" notification on the
Dashboard, the email stub logs once per recipient, RLS proven, all checks green,
PR merged to `main`.
