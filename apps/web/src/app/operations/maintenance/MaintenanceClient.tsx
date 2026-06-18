"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Note } from "@/components/ui";
import {
  maintenanceTone,
  maintenanceLabel,
  type MaintenanceStatus,
  type RecurrenceKind,
  type RecurrenceUnit,
} from "@/lib/maintenance";
import {
  createMaintenanceTaskAction,
  markMaintenanceDoneAction,
  archiveMaintenanceTaskAction,
} from "@/lib/actions/maintenance";

export interface TaskRow {
  id: string;
  title: string;
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
  notes: string | null;
  status: MaintenanceStatus;
}
export interface PropertyTasks {
  id: string;
  name: string;
  orgId: string;
  tasks: TaskRow[];
}

const PRESETS: {
  label: string;
  kind: RecurrenceKind;
  value: number;
  unit: RecurrenceUnit | null;
}[] = [
  { label: "Filter clean", kind: "turnover", value: 3, unit: null },
  { label: "Drain & refill", kind: "time", value: 90, unit: "day" },
  { label: "Cover inspection", kind: "time", value: 30, unit: "day" },
];

function recurrenceText(r: {
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
}): string {
  if (r.recurrenceKind === "turnover")
    return `every ${r.recurrenceValue} turnover${r.recurrenceValue === 1 ? "" : "s"}`;
  const u = r.recurrenceUnit ?? "day";
  return `every ${r.recurrenceValue} ${u}${r.recurrenceValue === 1 ? "" : "s"}`;
}

export function MaintenanceClient({
  groups,
  canEdit,
}: {
  groups: PropertyTasks[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function markDone(taskId: string, propertyId: string) {
    setError(null);
    startTransition(async () => {
      const res = await markMaintenanceDoneAction(taskId, propertyId, null);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function archive(taskId: string) {
    startTransition(async () => {
      const res = await archiveMaintenanceTaskAction(taskId);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function addTask(group: PropertyTasks, fd: FormData) {
    fd.append("property_id", group.id);
    fd.append("org_id", group.orgId);
    setError(null);
    startTransition(async () => {
      const res = await createMaintenanceTaskAction(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  if (groups.length === 0) {
    return (
      <Card className="pad">
        <p className="muted">No properties yet.</p>
      </Card>
    );
  }

  return (
    <div className="stack">
      {error && <Note variant="warn">{error}</Note>}
      {groups.map((g) => (
        <div key={g.id} className="stack" style={{ gap: 8 }}>
          <h2 className="small" style={{ margin: 0 }}>
            {g.name}
          </h2>
          {g.tasks.length === 0 ? (
            <Card className="pad">
              <p className="muted small">No maintenance scheduled.</p>
            </Card>
          ) : (
            <div className="dlist">
              {g.tasks.map((t) => (
                <div key={t.id} className="drow2">
                  <div className="nmwrap">
                    <span className="nm">{t.title}</span>
                  </div>
                  <span className="when">{recurrenceText(t)}</span>
                  <div className="badges">
                    <span className={`spill ${maintenanceTone(t.status.state)}`}>
                      {maintenanceLabel(t.status)}
                    </span>
                    {canEdit && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => markDone(t.id, g.id)}
                        >
                          Mark done
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => archive(t.id)}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {canEdit && <AddScheduleForm group={g} onAdd={addTask} pending={isPending} />}
        </div>
      ))}
    </div>
  );
}

function AddScheduleForm({
  group,
  onAdd,
  pending,
}: {
  group: PropertyTasks;
  onAdd: (g: PropertyTasks, fd: FormData) => void;
  pending: boolean;
}) {
  const [kind, setKind] = useState<RecurrenceKind>("time");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("90");
  const [unit, setUnit] = useState<RecurrenceUnit>("day");

  function applyPreset(p: (typeof PRESETS)[number]) {
    setTitle(p.label);
    setKind(p.kind);
    setValue(String(p.value));
    if (p.unit) setUnit(p.unit);
  }

  function submit() {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("recurrence_kind", kind);
    fd.append("recurrence_value", value);
    if (kind === "time") fd.append("recurrence_unit", unit);
    onAdd(group, fd);
    setTitle("");
  }

  return (
    <Card className="pad stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        {PRESETS.map((p) => (
          <Button
            key={p.label}
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => applyPreset(p)}
          >
            + {p.label}
          </Button>
        ))}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="stack" style={{ gap: 4 }}>
          <Label>Task</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Filter clean" />
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <Label>Every</Label>
          <Input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ width: 72 }}
          />
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <Label>Per</Label>
          <Select value={kind} onChange={(e) => setKind(e.target.value as RecurrenceKind)}>
            <option value="time">days/weeks/months</option>
            <option value="turnover">turnovers</option>
          </Select>
        </div>
        {kind === "time" && (
          <div className="stack" style={{ gap: 4 }}>
            <Label>Unit</Label>
            <Select value={unit} onChange={(e) => setUnit(e.target.value as RecurrenceUnit)}>
              <option value="day">days</option>
              <option value="week">weeks</option>
              <option value="month">months</option>
            </Select>
          </div>
        )}
        <Button variant="primary" disabled={pending || !title.trim()} onClick={submit}>
          Add schedule
        </Button>
      </div>
    </Card>
  );
}
