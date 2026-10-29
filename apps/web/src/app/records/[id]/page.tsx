import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getURL } from "@/lib/url";
import { RecordView } from "@/components/record/RecordView";
import { buildRecord } from "@/components/record/record-model";
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
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const { id } = await params;
  const supabase = await createClient();
  const row = await loadRecordById(supabase, id);
  if (!row) notFound();

  return (
    <RecordView
      visit={buildRecord(row)}
      nextDue={await loadNextDue(supabase, row)}
      audience="operator"
      shareUrl={row.share_token ? proofUrl(getURL(), row.share_token) : null}
    />
  );
}
