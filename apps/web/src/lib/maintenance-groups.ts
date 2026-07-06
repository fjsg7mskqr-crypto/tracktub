import { maintenanceStatus, type MaintenanceInput } from "@/lib/maintenance";
import type { PropertyTasks } from "@/app/operations/maintenance/MaintenanceClient";

type PropertyRow = {
  id: string;
  name: string;
  org_id: string;
  maintenance_task: {
    id: string;
    title: string;
    recurrence_kind: MaintenanceInput["recurrenceKind"];
    recurrence_value: number;
    recurrence_unit: MaintenanceInput["recurrenceUnit"];
    last_done_at: string | null;
    notes: string | null;
    archived_at: string | null;
  }[] | null;
  turnover: { submitted_at_server: string | null; status: string }[] | null;
  equipment: {
    id: string;
    type: string;
    make_model: string | null;
    installed_at: string | null;
    warranty_until: string | null;
    archived_at: string | null;
  }[] | null;
};

/** Build PropertyTasks groups for the maintenance rules section. */
export function buildMaintenanceGroups(
  properties: PropertyRow[] | null,
  now: number
): PropertyTasks[] {
  return (properties ?? []).map((p) => {
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

    return {
      id: p.id,
      name: p.name,
      orgId: p.org_id,
      tasks,
      equipment: (p.equipment ?? [])
        .filter((e) => !e.archived_at)
        .map((e) => ({
          id: e.id,
          type: e.type,
          makeModel: e.make_model,
          installedAt: e.installed_at,
          warrantyUntil: e.warranty_until,
        })),
    };
  });
}
