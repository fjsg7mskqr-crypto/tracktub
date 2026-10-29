-- proof_client_name: the client's name for the owner record at /proof/[token]
-- (app rebuild follow-up). A token-checked function instead of an anon policy
-- on client: the *_public_proof policies don't check the token, so a table
-- policy would let anyone with the public anon key list every shared client's
-- name and contact_email. This returns the name only, and only for the
-- turnover whose share_token is passed.
-- ADDITIVE ONLY: one new function. Nothing existing changes.
create or replace function public.proof_client_name(p_token text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.name
  from turnover t
  join property p on p.id = t.property_id
  join client c on c.id = p.client_id
  where t.share_token = p_token
    and t.status = 'submitted_locked'
  limit 1;
$$;

revoke all on function public.proof_client_name(text) from public;
grant execute on function public.proof_client_name(text) to anon, authenticated;
