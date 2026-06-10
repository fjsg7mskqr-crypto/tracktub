-- Follow-up to 20260609215037: rls_auto_enable() still carried a PUBLIC grant
-- (`=X` in proacl), which anon/authenticated inherit even after the role-level
-- revokes — so advisor 0028 kept flagging it. Event-trigger functions need no
-- API-role EXECUTE at all. Applied to the live project via the Supabase MCP
-- (`revoke_public_rls_auto_enable`); advisor 0028 confirmed clear afterwards.
revoke execute on function public.rls_auto_enable() from public;
