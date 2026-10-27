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
// Anon reads work through the *_public_proof RLS policies on a locked,
// shared turnover. Dynamic: it reads per-request data and records the open.
export default async function ProofPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const row = await loadRecordByToken(supabase, token);
  if (!row) notFound();

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

  return (
    <RecordView
      visit={buildRecord(row)}
      nextDue={await loadNextDue(supabase, row)}
      audience="owner"
      shareUrl={proofUrl(getURL(), token)}
    />
  );
}
