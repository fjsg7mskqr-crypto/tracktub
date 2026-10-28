-- D29 (additive): which properties a login sees.
--
-- A new login sees every property on the account by default; the admin
-- (operator) can narrow it to chosen properties. Operators always see
-- everything regardless of the flag. Nothing reads these columns until
-- 20261028120900 redefines the access helpers, so applying this alone changes
-- no live behaviour.

alter table public.membership
  add column all_properties boolean not null default true;

comment on column public.membership.all_properties is
  'D29: true = this login sees every property in the org; false = only its staff_assignment rows. Ignored for operators.';

-- property_ids is only used when all_properties is false.
alter table public.invite
  add column all_properties boolean not null default true;

comment on column public.invite.all_properties is
  'D29: copied to membership.all_properties on accept; property_ids applies only when false.';
