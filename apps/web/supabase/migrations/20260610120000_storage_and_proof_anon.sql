-- Storage bucket for turnover photos (public — images are shareable proof).
-- Public bucket: objects readable at /storage/v1/object/public/photos/{path}
-- without RLS. INSERT still requires the policy below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/*'])
on conflict (id) do nothing;

-- Authenticated users can upload photos.
create policy "Authenticated upload photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'photos');

-- Anon role: read a locked turnover by its share_token (no login required).
create policy turnover_public_proof on turnover for select to anon
using (share_token is not null and status = 'submitted_locked');

-- Anon role: read photos of a locked shared turnover.
create policy photo_public_proof on photo for select to anon
using (
  exists (
    select 1 from turnover t
    where t.id = turnover_id
      and t.share_token is not null
      and t.status = 'submitted_locked'
  )
);

-- Anon role: read submitter display name for the proof page.
create policy profile_public_proof on profile for select to anon
using (
  exists (
    select 1 from turnover t
    where t.submitter_id = id
      and t.share_token is not null
      and t.status = 'submitted_locked'
  )
);

-- Anon role: read property name/address for the proof page.
create policy property_public_proof on property for select to anon
using (
  exists (
    select 1 from turnover t
    where t.property_id = id
      and t.share_token is not null
      and t.status = 'submitted_locked'
  )
);
