import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { OperationsHeader } from "@/components/OperationsHeader";
import { MaintenanceClient } from "../maintenance/MaintenanceClient";
import { buildMaintenanceGroups } from "@/lib/maintenance-groups";
import { maintenanceOccurrences, type OccurrenceTask } from "@/lib/calendar";
import {
  mergeScheduledWithMaintenance,
  type PersistedItem,
} from "@/lib/schedule";
import { ScheduleClient } from "./ScheduleClient";

export type ScheduleEntry = {
  id: string | null; // null = virtual (unpersisted) maintenance occurrence
  virtual: boolean;
  kind: "turnover" | "maintenance" | "custom";
  title: string;
  date: string; // YYYY-MM-DD
  status: "scheduled" | "done" | "skipped";
  overdue: boolean; // maintenance occurrence dated before today
  propertyId: string;
  propertyName: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  maintenanceTaskId: string | null;
  notes: string | null;
};
export type PropertyLite = { id: string; name: string; orgId: string };
export type MemberLite = { userId: string; name: string };

type ScheduledRow = {
  id: string;
  kind: "turnover" | "maintenance" | "custom";
  title: string;
  scheduled_for: string;
  status: "scheduled" | "done" | "skipped";
  assignee_user_id: string | null;
  maintenance_task_id: string | null;
  notes: string | null;
  property_id: string;
  property: { name: string } | null;
};

type ProfileLite = { full_name: string | null; email: string | null } | null;

function memberName(p: ProfileLite): string {
  if (!p) return "A teammate";
  return p.full_name?.trim() || p.email || "A teammate";
}

export default async function SchedulePage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role === "staff") redirect("/");

  const canEdit = membership.role === "operator";
  const supabase = await createClient();

  const propertySelect = `id, name, org_id,
       maintenance_task(
         id, title, recurrence_kind, recurrence_value, recurrence_unit,
         last_done_at, notes, archived_at
       ),
       turnover(submitted_at_server, status),
       equipment(
         id, type, make_model, installed_at, warranty_until, archived_at
       )`;

  const [{ data: properties }, { data: scheduledRows }, { data: memberships }] =
    await Promise.all([
      supabase.from("property").select(propertySelect).order("created_at"),
      supabase
        .from("scheduled_item")
        .select(
          "id, kind, title, scheduled_for, status, assignee_user_id, maintenance_task_id, notes, property_id, property:property(name)"
        )
        .is("archived_at", null),
      supabase
        .from("membership")
        .select("user_id, role, profile:profile(full_name, email)")
        .eq("org_id", membership.orgId),
    ]);

  // eslint-disable-next-line react-hooks/purity -- async RSC; Date.now() is request-scoped on the server
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  const propertyList = properties ?? [];
  const rows = (scheduledRows ?? []) as ScheduledRow[];

  const propertiesLite: PropertyLite[] = propertyList.map((p) => ({
    id: p.id,
    name: p.name,
    orgId: p.org_id,
  }));

  const assigneeNames = new Map<string, string>();
  for (const m of memberships ?? []) {
    if (m.role === "owner") continue;
    assigneeNames.set(m.user_id, memberName(m.profile as ProfileLite));
  }

  const members: MemberLite[] = (memberships ?? [])
    .filter((m) => m.role === "operator" || m.role === "staff")
    .map((m) => ({
      userId: m.user_id,
      name: memberName(m.profile as ProfileLite),
    }));

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const rowsByProperty = new Map<string, ScheduledRow[]>();
  for (const r of rows) {
    const list = rowsByProperty.get(r.property_id);
    if (list) list.push(r);
    else rowsByProperty.set(r.property_id, [r]);
  }

  const entries: ScheduleEntry[] = [];

  for (const p of propertyList) {
    const persistedForProp: PersistedItem[] = (rowsByProperty.get(p.id) ?? []).map(
      (r) => ({
        id: r.id,
        kind: r.kind,
        scheduledFor: r.scheduled_for,
        maintenanceTaskId: r.maintenance_task_id,
      })
    );

    const computed = (p.maintenance_task ?? [])
      .filter((t) => !t.archived_at)
      .flatMap((t) => {
        const task: OccurrenceTask = {
          maintenanceTaskId: t.id,
          title: t.title,
          recurrenceKind: t.recurrence_kind,
          recurrenceValue: t.recurrence_value,
          recurrenceUnit: t.recurrence_unit,
          lastDoneAt: t.last_done_at,
        };
        return maintenanceOccurrences(task, today, 62);
      });

    const merged = mergeScheduledWithMaintenance(persistedForProp, computed);

    for (const item of merged) {
      if (item.id) {
        const row = rowById.get(item.id);
        if (!row) continue;
        const date = item.scheduledFor;
        entries.push({
          id: row.id,
          virtual: false,
          kind: row.kind,
          title: row.title,
          date,
          status: row.status,
          overdue:
            row.kind === "maintenance" &&
            row.status === "scheduled" &&
            date < today,
          propertyId: p.id,
          propertyName: p.name,
          assigneeUserId: row.assignee_user_id,
          assigneeName: row.assignee_user_id
            ? (assigneeNames.get(row.assignee_user_id) ?? null)
            : null,
          maintenanceTaskId: row.maintenance_task_id,
          notes: row.notes,
        });
      } else {
        const date = item.scheduledFor;
        entries.push({
          id: null,
          virtual: true,
          kind: "maintenance",
          title: item.title ?? "Maintenance",
          date,
          status: "scheduled",
          overdue: date < today,
          propertyId: p.id,
          propertyName: p.name,
          assigneeUserId: null,
          assigneeName: null,
          maintenanceTaskId: item.maintenanceTaskId,
          notes: null,
        });
      }
    }
  }

  const groups = buildMaintenanceGroups(propertyList, now);

  return (
    <div className="stack">
      <OperationsHeader active="schedule" />
      <ScheduleClient
        entries={entries}
        properties={propertiesLite}
        members={members}
        canEdit={canEdit}
        today={today}
      />
      <details className="card pad">
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>
          Recurrence rules
        </summary>
        <div style={{ marginTop: 16 }}>
          <MaintenanceClient groups={groups} canEdit={canEdit} today={today} />
        </div>
      </details>
    </div>
  );
}
