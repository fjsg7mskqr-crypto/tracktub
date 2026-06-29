import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { OperationsHeader } from "@/components/OperationsHeader";
import { EquipmentClient, type PropertyEquipment } from "./EquipmentClient";

export default async function EquipmentPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role === "staff") redirect("/");

  const canEdit = membership.role === "operator";
  const supabase = await createClient();

  const [{ data: properties }, { data: orgNote }] = await Promise.all([
    supabase
      .from("property")
      .select(
        `id, name, org_id,
         equipment(
           id, type, make_model, installed_at, warranty_until, notes, archived_at
         )`
      )
      .order("created_at"),
    supabase
      .from("org_note")
      .select("body, updated_at")
      .eq("org_id", membership.orgId)
      .maybeSingle(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const groups: PropertyEquipment[] = (properties ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    orgId: p.org_id,
    items: (p.equipment ?? [])
      .filter((e) => !e.archived_at)
      .map((e) => ({
        id: e.id,
        type: e.type,
        makeModel: e.make_model,
        installedAt: e.installed_at,
        warrantyUntil: e.warranty_until,
        notes: e.notes,
      })),
  }));

  return (
    <div className="stack">
      <OperationsHeader active="equipment" />
      <EquipmentClient
        groups={groups}
        canEdit={canEdit}
        orgId={membership.orgId}
        orgNoteBody={orgNote?.body ?? null}
        orgNoteUpdatedAt={orgNote?.updated_at ?? null}
        today={today}
      />
    </div>
  );
}
