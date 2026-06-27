import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { OperationsHeader } from "@/components/OperationsHeader";
import { MaintenanceClient, type PropertyTasks } from "./MaintenanceClient";
import { maintenanceStatus, type MaintenanceInput } from "@/lib/maintenance";

export default async function MaintenancePage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  // Staff get the capture-only home; this cross-property module is operator/owner
  // like the dashboard. Assigned techs reach maintenance via the property.
  if (membership.role === "staff") redirect("/");

  const canEdit = membership.role === "operator"; // owner/host is read-only
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, org_id,
       maintenance_task(
         id, title, recurrence_kind, recurrence_value, recurrence_unit,
         last_done_at, notes, archived_at
       ),
       turnover(submitted_at_server, status)`
    )
    .order("created_at");

  // eslint-disable-next-line react-hooks/purity -- async RSC; Date.now() is request-scoped on the server
  const now = Date.now();
  const groups: PropertyTasks[] = (properties ?? []).map((p) => {
    const lockedAts = (p.turnover ?? [])
      .filter((t) => t.status === "submitted_locked" && t.submitted_at_server)
      .map((t) => t.submitted_at_server as string);

    const tasks = (p.maintenance_task ?? [])
      .filter((t) => !t.archived_at)
      .map((t) => {
        const turnoversSinceDone = t.last_done_at
          ? lockedAts.filter((at) => at > (t.last_done_at as string)).length
          : lockedAts.length;
        const input: MaintenanceInput = {
          recurrenceKind: t.recurrence_kind,
          recurrenceValue: t.recurrence_value,
          recurrenceUnit: t.recurrence_unit,
          lastDoneAt: t.last_done_at,
          turnoversSinceDone,
        };
        return {
          id: t.id,
          title: t.title,
          recurrenceKind: t.recurrence_kind,
          recurrenceValue: t.recurrence_value,
          recurrenceUnit: t.recurrence_unit,
          notes: t.notes,
          status: maintenanceStatus(input, now),
        };
      });

    return { id: p.id, name: p.name, orgId: p.org_id, tasks };
  });

  return (
    <div className="stack">
      <OperationsHeader active="maintenance" />
      <MaintenanceClient groups={groups} canEdit={canEdit} />
    </div>
  );
}
