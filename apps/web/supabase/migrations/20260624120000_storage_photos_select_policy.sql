-- Capture v2 saves guided photos with `upsert: true` so a retake overwrites the
-- existing object at the same slot path. Supabase storage implements upsert as
-- `INSERT ... ON CONFLICT DO UPDATE`, and Postgres requires a SELECT policy to
-- read the conflicting row during that operation. The previous storage
-- migration (20260622120000) added INSERT/UPDATE/DELETE but no SELECT, so a
-- first upload at a fresh slot succeeded while any retake failed with
-- "new row violates row-level security policy". The `photos` bucket being
-- public only covers anonymous CDN reads, not this authenticated DB upsert.
--
-- Add the missing SELECT policy so authenticated upserts (retakes) succeed.
create policy "Authenticated read photos"
on storage.objects for select to authenticated
using (bucket_id = 'photos');
