import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getURL } from "@/lib/url";
import { RecordView } from "@/components/record/RecordView";
import { buildRecord } from "@/components/record/record-model";
import {
  loadRecordByToken,
  loadNextDue,
  proofUrl,
} from "@/components/record/load-record";

export const metadata: Metadata = {
  title: "TrackTub record",
  robots: { index: false, follow: false },
};

// The record, owner view (screen 9): what the share link opens, no login.
// Anon has no table access: the record loads through proof_record(token), the
// client name through proof_client_name(token). Both return data only for the
// exact token of a locked, shared visit. Dynamic: it reads per-request data
// and records the open.
export default async function ProofPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const proof = await loadRecordByToken(supabase, token);
  if (!proof) notFound();
  const { row, tubVisits } = proof;

  // Record the open (Reports' "Opened"). share_view is its own append-only
  // table because turnover_lock_guard rejects updates to a locked turnover.
  // Counting must never break the page the owner came to read.
  try {
    await supabase.rpc("record_share_view", { p_token: token });
  } catch {
    /* non-critical */
  }
  try {
    await supabase.rpc("record_proof_open", { p_share_token: token });
  } catch {
    /* non-critical — legacy proof_event signal */
  }

  // Anon can't read `client` (no anon policy, on purpose), so the name comes
  // from a token-checked function. Without it the record renders nameless.
  const visit = buildRecord(row);
  try {
    const { data } = await supabase.rpc("proof_client_name", {
      p_token: token,
    });
    if (data) visit.client = data;
  } catch {
    /* non-critical */
  }

  return (
    <RecordView
      visit={visit}
      nextDue={await loadNextDue(supabase, row, tubVisits)}
      audience="owner"
      shareUrl={proofUrl(getURL(), token)}
    />
  );
}
