import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/service";
import { signPhotoUrls, type PhotoUrls } from "@/lib/supabase/storage";
import type { RecordRow } from "@/components/record/record-model";

let warnedMissingKey = false;

/** A path we'd ever sign: relative, no traversal. */
const safe = (p: string) => !p.startsWith("/") && !p.split("/").includes("..");

/**
 * Signed links for a public report's photos. The ONLY paths it signs are the
 * ones in `row`, which must be the visit proof_record(token) just returned for
 * the viewer's exact token. It takes no other path input on purpose.
 *
 * Without the service key every photo comes back null (placeholder) and we
 * tell Sentry once per process.
 */
export async function signProofPhotos(row: RecordRow): Promise<PhotoUrls> {
  const paths = row.photos
    .map((p) => p.storage_path)
    .filter((p): p is string => !!p && safe(p));
  const service = createServiceClient();
  if (!service) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      Sentry.captureMessage(
        "SUPABASE_SERVICE_ROLE_KEY is not set: shared report photos show as unavailable",
        { level: "error" }
      );
    }
    return new Map(paths.map((p) => [p, null]));
  }
  return signPhotoUrls(service, paths);
}
