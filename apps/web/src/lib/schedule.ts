// Pure merge of persisted scheduled_item rows with computed maintenance
// occurrences for the ops calendar (issue #157, decision: compute-on-read).
// The DB reads live in the calendar loader (#156 part 2); this module only
// decides what the calendar shows, so it stays DB-free and unit-testable.

export type ScheduledKind = "turnover" | "maintenance" | "custom";

export interface PersistedItem {
  id: string;
  kind: ScheduledKind;
  scheduledFor: string; // YYYY-MM-DD
  maintenanceTaskId: string | null;
}

export interface ComputedMaintenance {
  maintenanceTaskId: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
}

export interface CalendarItem {
  id: string | null; // null for a virtual (not-yet-persisted) occurrence
  virtual: boolean;
  kind: ScheduledKind;
  title?: string;
  scheduledFor: string;
  maintenanceTaskId: string | null;
}

/**
 * Returns the calendar's items: every persisted row, plus each computed
 * maintenance occurrence that isn't already covered by a persisted row for the
 * same (maintenanceTaskId, date). Persisted rows win — acting on an occurrence
 * persists it, and the computed twin must then disappear.
 */
export function mergeScheduledWithMaintenance(
  persisted: PersistedItem[],
  computed: ComputedMaintenance[]
): CalendarItem[] {
  const covered = new Set(
    persisted
      .filter((p) => p.maintenanceTaskId != null)
      .map((p) => `${p.maintenanceTaskId}::${p.scheduledFor}`)
  );

  const fromPersisted: CalendarItem[] = persisted.map((p) => ({
    id: p.id,
    virtual: false,
    kind: p.kind,
    scheduledFor: p.scheduledFor,
    maintenanceTaskId: p.maintenanceTaskId,
  }));

  const fromComputed: CalendarItem[] = computed
    .filter((c) => !covered.has(`${c.maintenanceTaskId}::${c.dueDate}`))
    .map((c) => ({
      id: null,
      virtual: true,
      kind: "maintenance" as const,
      title: c.title,
      scheduledFor: c.dueDate,
      maintenanceTaskId: c.maintenanceTaskId,
    }));

  return [...fromPersisted, ...fromComputed];
}
