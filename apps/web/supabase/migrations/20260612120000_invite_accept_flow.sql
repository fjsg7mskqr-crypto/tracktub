-- Invite accept flow (epic #95, issue #97).
-- Link-first invites: a host (operator) shares a one-time /invite/{token} link;
-- the invitee signs in and joins the host's org as `staff` (capture) or `owner`
-- (read-only), scoped to specific properties. Mirrors the capability-link +
-- SECURITY-DEFINER-RPC pattern of record_proof_open (20260611120000).

-- Email is now optional/informational — the flow is link-first.
alter table invite alter column email drop not null;

-- Public-safe preview of a valid, unexpired, unaccepted invite. Returns just
-- what the accept screen needs (inviter, org, role, the invited property names),
-- never the whole invite table. NULL when the token is missing/expired/accepted.
-- SECURITY DEFINER so anon can read it without any direct table grants.
create or replace function get_invite_preview(p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'role', i.role,
    'org_name', o.name,
    'inviter_name', coalesce(nullif(pr.full_name, ''), pr.email),
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

revoke execute on function get_invite_preview(text) from public;
grant execute on function get_invite_preview(text) to anon, authenticated;

-- Accept an invite as the current user. SECURITY DEFINER is required because the
-- accepting user is not yet an operator of the org, so membership_operator_write
-- would block a normal membership insert — same justification as
-- handle_new_user. Idempotent for the accepting user; rejects expired tokens and
-- a token already consumed by someone else.
create or replace function accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
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

  insert into membership (user_id, org_id, role)
  values (v_uid, v_invite.org_id, v_invite.role)
  on conflict (user_id, org_id) do nothing;

  foreach v_prop in array v_invite.property_ids loop
    if v_invite.role = 'staff' then
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

revoke execute on function accept_invite(text) from public, anon;
grant execute on function accept_invite(text) to authenticated;
