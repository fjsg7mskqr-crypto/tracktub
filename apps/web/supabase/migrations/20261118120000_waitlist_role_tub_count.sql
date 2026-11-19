-- Waitlist: two optional, nullable fields so a sign-up says who they are.
-- Additive only (new nullable columns); the insert-only RLS policy is unchanged.
-- NOT applied to the shared DB yet — the coordinator applies it.

alter table public.waitlist
  add column if not exists role text,
  add column if not exists tub_count integer;

alter table public.waitlist
  drop constraint if exists waitlist_role_check,
  add constraint waitlist_role_check
    check (role is null or role in ('property_manager', 'hot_tub_tech', 'host_owner', 'other')),
  drop constraint if exists waitlist_tub_count_check,
  add constraint waitlist_tub_count_check
    check (tub_count is null or (tub_count between 0 and 1000));
