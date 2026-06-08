-- Lock down EXECUTE on trigger-only functions.
-- Applied to the live project via the Supabase MCP. Mirrors remote
-- `lock_trigger_function_execute` (20260608023717).
--
-- WHY: trigger functions are invoked by the trigger system, never via PostgREST
-- RPC, so anon/authenticated have no reason to hold EXECUTE on them. A plain
-- `revoke ... from public` does NOT remove Supabase's role-level grants, so these
-- still appeared in security advisors 0028/0029 as `/rest/v1/rpc/...`-callable.
-- Revoke the role grants explicitly. (The app_* RLS *helpers* deliberately keep
-- authenticated EXECUTE — RLS policy evaluation runs them as the querying user.)
revoke execute on function public.set_turnover_server_fields() from anon, authenticated;
revoke execute on function public.log_evidence_change()        from anon, authenticated;
revoke execute on function public.deny_audit_update()          from anon, authenticated;
revoke execute on function public.guard_org_billing_columns()  from anon, authenticated;
revoke execute on function public.handle_new_user()            from anon, authenticated;
revoke execute on function public.guard_turnover_lock()        from anon, authenticated;
