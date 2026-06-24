-- Unfinished-turnover reminder (issue #177, fast-follow of capture epic #174).
--
-- Remind the cleaner (submitter) to finish a turnover that was started but never
-- submitted, so drafts aren't silently abandoned and a tub isn't left
-- not-guest-ready. A scheduled job finds `turnover` rows stuck in `draft` older
-- than 30 minutes and authors ONE in-app notification to the submitter.
--
-- Founder decisions (LOCKED):
--   * First nudge at 30 minutes.
--   * IN-APP ONLY — reuse the #117 notification feed. No real email send.
--   * NO host/operator escalation in this version (deferred — no booking data).
--   * One nudge per draft (don't spam).
--
-- Dedupe approach: NO new column. The existing partial-less unique index
-- `notification_recipient_turnover_idx (user_id, turnover_id, type)` already
-- guarantees at most one row per (recipient, turnover, type). Inserting the
-- nudge with `on conflict do nothing` is therefore idempotent: the job can run
-- every minute and a given draft is nudged exactly once. If the draft is later
-- submitted, `notify_turnover_ready` writes a DIFFERENT type ('turnover_ready')
-- to the operators/owners, so the two never collide.
--
-- Scheduling: pg_cron runs the SQL writer directly (in-app-only means no edge
-- function / pg_net / HTTP is needed — all logic lives in this definer function,
-- matching the repo's pattern of SECURITY DEFINER writers). The extension +
-- schedule are wrapped in a guarded DO block so the migration still replays from
-- empty on a local stack where pg_cron isn't pre-loaded (the CI `rls` gate):
-- the writer function is always created and independently testable.
--
-- Shared-object note: this adds ONE new enum value to the existing
-- `notification_type` enum (additive, `if not exists`) — same additive pattern
-- as 20260614140100 ('assigned'). Everything else is brand-new (function +
-- cron job). No existing function/trigger/policy is altered.

-- New notification kind for the draft reminder feed item. Additive.
alter type notification_type add value if not exists 'draft_reminder';

-- Writer: nudge the submitter of every stale draft turnover. SECURITY DEFINER so
-- it can author notification rows for other users (the cleaners) and read across
-- orgs despite RLS — exactly like notify_turnover_ready / notify_scheduled_assignment.
--
-- p_threshold defaults to 30 minutes (the locked first-nudge timing) but is a
-- parameter so the threshold stays tunable without a migration. Returns the
-- number of newly-authored nudges (0 on a quiet run) for observability/logging.
create or replace function nudge_stale_draft_turnovers(
  p_threshold interval default interval '30 minutes'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with stale as (
    select t.id           as turnover_id,
           t.submitter_id  as user_id,
           p.org_id        as org_id,
           t.property_id   as property_id,
           p.name          as property_name
    from turnover t
    join property p on p.id = t.property_id
    where t.status = 'draft'
      and t.created_at < now() - p_threshold
  ),
  inserted as (
    insert into notification (user_id, org_id, type, turnover_id, property_id, message)
    select s.user_id, s.org_id, 'draft_reminder', s.turnover_id, s.property_id,
           s.property_name || ' turnover unfinished — tap to finish it'
    from stale s
    -- Idempotent: the (user_id, turnover_id, type) unique index means a draft
    -- already nudged is skipped, so this is the one-nudge-per-draft guard.
    on conflict (user_id, turnover_id, type) do nothing
    returning 1
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

-- The job runs as the cron/definer owner, never as an app user. Lock execute
-- down to the owner only — no app role (anon/authenticated) may invoke it, so a
-- client can't trigger a fan-out. (notify_turnover_ready is granted to
-- authenticated because the submit path calls it; this one is cron-only.)
revoke execute on function public.nudge_stale_draft_turnovers(interval)
  from public, anon, authenticated;

-- Schedule it. Guarded so a local stack without pg_cron pre-loaded (CI replay)
-- still applies the migration cleanly — the writer function above is created
-- unconditionally and the schedule is best-effort.
do $cron$
begin
  create extension if not exists pg_cron;

  -- Re-running the migration must not stack duplicate jobs.
  perform cron.unschedule('nudge-stale-draft-turnovers')
  where exists (
    select 1 from cron.job where jobname = 'nudge-stale-draft-turnovers'
  );

  -- Every 5 minutes: a draft crosses the 30-minute line within ~5 min of it,
  -- and the dedupe makes extra runs cheap no-ops.
  perform cron.schedule(
    'nudge-stale-draft-turnovers',
    '*/5 * * * *',
    $job$select public.nudge_stale_draft_turnovers();$job$
  );
exception
  when insufficient_privilege or undefined_file or feature_not_supported then
    -- pg_cron unavailable / not pre-loaded (e.g. the ephemeral CI stack).
    -- Skip scheduling; the writer function is still installed and testable.
    raise notice 'pg_cron unavailable (%); skipping draft-nudge schedule', sqlerrm;
  when undefined_table or undefined_function or invalid_schema_name then
    raise notice 'pg_cron schema not present (%); skipping draft-nudge schedule', sqlerrm;
end;
$cron$;
