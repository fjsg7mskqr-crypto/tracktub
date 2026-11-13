-- Scope the `photos` bucket's storage policies to the visit a file belongs to.
--
-- Photo paths are `<org_id>/<visit_id>/<phase>/<slot>-<uuid>.jpg`
-- (src/lib/visit-data.ts savePhoto). The earlier policies were bucket-wide:
-- INSERT (20260610120000) let any signed-in user write into any org's folder,
-- and UPDATE/DELETE (20260622120000) + SELECT (20260624120000) would have let
-- any signed-in user overwrite, delete or list any org's evidence. Those last
-- three were never applied to prod, so on prod a retake's cleanup `remove()`
-- was silently refused and left the old file behind.
--
-- Replace all four with policies that follow the visit's tub access:
-- writing (upload, replace, delete) needs capture access to the tub and a
-- visit still in draft, so a finished visit's photos can't change; reading
-- (list, needed by remove()) needs sight of it. Anonymous CDN reads of the
-- public bucket are unaffected.

create or replace function public.app_photo_path_access(p_name text, p_write boolean)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from turnover t
    join property p on p.id = t.property_id
    where (storage.foldername(p_name))[2] ~* '^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$'
      and t.id = ((storage.foldername(p_name))[2])::uuid
      and p.org_id::text = (storage.foldername(p_name))[1]
      and case when p_write then t.status = 'draft' and app_can_capture_property(p.id)
               else app_can_see_property(p.id) end
  );
$$;

revoke execute on function public.app_photo_path_access(text, boolean) from public, anon;
grant execute on function public.app_photo_path_access(text, boolean) to authenticated;

drop policy if exists "Authenticated upload photos" on storage.objects;
drop policy if exists "Authenticated update photos" on storage.objects;
drop policy if exists "Authenticated delete photos" on storage.objects;
drop policy if exists "Authenticated read photos" on storage.objects;

create policy "Visit photos: capture can upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'photos' and public.app_photo_path_access(name, true));

create policy "Visit photos: capture can replace"
on storage.objects for update to authenticated
using (bucket_id = 'photos' and public.app_photo_path_access(name, true))
with check (bucket_id = 'photos' and public.app_photo_path_access(name, true));

create policy "Visit photos: capture can delete"
on storage.objects for delete to authenticated
using (bucket_id = 'photos' and public.app_photo_path_access(name, true));

create policy "Visit photos: viewers can read"
on storage.objects for select to authenticated
using (bucket_id = 'photos' and public.app_photo_path_access(name, false));
