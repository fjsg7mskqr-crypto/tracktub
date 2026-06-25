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
-- Dedupe approach: NO new column. The existing unique index
-- `notification_recipient_turnover_idx (user_id, turnover_id, type)` already
-- guarantees at most one row per (recipient, turnover, type). Inserting the
-- nudge with `on conflict do nothing` is therefore idempotent: the job can run
-- every few minutes and a given draft is nudged exactly once. If the draft is
-- later submitted, `notify_turnover_ready` writes a DIFFERENT type
-- ('turnover_ready') to the operators/owners, so the two never collide.
--
-- Scheduling: the writer is a plain SECURITY DEFINER SQL function (in-app-only
-- means no edge function / pg_net / HTTP is needed — all logic lives here,
-- matching the repo's pattern of definer writers). The pg_cron job that calls it
-- is registered OUT OF BAND, not in this migration: enabling pg_cron and calling
-- cron.schedule() inside a migration transaction breaks the Supabase CLI's
-- migration apply (commits mid-file → duplicate schema_migrations key on the CI
-- `rls` replay). Keeping the migration purely additive (enum + function) lets it
-- replay cleanly from empty; the one-time schedule is operational config applied
-- to the shared DB via the Supabase MCP after this lands (see the PR / #177).
-- The function is fully unit-tested by the RLS suite regardless of the schedule.
--
--   -- one-time, run against the shared DB after the migration is applied:
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'nudge-stale-draft-turnovers', '*/5 * * * *',
--     $$select public.nudge_stale_draft_turnovers();$$
--   );
--
-- Shared-object note: this adds ONE new enum value to the existing
-- `notification_type` enum (additive, `if not exists`) — same additive pattern
-- as 20260614140100 ('assigned'). The function is brand-new. No existing
-- function/trigger/policy is altered.

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
