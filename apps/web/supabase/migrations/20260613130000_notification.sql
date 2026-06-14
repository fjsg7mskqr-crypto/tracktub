-- Host "turnover ready" notifications (issue #117, demo epic #113).
-- When a cleaner submits a turnover, the property's org operators + owners are
-- notified in-app that the tub is turned over and guest-ready.
--
-- RLS model: a recipient reads ONLY their own notifications and may mark them
-- read (that single UPDATE). There is deliberately NO insert policy for
-- anon/authenticated — rows are authored server-side by the SECURITY DEFINER
-- function `notify_turnover_ready`, exactly like proof_event's `record_proof_open`
-- and the audit_log writer. This keeps writes un-forgeable and the RLS suite
-- trivially provable.

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
-- One ready-notification per (recipient, turnover): lets the writer be
-- idempotent (on conflict do nothing) if the fan-out is ever retried.
create unique index notification_recipient_turnover_idx
  on notification (user_id, turnover_id, type);

alter table notification enable row level security;

-- Recipients read their own; mark-as-read is the only allowed mutation.
create policy notification_select_own on notification
  for select to authenticated
  using (user_id = auth.uid());
create policy notification_update_own on notification
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- No insert/delete policies: all writes flow through notify_turnover_ready().

-- Defense-in-depth: the only mutation a recipient may make is marking a row
-- read. Column-level privileges restrict UPDATE to `read_at` so the message,
-- scope columns, etc. can never be rewritten even on one's own row. (The
-- definer writer below inserts as its owner, so this does not affect fan-out.)
revoke update on table notification from authenticated;
grant update (read_at) on table notification to authenticated;

-- Fan-out writer. Called from the submit action after the turnover locks.
-- Inserts one `turnover_ready` row per operator/owner membership of the
-- property's org, excluding the submitter, and returns the recipient emails so
-- the caller can fire the (stubbed) email send. SECURITY DEFINER so it can
-- author rows for other users and read `profile.email` despite RLS.
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
  where t.id = p_turnover_id
    and t.status = 'submitted_locked';

  -- No-op unless the turnover exists, is locked, AND the caller is authorized to
  -- capture that property (operator or assigned staff). This gate stops any
  -- authenticated user from invoking this definer RPC to spam another org's
  -- hosts — only the legitimate submitter's path reaches the fan-out.
  if v_org_id is null or not app_can_capture_property(v_property_id) then
    return;
  end if;

  insert into notification (user_id, org_id, type, turnover_id, property_id, message)
  select m.user_id, v_org_id, 'turnover_ready', p_turnover_id, v_property_id,
         v_property_name || ' turned over — guest-ready'
  from membership m
  where m.org_id = v_org_id
    and m.role in ('operator', 'owner')
    and m.user_id <> v_submitter
  on conflict (user_id, turnover_id, type) do nothing;

  return query
    select pr.email
    from membership m
    join profile pr on pr.id = m.user_id
    where m.org_id = v_org_id
      and m.role in ('operator', 'owner')
      and m.user_id <> v_submitter;
end;
$$;

-- Trigger-style functions stay locked down; this RPC is called by the app as the
-- authenticated user, mirroring record_proof_open's grant.
revoke execute on function public.notify_turnover_ready(uuid) from public, anon;
grant  execute on function public.notify_turnover_ready(uuid) to authenticated;
