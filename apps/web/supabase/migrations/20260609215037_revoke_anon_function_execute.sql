-- Close out security advisor 0028 (anon-callable SECURITY DEFINER functions).
-- Companion to 20260608023717: that migration revoked the role-level grants on
-- trigger functions but left two gaps the advisor still flags.
--
-- 1. The app_* RLS helpers: 20260607023127 revoked them from `public` and
--    granted `authenticated`, but anon's ROLE-LEVEL grant survived (revoking
--    from `public` does not touch it), so they remained anon-callable via
--    `/rest/v1/rpc/...`. Signed-out callers have no business probing them —
--    every current policy runs as `authenticated`. The M2 share_token proof
--    flow will use its own anon SELECT policies, not these helpers.
--    (`authenticated` keeps EXECUTE on purpose: RLS policy evaluation invokes
--    the helpers as the querying user — advisor 0029 on them is accepted.)
revoke execute on function public.app_is_member(uuid)             from anon;
revoke execute on function public.app_has_role(uuid, member_role) from anon;
revoke execute on function public.app_can_see_property(uuid)      from anon;
revoke execute on function public.app_can_capture_property(uuid)  from anon;

-- 2. rls_auto_enable() was missed by the trigger lockdown entirely. It is an
--    event-trigger function (auto-enables RLS on new tables); the event-trigger
--    system invokes it as its owner, so no API role ever needs EXECUTE.
revoke execute on function public.rls_auto_enable() from anon, authenticated;
