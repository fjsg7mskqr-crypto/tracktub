-- Dev seed for the proof-of-life dashboard (M1).
--
-- Real users live in auth.users and are created by signing in (magic link) or via
-- the admin API. After your first sign-in, copy your auth user id from the Supabase
-- dashboard (Authentication → Users) and replace :operator_uid below, then run this
-- against the project (via the MCP execute_sql, or psql).
--
-- The automated RLS test suite (tests/rls.test.ts) does NOT use this seed — it
-- creates and tears down its own users/orgs. This seed is only for eyeballing the
-- dashboard as a real operator.

insert into org (id, name)
  values ('00000000-0000-0000-0000-0000000000aa', 'Cascade Stays')
  on conflict (id) do nothing;

insert into membership (user_id, org_id, role)
  values (':operator_uid', '00000000-0000-0000-0000-0000000000aa', 'operator')
  on conflict (user_id, org_id) do nothing;

insert into property (id, org_id, name, address) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000aa', 'Ridgeline A-Frame', 'Big Bear, CA'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000aa', 'Lakeview Cabin 4', 'Big Bear Lake, CA')
  on conflict (id) do nothing;

-- Optional: a staff user scoped to ONE property, so you can eyeball the
-- staff-only view (sees Ridgeline only, not Lakeview). Replace :staff_uid with a
-- second auth user id (sign in a second account, or create via the admin API).
insert into membership (user_id, org_id, role)
  values (':staff_uid', '00000000-0000-0000-0000-0000000000aa', 'staff')
  on conflict (user_id, org_id) do nothing;
insert into staff_assignment (property_id, staff_user_id)
  values ('00000000-0000-0000-0000-0000000000b1', ':staff_uid')
  on conflict do nothing;
