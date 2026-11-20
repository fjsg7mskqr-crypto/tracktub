import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Photos live in the private `photos` bucket and are only ever shown through
 * signed links. One hour: long enough for a visit or a report read in one
 * sitting (pages are rendered per request, so every load mints fresh links),
 * short enough that a link copied out of the page stops working soon after.
 * Signed links also work while the bucket is still public, so code using this
 * ships safely before the bucket flip.
 */
export const PHOTO_URL_TTL_SECONDS = 60 * 60;

/** Anything with Supabase's storage API: the user's client, or the server-only
 *  service client (public reports). */
type Signer = Pick<SupabaseClient, "storage">;

/** path → signed URL, or null when that photo couldn't be signed (missing
 *  file, no access, outage). Callers show a placeholder for null. */
export type PhotoUrls = ReadonlyMap<string, string | null>;

/** Sign photo paths in ONE storage call (not one per photo). Never throws:
 *  a failure yields null for every path so the page still renders. */
export async function signPhotoUrls(
  client: Signer,
  paths: readonly (string | null | undefined)[]
): Promise<Map<string, string | null>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const urls = new Map<string, string | null>(unique.map((p) => [p, null]));
  if (unique.length === 0) return urls;
  try {
    const { data, error } = await client.storage
      .from("photos")
      .createSignedUrls(unique, PHOTO_URL_TTL_SECONDS);
    if (error) throw error;
    for (const item of data ?? [])
      if (item.path && item.signedUrl && !item.error)
        urls.set(item.path, item.signedUrl);
  } catch (e) {
    Sentry.captureException(e, { tags: { area: "photo-signing" } });
  }
  return urls;
}
