import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { OperationsHeader } from "@/components/OperationsHeader";
import { SuppliesClient, type PropertySupplies } from "./SuppliesClient";

export default async function SuppliesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role === "staff") redirect("/");

  const canEdit = membership.role === "operator";
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, org_id,
       supply(
         id, name, unit, quantity, reorder_at, last_restocked_at, notes, archived_at
       )`
    )
    .order("created_at");

  const groups: PropertySupplies[] = (properties ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    orgId: p.org_id,
    items: (p.supply ?? [])
      .filter((s) => !s.archived_at)
      .map((s) => ({
        id: s.id,
        name: s.name,
        unit: s.unit,
        quantity: s.quantity,
        reorderAt: s.reorder_at,
        lastRestockedAt: s.last_restocked_at,
        notes: s.notes,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <div className="stack">
      <OperationsHeader active="supplies" />
      <SuppliesClient groups={groups} canEdit={canEdit} />
    </div>
  );
}
