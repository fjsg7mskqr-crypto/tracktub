-- Close evidence-immutability gaps on turnover child tables.
-- Applied to the live project via the Supabase MCP. Mirrors remote
-- `immutability_child_guards` (20260607031214).
--
-- WHY: guard_turnover_lock (in 0003_triggers) only protects the turnover row
-- itself. Its child tables must enforce the lock through their own policies, or
-- an operator could alter/delete dispute-grade evidence AFTER submission. This
-- adds the `status = 'draft'` guard to issue_tag writes (it had none) and
-- re-asserts it on photo's WITH CHECK so the INSERT path (which evaluates only
-- WITH CHECK) cannot attach a photo to a locked turnover.

-- issue_tag: add the draft guard (previously operator-only, no status check)
drop policy issue_write on issue_tag;
create policy issue_write on issue_tag for all
  using (exists (select 1 from turnover t join property p on p.id = t.property_id
                 where t.id = turnover_id and app_has_role(p.org_id, 'operator') and t.status = 'draft'))
  with check (exists (select 1 from turnover t join property p on p.id = t.property_id
                 where t.id = turnover_id and app_has_role(p.org_id, 'operator') and t.status = 'draft'));

-- photo: re-assert the draft guard in WITH CHECK so INSERT (which only evaluates
-- WITH CHECK) cannot attach a photo to a non-draft turnover.
drop policy photo_write on photo;
create policy photo_write on photo for all
  using (exists (select 1 from turnover t where t.id = turnover_id and app_can_capture_property(t.property_id) and t.status = 'draft'))
  with check (exists (select 1 from turnover t where t.id = turnover_id and app_can_capture_property(t.property_id) and t.status = 'draft'));
