-- Provision a workspace for each new user (self-serve Google signup).
-- Applied to the live project (ref slkxwpiiludisrnwnxlg) via the Supabase MCP.
-- Mirrors remote `workspace_on_signup` (20260608193153).
--
-- Extends handle_new_user (previously profile-only) to also create an org and an
-- operator membership. SECURITY DEFINER so it can write membership despite
-- membership_operator_write RLS — a brand-new user is not yet an operator of
-- anything, so they cannot create their own membership from the client.

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_org_id uuid;
  v_name text;
begin
  -- 1. Profile (existing behavior; coalesce null email per prior hardening).
  insert into profile (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;

  -- 2. New empty workspace + operator membership. Skip if the user somehow
  --    already has a membership (idempotent on re-fire).
  if not exists (select 1 from membership m where m.user_id = new.id) then
    v_name := coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'My'
    ) || '''s workspace';
    insert into org (name) values (v_name) returning id into v_org_id;
    insert into membership (user_id, org_id, role) values (new.id, v_org_id, 'operator');
  end if;

  return new;
end; $$;

-- Re-lock execute (mirrors 20260608023717_lock_trigger_function_execute): only
-- the trigger (definer context) runs this, never API roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Backfill: existing users with no membership get a workspace too. Idempotent.
do $$
declare
  r record;
  v_org_id uuid;
  v_name text;
begin
  for r in
    select p.id, p.email, p.full_name
    from profile p
    where not exists (select 1 from membership m where m.user_id = p.id)
  loop
    v_name := coalesce(
      nullif(r.full_name, ''),
      nullif(split_part(coalesce(r.email, ''), '@', 1), ''),
      'My'
    ) || '''s workspace';
    insert into org (name) values (v_name) returning id into v_org_id;
    insert into membership (user_id, org_id, role) values (r.id, v_org_id, 'operator');
  end loop;
end $$;
