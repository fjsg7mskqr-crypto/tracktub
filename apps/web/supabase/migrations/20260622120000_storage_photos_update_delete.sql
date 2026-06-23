-- Capture v2 (#176) introduced deterministic per-slot storage paths with
-- upsert:true (to support retaking a guided photo) and removeIssuePhotoAction
-- (to delete an issue photo). The original storage policy only granted
-- INSERT on the `photos` bucket, so a retake's implicit UPDATE — or an issue
-- photo's DELETE — was rejected by RLS. Mirrors the existing (bucket-scoped,
-- not path-scoped) INSERT policy's permissiveness; tightening storage RLS to
-- path/ownership scope is a separate follow-up, not bundled into this fix.

create policy "Authenticated update photos"
on storage.objects for update to authenticated
using (bucket_id = 'photos')
with check (bucket_id = 'photos');

create policy "Authenticated delete photos"
on storage.objects for delete to authenticated
using (bucket_id = 'photos');
