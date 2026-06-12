-- Scope every org-membership policy to the `authenticated` role.
--
-- The original policies (20260607022847 and successors) carry no TO clause,
-- so they default to `public` and are evaluated for anon requests too. That
-- was harmless until 20260609215037 revoked EXECUTE on the app_* RLS helpers
-- from anon: now any anon query against these tables fails with
-- "permission denied for function app_can_see_property" instead of falling
-- through to the anon proof policies (20260610120000). Permissive policies
-- are OR'd per role — restricting these to `authenticated` means anon
-- requests only ever evaluate the *_public_proof policies.

alter policy profile_self_select       on profile          to authenticated;
alter policy profile_update_self       on profile          to authenticated;
alter policy org_member_select         on org              to authenticated;
alter policy org_operator_update       on org              to authenticated;
alter policy membership_select         on membership       to authenticated;
alter policy membership_operator_write on membership       to authenticated;
alter policy property_select           on property         to authenticated;
alter policy property_operator_write   on property         to authenticated;
alter policy propowner_select          on property_owner   to authenticated;
alter policy propowner_write           on property_owner   to authenticated;
alter policy staffassign_select        on staff_assignment to authenticated;
alter policy staffassign_write         on staff_assignment to authenticated;
alter policy turnover_select           on turnover         to authenticated;
alter policy turnover_insert           on turnover         to authenticated;
alter policy turnover_update_draft     on turnover         to authenticated;
alter policy photo_select              on photo            to authenticated;
alter policy photo_write               on photo            to authenticated;
alter policy issue_select              on issue_tag        to authenticated;
alter policy issue_write               on issue_tag        to authenticated;
alter policy task_select               on task             to authenticated;
alter policy task_write                on task             to authenticated;
alter policy audit_operator_select     on audit_log        to authenticated;
alter policy invite_operator_all       on invite           to authenticated;

-- The proof page also renders flagged issues; 20260610120000 covered photos
-- and the submitter profile but missed issue_tag. Same shape as
-- photo_public_proof: visible only through a locked, shared turnover.
create policy issue_public_proof on issue_tag for select to anon
using (
  exists (
    select 1 from turnover t
    where t.id = turnover_id
      and t.share_token is not null
      and t.status = 'submitted_locked'
  )
);
