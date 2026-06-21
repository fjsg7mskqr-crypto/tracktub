import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ensureDraftTurnoverAction } from "@/lib/actions/turnover";
import CaptureWizard from "./CaptureWizard";

export default async function NewTurnoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turnover?: string }>;
}) {
  const { id: propertyId } = await params;
  const { turnover: resumeTurnoverId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: property } = await supabase
    .from("property")
    .select("id, name")
    .eq("id", propertyId)
    .single();
  if (!property) notFound();

  const { data: canCapture } = await supabase.rpc("app_can_capture_property", {
    p_property: propertyId,
  });
  if (!canCapture) redirect(`/p/${propertyId}`);

  const initialDraft = await ensureDraftTurnoverAction(
    propertyId,
    resumeTurnoverId ?? null
  );

  return (
    <CaptureWizard
      propertyId={property.id}
      propertyName={property.name}
      initialDraft={initialDraft}
      resumeTurnoverId={resumeTurnoverId ?? null}
    />
  );
}
