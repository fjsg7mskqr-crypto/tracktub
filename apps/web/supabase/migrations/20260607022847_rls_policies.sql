-- M1 RLS helper functions + policies (PRD §9)
-- Applied to the live project via the Supabase MCP. Mirrors remote `rls_policies` (20260607022847).
-- Helpers are SECURITY DEFINER to avoid recursive RLS when checking membership.
create or replace function app_is_member(p_org uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from membership m where m.org_id = p_org and m.user_id = auth.uid());
$$;

create or replace function app_has_role(p_org uuid, p_role member_role)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from membership m where m.org_id = p_org and m.user_id = auth.uid() and m.role = p_role);
$$;

create or replace function app_can_see_property(p_property uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from property p where p.id = p_property and (
      app_has_role(p.org_id, 'operator')
      or exists (select 1 from staff_assignment sa where sa.property_id = p.id and sa.staff_user_id = auth.uid())
      or exists (select 1 from property_owner po where po.property_id = p.id and po.owner_user_id = auth.uid())
    )
  );
$$;

create or replace function app_can_capture_property(p_property uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from property p where p.id = p_property and (
      app_has_role(p.org_id, 'operator')
      or exists (select 1 from staff_assignment sa where sa.property_id = p.id and sa.staff_user_id = auth.uid())
    )
  );
$$;

alter table profile          enable row level security;
alter table org              enable row level security;
alter table membership       enable row level security;
alter table property         enable row level security;
alter table property_owner   enable row level security;
alter table staff_assignment enable row level security;
alter table turnover         enable row level security;
alter table photo            enable row level security;
alter table issue_tag        enable row level security;
alter table task             enable row level security;
alter table audit_log        enable row level security;
alter table invite           enable row level security;

create policy profile_self_select on profile for select using (id = auth.uid());
create policy profile_update_self on profile for update using (id = auth.uid()) with check (id = auth.uid());

create policy org_member_select on org for select using (app_is_member(id));
create policy org_operator_update on org for update using (app_has_role(id, 'operator'));

create policy membership_select on membership for select using (app_is_member(org_id));
create policy membership_operator_write on membership for all
  using (app_has_role(org_id, 'operator')) with check (app_has_role(org_id, 'operator'));

create policy property_select on property for select using (app_can_see_property(id));
create policy property_operator_write on property for all
  using (app_has_role(org_id, 'operator')) with check (app_has_role(org_id, 'operator'));

create policy propowner_select on property_owner for select
  using (exists (select 1 from property p where p.id = property_id and app_is_member(p.org_id)));
create policy propowner_write on property_owner for all
  using (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')))
  with check (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')));

create policy staffassign_select on staff_assignment for select
  using (exists (select 1 from property p where p.id = property_id and app_is_member(p.org_id)));
create policy staffassign_write on staff_assignment for all
  using (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')))
  with check (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')));

create policy turnover_select on turnover for select using (app_can_see_property(property_id));
create policy turnover_insert on turnover for insert with check (app_can_capture_property(property_id));
create policy turnover_update_draft on turnover for update
  using (app_can_capture_property(property_id) and status = 'draft')
  with check (app_can_capture_property(property_id));

create policy photo_select on photo for select
  using (exists (select 1 from turnover t where t.id = turnover_id and app_can_see_property(t.property_id)));
create policy photo_write on photo for all
  using (exists (select 1 from turnover t where t.id = turnover_id and app_can_capture_property(t.property_id) and t.status = 'draft'))
  with check (exists (select 1 from turnover t where t.id = turnover_id and app_can_capture_property(t.property_id)));

create policy issue_select on issue_tag for select
  using (exists (select 1 from turnover t where t.id = turnover_id and app_can_see_property(t.property_id)));
create policy issue_write on issue_tag for all
  using (exists (select 1 from turnover t join property p on p.id = t.property_id where t.id = turnover_id and app_has_role(p.org_id, 'operator')))
  with check (exists (select 1 from turnover t join property p on p.id = t.property_id where t.id = turnover_id and app_has_role(p.org_id, 'operator')));

create policy task_select on task for select using (app_can_see_property(property_id));
create policy task_write on task for all
  using (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')))
  with check (exists (select 1 from property p where p.id = property_id and app_has_role(p.org_id, 'operator')));

create policy audit_operator_select on audit_log for select using (app_has_role(org_id, 'operator'));

create policy invite_operator_all on invite for all
  using (app_has_role(org_id, 'operator')) with check (app_has_role(org_id, 'operator'));
