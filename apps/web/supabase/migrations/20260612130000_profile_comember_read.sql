-- Co-member profile read path (epic #95, issue #98).
-- The Team page lists co-members by name/email, but `profile_self_select` is
-- self-only. Add a narrow SELECT policy so a member can read the profiles of
-- users who share an org with them — and nobody else. Backed by a SECURITY
-- DEFINER helper (same pattern as the other app_* RLS helpers) so the policy
-- can't recurse through membership's own RLS.

create or replace function app_shares_org(p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from membership m_self
    join membership m_other on m_other.org_id = m_self.org_id
    where m_self.user_id = auth.uid()
      and m_other.user_id = p_user
  );
$$;

-- Only the querying user needs EXECUTE (RLS evaluates it as them); anon never
-- reads profiles. Mirrors the lockdown of the other app_* helpers.
revoke execute on function app_shares_org(uuid) from public, anon;
grant execute on function app_shares_org(uuid) to authenticated;

-- Permissive policies are OR'd, so this widens reads to co-members on top of
-- profile_self_select without touching the self-only path.
create policy profile_select_comember on profile for select to authenticated
  using (app_shares_org(id));
