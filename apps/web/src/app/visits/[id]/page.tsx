import { notFound, redirect } from "next/navigation";
import { recordPath } from "@/lib/app-routes";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadVisitSnapshot } from "@/lib/visit-data";
import { VisitScreen } from "@/components/visit/VisitScreen";

// Screen 6. Read-only on GET: the draft already exists (startVisit made it).
// Dynamic — reads the session cookie, so it renders per request with the CSP
// nonce.
export default async function VisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  const { id } = await params;

  const db = await createClient();
  const snapshot = await loadVisitSnapshot(db, id).catch(() => null);
  if (!snapshot) notFound();
  // A locked visit can't be edited; show its record instead.
  if (snapshot.status !== "draft") redirect(recordPath(id));

  return <VisitScreen initial={snapshot} />;
}
