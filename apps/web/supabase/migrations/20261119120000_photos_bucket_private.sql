-- Make the `photos` bucket private (issue #44).
--
-- NOT YET APPLIED to the shared Supabase project. Apply only after founder
-- sign-off and AFTER the signed-URL code is live, in this order:
--   1. SUPABASE_SERVICE_ROLE_KEY set in Vercel (Production + Preview), redeploy
--   2. release the code (every photo is shown through a signed link)
--   3. apply this migration
--   4. verify an old /storage/v1/object/public/photos/... URL now fails
--
-- Effect: the public CDN path /object/public/photos/<path> stops serving.
-- Signed links (/object/sign/photos/...) and authenticated reads keep working;
-- storage.objects policies are untouched, and no anon policy is added on
-- purpose (it would let anon list every shared photo).
--
-- ROLLBACK:
--   update storage.buckets set public = true where id = 'photos';

update storage.buckets set public = false where id = 'photos';
