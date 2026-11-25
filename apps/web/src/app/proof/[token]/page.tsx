import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getURL } from "@/lib/url";
import { RecordView } from "@/components/record/RecordView";
import { OpenBeacon } from "@/components/record/OpenBeacon";
import { signProofPhotos } from "@/lib/proof-photos";
import { DEFAULT_TIME_ZONE } from "@/lib/time";
import { buildRecord, recordTimeZone } from "@/components/record/record-model";
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
// (and must, for the CSP nonce). It does NOT record the open: a server render
// is also what link-preview crawlers and scanners trigger, so <OpenBeacon>
// records it from the browser once a person has loaded the page.
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

  // Anon can't read `client` (no anon policy, on purpose), so the name comes
  // from a token-checked function. Without it the record renders nameless.
  // The report's times are in the zone the visit happened in, not the
  // viewer's (an owner in another state must read the tech's clock). Visits
  // from before the zone was recorded fall back to Detroit.
  const tz = recordTimeZone(row, DEFAULT_TIME_ZONE);
  const visit = buildRecord(row, DEFAULT_TIME_ZONE, await signProofPhotos(row));
  try {
    const { data } = await supabase.rpc("proof_client_name", {
      p_token: token,
    });
    if (data) visit.client = data;
  } catch {
    /* non-critical */
  }

  return (
    <>
      <OpenBeacon token={token} />
      <RecordView
        visit={visit}
        nextDue={await loadNextDue(supabase, row, tubVisits, tz)}
        audience="owner"
        shareUrl={proofUrl(getURL(), token)}
      />
    </>
  );
}
