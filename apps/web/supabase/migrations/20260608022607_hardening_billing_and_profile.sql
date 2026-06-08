-- Minor hardening (two low-severity gaps).
-- Applied to the live project via the Supabase MCP. Mirrors remote
-- `hardening_billing_and_profile` (20260608022607).
--
-- (1) An operator could UPDATE its own org row (org_operator_update), and that row
--     includes plan/billing_ref — so an operator could self-serve a plan upgrade.
--     These columns are owned by the billing backend (service_role / no JWT); a
--     guard rejects client writes to them while still allowing org-name edits.
-- (2) handle_new_user inserted new.email into profile.email (NOT NULL); a future
--     phone/anonymous provider with a null email would fail signup. Coalesce it.

create or replace function guard_org_billing_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
     and (new.plan is distinct from old.plan
          or new.billing_ref is distinct from old.billing_ref) then
    raise exception 'plan and billing_ref are managed by billing, not the client';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_org_billing_columns() from public;

create trigger org_billing_guard before update on org for each row execute function guard_org_billing_columns();

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profile (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;
