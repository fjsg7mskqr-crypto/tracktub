-- M1 triggers — profile-on-signup + turnover immutability lock
-- Applied to the live project via the Supabase MCP. Mirrors remote `triggers` (20260607022901).

-- Create a profile row whenever an auth user is created
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profile (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Prevent edits to a locked turnover (immutability)
create or replace function guard_turnover_lock()
returns trigger language plpgsql as $$
begin
  if old.status = 'submitted_locked' then
    raise exception 'turnover % is locked and cannot be modified', old.id;
  end if;
  return new;
end; $$;

create trigger turnover_lock_guard
  before update on turnover
  for each row execute function guard_turnover_lock();
