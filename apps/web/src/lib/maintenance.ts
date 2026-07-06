// Pure, DB-free maintenance due/overdue logic (issue #150). Mirrors the
// testable-without-a-DB shape of lib/chemistry-rules.ts. The page/dashboard
// compute `turnoversSinceDone` (count of locked turnovers after last_done_at)
// and pass it in; this module decides status only.

export type RecurrenceKind = "time" | "turnover";
export type RecurrenceUnit = "day" | "week" | "month";

export interface MaintenanceInput {
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
  lastDoneAt: string | null; // ISO; null = never done
  turnoversSinceDone: number; // locked turnovers since last_done_at (or all if never done)
}

export type MaintenanceState = "ok" | "due_soon" | "overdue";

export interface MaintenanceStatus {
  state: MaintenanceState;
  /** Days overdue (time tasks, state === "overdue"). */
  overdueDays?: number;
  /** Days until due (time tasks, state !== "overdue"). */
  daysLeft?: number;
  /** Turnovers remaining before due (turnover tasks). */
  turnoversLeft?: number;
  /** Turnovers past due (turnover tasks, state === "overdue"). */
  turnoversOver?: number;
}

const MS_PER_DAY = 86_400_000;

export function cycleDays(value: number, unit: RecurrenceUnit): number {
  const perUnit = unit === "week" ? 7 : unit === "month" ? 30 : 1;
  return value * perUnit;
}

export function maintenanceStatus(
  t: MaintenanceInput,
  now: number
): MaintenanceStatus {
  if (t.recurrenceKind === "turnover") {
    const left = t.recurrenceValue - t.turnoversSinceDone;
    if (left <= 0) {
      return { state: "overdue", turnoversOver: -left };
    }
    // "due soon" when 1 turnover remains
    return { state: left <= 1 ? "due_soon" : "ok", turnoversLeft: left };
  }

  // time-based
  const cycle = cycleDays(t.recurrenceValue, t.recurrenceUnit ?? "day");
  // never done → treat as overdue (needs a first completion)
  if (t.lastDoneAt == null) {
    return { state: "overdue", overdueDays: 0 };
  }
  const dueAt = Date.parse(t.lastDoneAt) + cycle * MS_PER_DAY;
  const diffDays = Math.floor((dueAt - now) / MS_PER_DAY);
  if (diffDays < 0) {
    return { state: "overdue", overdueDays: -diffDays };
  }
  // due-soon window: within 20% of the cycle, floored at ≤ 3 days
  const soonWindow = Math.max(3, Math.ceil(cycle * 0.2));
  return {
    state: diffDays <= soonWindow ? "due_soon" : "ok",
    daysLeft: diffDays,
  };
}

/** spill pill tone for a status (brand rule: green = success only). */
export function maintenanceTone(
  state: MaintenanceState
): "ready" | "warn" | "neutral" {
  if (state === "overdue") return "warn";
  if (state === "due_soon") return "neutral";
  return "ready";
}

/** Short human label for a status pill. */
export function maintenanceLabel(s: MaintenanceStatus): string {
  switch (s.state) {
    case "overdue":
      if (s.turnoversOver != null)
        return s.turnoversOver === 0 ? "Due now" : `Overdue · ${s.turnoversOver} over`;
      return s.overdueDays && s.overdueDays > 0 ? `Overdue ${s.overdueDays}d` : "Due now";
    case "due_soon":
      if (s.turnoversLeft != null) return `${s.turnoversLeft} left`;
      return s.daysLeft === 0 ? "Due today" : `Due in ${s.daysLeft}d`;
    case "ok":
      if (s.turnoversLeft != null) return `${s.turnoversLeft} left`;
      return "Up to date";
  }
}
