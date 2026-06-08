-- Audit trail writer for evidence tables (PRD §9: "audit log for all tag changes").
-- Applied to the live project via the Supabase MCP. Mirrors remote
-- `audit_log_writer` (20260608022512).
--
-- WHY: audit_log had a SELECT policy but no writer, so it was permanently empty.
-- A SECURITY DEFINER AFTER trigger now records every insert/update on turnover,
-- issue_tag and photo (actor = auth.uid()); an UPDATE guard keeps the log
-- append-only. DELETE is intentionally NOT audited: clients can never delete
-- evidence (RLS immutability), so the only deletes are structural org/property
-- cascades, and auditing those mid-cascade would race the audit_log FK cleanup.

create or replace function log_evidence_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_diff jsonb;
begin
  if tg_table_name = 'turnover' then
    select p.org_id into v_org from property p where p.id = new.property_id;
  else
    -- issue_tag / photo carry turnover_id
    select p.org_id into v_org
      from turnover t join property p on p.id = t.property_id
      where t.id = new.turnover_id;
  end if;

  if tg_op = 'INSERT' then
    v_diff := jsonb_build_object('new', to_jsonb(new));
  else
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  end if;

  if v_org is not null then
    insert into audit_log(org_id, entity, entity_id, action, actor_id, diff)
    values (v_org, tg_table_name, new.id, tg_op, auth.uid(), v_diff);
  end if;

  return new;
end;
$$;

revoke execute on function public.log_evidence_change() from public;

create trigger audit_turnover  after insert or update on turnover  for each row execute function log_evidence_change();
create trigger audit_issue_tag after insert or update on issue_tag for each row execute function log_evidence_change();
create trigger audit_photo     after insert or update on photo     for each row execute function log_evidence_change();

-- Append-only: forbid UPDATEs to the audit log for everyone (incl. service_role).
-- DELETE is left to RLS (no client policy grants it) so org-deletion cascades work.
create or replace function deny_audit_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'audit_log is append-only and cannot be updated';
end;
$$;

revoke execute on function public.deny_audit_update() from public;

create trigger audit_log_no_update before update on audit_log for each row execute function deny_audit_update();
