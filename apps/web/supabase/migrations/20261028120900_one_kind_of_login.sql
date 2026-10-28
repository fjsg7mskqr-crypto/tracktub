-- D29: one kind of login; the account creator manages logins.
--
-- ⚠ SHARED-OBJECT CHANGE — needs founder sign-off before it is applied to the
-- shared database (CLAUDE.md schema-change rule). It redefines:
--   functions  app_can_see_property, app_can_capture_property, accept_invite,
--              get_invite_preview
--   new        app_is_team(uuid), app_sees_all_properties(uuid),
--              app_is_assigned(uuid); property_assign_narrowed_creator() + trigger
--   policies   client, org_note, property, task, issue_tag write policies
--              (operator-only → any team login, scoped to what they can see)
-- Unchanged and still operator-only: invite, membership, org update,
-- audit_log select, staff_assignment, property_owner, billing.
-- Owners (property_owner) keep exactly their current read-only access.

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- A team login of the org: the admin (operator) or a staff login. Owners are
-- not team logins.
create or replace function public.app_is_team(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from membership m
    where m.org_id = p_org and m.user_id = auth.uid()
      and m.role in ('operator', 'staff')
  );
$$;

revoke execute on function public.app_is_team(uuid) from public, anon;
grant execute on function public.app_is_team(uuid) to authenticated;

-- Sees every property in the org: the operator, or a staff login left on
-- "all properties".
create or replace function public.app_sees_all_properties(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from membership m
    where m.org_id = p_org and m.user_id = auth.uid()
      and (m.role = 'operator' or (m.role = 'staff' and m.all_properties))
  );
$$;

revoke execute on function public.app_sees_all_properties(uuid) from public, anon;
grant execute on function public.app_sees_all_properties(uuid) to authenticated;

-- Assigned to a property (narrowed staff). SECURITY DEFINER so a property
-- policy can use it without recursing through staff_assignment's own RLS.
create or replace function public.app_is_assigned(p_property uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from staff_assignment sa
    where sa.property_id = p_property and sa.staff_user_id = auth.uid()
  );
$$;

revoke execute on function public.app_is_assigned(uuid) from public, anon;
grant execute on function public.app_is_assigned(uuid) to authenticated;

-- Sees a property: everything-seeing login, an assigned staff login, or an
-- owner of it (owners unchanged).
create or replace function public.app_can_see_property(p_property uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from property p where p.id = p_property and (
      app_sees_all_properties(p.org_id)
      or app_is_assigned(p.id)
      or exists (select 1 from property_owner po where po.property_id = p.id and po.owner_user_id = auth.uid())
    )
  );
$$;

-- Runs visits on (and edits) a property: as above, minus owners.
create or replace function public.app_can_capture_property(p_property uuid)
returns boolean
language sql
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from property p where p.id = p_property and (
      app_sees_all_properties(p.org_id) or app_is_assigned(p.id)
    )
  );
$$;

-- ── Write policies: any team login ───────────────────────────────────────────

drop policy if exists client_operator_write on public.client;
drop policy if exists client_team_write on public.client;
create policy client_team_write on public.client
  for all to authenticated
  using (app_is_team(org_id))
  with check (app_is_team(org_id));

drop policy if exists org_note_operator_write on public.org_note;
drop policy if exists org_note_team_write on public.org_note;
create policy org_note_team_write on public.org_note
  for all to authenticated
  using (app_is_team(org_id))
  with check (app_is_team(org_id));

-- One FOR ALL policy (like the operator one it replaces) written against the
-- row's own columns: its USING also covers the RETURNING row of an insert,
-- which a re-query of property (app_can_see_property) can't see yet.
drop policy if exists property_operator_write on public.property;
drop policy if exists property_team_write on public.property;
create policy property_team_write on public.property
  for all to authenticated
  using (app_sees_all_properties(org_id) or app_is_assigned(id))
  with check (app_is_team(org_id));

drop policy if exists task_write on public.task;
create policy task_write on public.task
  for all to authenticated
  using (app_can_capture_property(property_id))
  with check (app_can_capture_property(property_id));

drop policy if exists issue_write on public.issue_tag;
create policy issue_write on public.issue_tag
  for all to authenticated
  using (exists (
    select 1 from turnover t
    where t.id = issue_tag.turnover_id
      and app_can_capture_property(t.property_id)
      and t.status = 'draft'
  ))
  with check (exists (
    select 1 from turnover t
    where t.id = issue_tag.turnover_id
      and app_can_capture_property(t.property_id)
      and t.status = 'draft'
  ));

-- ── A narrowed login keeps the tubs it adds ──────────────────────────────────
-- A staff login limited to chosen properties would otherwise lose sight of a
-- tub the moment it adds one. Assign it to them. (Insert … returning still
-- can't see the row — the app supplies the id and skips returning.)
create or replace function public.property_assign_narrowed_creator()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (
    select 1 from membership m
    where m.org_id = new.org_id and m.user_id = auth.uid()
      and m.role = 'staff' and not m.all_properties
  ) and not app_has_role(new.org_id, 'operator') then
    insert into staff_assignment (property_id, staff_user_id)
    values (new.id, auth.uid())
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function public.property_assign_narrowed_creator() from public, anon, authenticated;

drop trigger if exists property_assign_narrowed_creator on public.property;
create trigger property_assign_narrowed_creator
  after insert on public.property
  for each row execute function public.property_assign_narrowed_creator();

-- ── Invites ──────────────────────────────────────────────────────────────────

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_invite invite%rowtype;
  v_prop uuid;
begin
  if v_uid is null then
    raise exception 'authentication required';
  end if;

  select * into v_invite from invite where token = p_token for update;
  if not found then
    raise exception 'invite not found';
  end if;

  -- Already consumed: a no-op success for the same user (idempotent), otherwise
  -- the one-time link has been used.
  if v_invite.accepted_at is not null then
    if exists (
      select 1 from membership m
      where m.user_id = v_uid and m.org_id = v_invite.org_id
    ) then
      return v_invite.org_id;
    end if;
    raise exception 'invite already used';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'invite expired';
  end if;

  insert into membership (user_id, org_id, role, all_properties)
  values (
    v_uid, v_invite.org_id, v_invite.role,
    v_invite.role <> 'staff' or v_invite.all_properties
  )
  on conflict (user_id, org_id) do nothing;

  foreach v_prop in array v_invite.property_ids loop
    if v_invite.role = 'staff' and not v_invite.all_properties then
      insert into staff_assignment (property_id, staff_user_id)
      values (v_prop, v_uid)
      on conflict do nothing;
    elsif v_invite.role = 'owner' then
      insert into property_owner (property_id, owner_user_id)
      values (v_prop, v_uid)
      on conflict do nothing;
    end if;
  end loop;

  update invite set accepted_at = now() where id = v_invite.id;

  return v_invite.org_id;
end;
$$;

create or replace function public.get_invite_preview(p_token text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'role', i.role,
    'org_name', o.name,
    'inviter_name', coalesce(nullif(pr.full_name, ''), pr.email),
    'all_properties', i.all_properties,
    'property_names', coalesce((
      select jsonb_agg(p.name order by p.name)
      from property p
      where p.id = any (i.property_ids)
    ), '[]'::jsonb),
    'expires_at', i.expires_at
  )
  from invite i
  join org o on o.id = i.org_id
  join profile pr on pr.id = i.invited_by
  where i.token = p_token
    and i.accepted_at is null
    and i.expires_at > now();
$$;
