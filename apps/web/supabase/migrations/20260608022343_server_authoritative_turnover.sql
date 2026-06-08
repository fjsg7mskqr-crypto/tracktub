-- Make turnover attribution server-authoritative (PRD §8.2).
-- Applied to the live project via the Supabase MCP. Mirrors remote
-- `server_authoritative_turnover` (20260608022343).
--
-- WHY: turnover.submitter_id and submitted_at_server were plain client-writable
-- columns, so any capture-authorized user could forge the "verified submitter" or
-- backdate the "server time" — the two proof primitives this product sells. A
-- BEFORE INSERT trigger now stamps both from the request itself for end users,
-- and the insert policy refuses any row attributed to someone other than the actor.

create or replace function set_turnover_server_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Only override when a real end user is acting (authenticated requests carry a
  -- JWT sub). Trusted server-side callers (service_role / no JWT) keep control so
  -- backfills, imports and the test harness can set these columns explicitly.
  if auth.uid() is not null then
    new.submitter_id := auth.uid();
    new.submitted_at_server := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.set_turnover_server_fields() from public;

create trigger turnover_server_fields
  before insert on turnover
  for each row execute function set_turnover_server_fields();

-- Defense in depth at the policy layer: even if the trigger were bypassed, an
-- authenticated user cannot attribute a turnover to anyone but themselves.
drop policy turnover_insert on turnover;
create policy turnover_insert on turnover for insert
  with check (app_can_capture_property(property_id) and submitter_id = auth.uid());
