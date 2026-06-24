-- The `photos` bucket was created with file_size_limit = 5MB (5242880 bytes),
-- which is too small for a real phone-camera photo. Raise it to 15MB, matching
-- the Server Actions body limit (next.config.mjs experimental.serverActions.
-- bodySizeLimit) so the two caps stay aligned. Original creation used
-- `insert ... on conflict do nothing`, which never updates an existing row —
-- this needs an explicit update.

update storage.buckets
set file_size_limit = 15728640 -- 15 MiB
where id = 'photos';
