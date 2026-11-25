import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getURL } from "@/lib/url";
import { getTimeZone } from "@/lib/time-zone";
import { RecordView } from "@/components/record/RecordView";
import { signPhotoUrls } from "@/lib/supabase/storage";
import {
  buildRecord,
  recordPhotoPaths,
  recordTimeZone,
} from "@/components/record/record-model";
import {
  loadRecordById,
  loadNextDue,
  proofUrl,
} from "@/components/record/load-record";

// The record, operator view (screen 9). Stays dynamic: getCurrentMembership()
// reads the session cookie, so the page renders per request with the CSP nonce.
export default async function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [membership, row] = await Promise.all([
    getCurrentMembership(),
    loadRecordById(supabase, id),
  ]);
  if (!membership) redirect("/login");
  if (!row) notFound();
  // The zone the visit happened in; the device's for visits that predate it.
  const deviceTz = await getTimeZone();

  return (
    <RecordView
      visit={buildRecord(
        row,
        deviceTz,
        await signPhotoUrls(supabase, recordPhotoPaths(row))
      )}
      nextDue={await loadNextDue(
        supabase,
        row,
        undefined,
        recordTimeZone(row, deviceTz)
      )}
      audience="operator"
      shareUrl={row.share_token ? proofUrl(getURL(), row.share_token) : null}
    />
  );
}
