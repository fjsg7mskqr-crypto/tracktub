-- Proof-event tracking (PRD §12/§16 wedge signal): append-only record of
-- proof-link shares and recipient opens. No IPs or fingerprints — just the
-- fact, the server time, and (for shares) the acting user.

create table proof_event (
  id uuid primary key default gen_random_uuid(),
  turnover_id uuid not null references turnover(id) on delete cascade,
  kind text not null check (kind in ('share_copied', 'link_opened')),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null
);

create index proof_event_turnover_idx on proof_event (turnover_id, kind);

alter table proof_event enable row level security;

-- Org members may read their own org's events (powers operator Insights).
create policy proof_event_select on proof_event for select to authenticated
  using (exists (
    select 1 from turnover t
    where t.id = turnover_id and app_can_see_property(t.property_id)
  ));

-- share_copied: only an org member, only as themselves, only on a locked record.
create policy proof_event_insert_share on proof_event for insert to authenticated
  with check (
    kind = 'share_copied'
    and actor_user_id = auth.uid()
    and exists (
      select 1 from turnover t
      where t.id = turnover_id
        and t.status = 'submitted_locked'
        and app_can_see_property(t.property_id)
    )
  );
-- No update/delete policies: append-only.

-- link_opened: recorded server-side when the public proof page renders. The
-- share token gates the insert so anon callers can't forge events for
-- arbitrary turnovers; an unknown token is a silent no-op.
create or replace function record_proof_open(p_share_token text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into proof_event (turnover_id, kind)
  select t.id, 'link_opened'
  from turnover t
  where t.share_token = p_share_token
    and t.status = 'submitted_locked';
$$;

revoke execute on function record_proof_open(text) from public;
grant execute on function record_proof_open(text) to anon, authenticated;

-- Founder gate metrics (PRD §16), cross-org — SECURITY DEFINER with a hard
-- email allowlist so org RLS stays intact for everyone else. Activation = a
-- locked turnover within the org's first 7 days; retention = one after that.
create or replace function founder_metrics()
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

revoke execute on function founder_metrics() from public, anon;
grant execute on function founder_metrics() to authenticated;
