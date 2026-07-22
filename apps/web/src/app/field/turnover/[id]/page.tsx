import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureDraftTurnoverAction } from "@/lib/actions/turnover";
import { computeInitialStep } from "@/lib/capture-v2";
import CaptureFlow from "./CaptureFlow";

/**
 * Camera-anchored capture host (Task 3, RSC). Loads the draft turnover snapshot,
 * computes the resume step from the photos already stored, and hands the client
 * `CaptureFlow` a fully-resumable starting point. A turnover that is already
 * locked/submitted has nothing left to capture — send the tech to its proof.
 */
export default async function FieldTurnoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: turnoverId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve the turnover's property + status so we can gate and (for drafts)
  // reuse the access-checked draft action, which is keyed on property + user.
  const { data: turnover } = await supabase
    .from("turnover")
    .select("id, property_id, status, property:property(id, name)")
    .eq("id", turnoverId)
    .single();
  if (!turnover) notFound();

  // Already locked/submitted — no capture left; go to the proof/detail record.
  if (turnover.status !== "draft") redirect(`/t/${turnoverId}`);

  const property = Array.isArray(turnover.property)
    ? turnover.property[0]
    : turnover.property;
  const propertyId = turnover.property_id;

  // Loads photos/reading and enforces ownership (draft + submitter_id === user).
  const draft = await ensureDraftTurnoverAction(propertyId, turnoverId);
  const initialStep = computeInitialStep(draft);

  return (
    <CaptureFlow
      key={draft.turnoverId}
      draft={draft}
      initialStep={initialStep}
      propertyId={propertyId}
      propertyName={property?.name ?? "This tub"}
    />
  );
}
