-- M1 hardening — pin search_path + lock down EXECUTE on SECURITY DEFINER helpers
-- Applied to the live project via the Supabase MCP. Mirrors remote `harden_functions` (20260607023127).

-- Pin search_path on the trigger function
alter function public.guard_turnover_lock() set search_path = public;

-- RLS helpers: remove the implicit PUBLIC execute (so anon can't call them via /rpc),
-- grant only to authenticated (needed for policy evaluation).
revoke execute on function public.app_is_member(uuid) from public;
revoke execute on function public.app_has_role(uuid, member_role) from public;
revoke execute on function public.app_can_see_property(uuid) from public;
revoke execute on function public.app_can_capture_property(uuid) from public;
grant execute on function public.app_is_member(uuid) to authenticated;
grant execute on function public.app_has_role(uuid, member_role) to authenticated;
grant execute on function public.app_can_see_property(uuid) to authenticated;
grant execute on function public.app_can_capture_property(uuid) to authenticated;

-- Trigger functions: no client role needs to call these directly (they fire on DML).
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.guard_turnover_lock() from public;
