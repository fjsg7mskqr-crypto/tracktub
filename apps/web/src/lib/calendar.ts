// Pure, DB-free calendar helpers for the Operations Schedule (issue #158).
// Complements lib/schedule.ts (merge) and lib/maintenance.ts (status): this
// module turns recurrence rules into future due-DATES and builds the grid.
// All date math is UTC/string-based so it is deterministic and DST-safe.

import { cycleDays, type RecurrenceKind, type RecurrenceUnit } from "@/lib/maintenance";
import type { ComputedMaintenance } from "@/lib/schedule";

export interface OccurrenceTask {
  maintenanceTaskId: string;
  title: string;
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
  lastDoneAt: string | null; // ISO timestamp or null (never done)
}

const MS_PER_DAY = 86_400_000;

/** Add n days to a YYYY-MM-DD string, returning a YYYY-MM-DD string. */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + n * MS_PER_DAY;
  return new Date(t).toISOString().slice(0, 10);
}

/** Day-of-week for a YYYY-MM-DD (0 = Sunday), UTC-based. */
function dow(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Future due-dates for a maintenance task within [fromDate, fromDate+horizon].
 * Time tasks roll last_done + N·cycle forward. Never-done → a single
 * occurrence at fromDate (overdue today). Turnover tasks have no calendar date
 * and return []. Returns the recurring series across the horizon so the month
 * view shows the cadence; a completion re-arms last_done and collapses it.
 */
export function maintenanceOccurrences(
  task: OccurrenceTask,
  fromDate: string,
  horizonDays: number
): ComputedMaintenance[] {
  if (task.recurrenceKind !== "time") return [];
  const end = addDays(fromDate, horizonDays);
  const out: ComputedMaintenance[] = [];

  if (task.lastDoneAt == null) {
    return [
      { maintenanceTaskId: task.maintenanceTaskId, title: task.title, dueDate: fromDate },
    ];
  }

  const cycle = cycleDays(task.recurrenceValue, task.recurrenceUnit ?? "day");
  if (cycle <= 0) return [];
  let due = addDays(task.lastDoneAt.slice(0, 10), cycle);
  if (due < fromDate) {
    const gapDays =
      Math.ceil((Date.parse(fromDate) - Date.parse(due)) / MS_PER_DAY / cycle) *
      cycle;
    due = addDays(due, gapDays);
  }
  // emit through the horizon (guard against runaway loops)
  for (let i = 0; due <= end && i < 400; i++) {
    out.push({ maintenanceTaskId: task.maintenanceTaskId, title: task.title, dueDate: due });
    due = addDays(due, cycle);
  }
  return out;
}

/** The 7 YYYY-MM-DD dates of the Sunday-start week containing `anchor`. */
export function weekDays(anchor: string): string[] {
  const start = addDays(anchor, -dow(anchor));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** 42 cells (6 weeks) covering the month containing `anchor`, Sunday-start. */
export function monthGrid(anchor: string): { date: string; outside: boolean }[] {
  const [y, m] = anchor.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const start = addDays(first, -dow(first));
  const month = anchor.slice(0, 7);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, outside: date.slice(0, 7) !== month };
  });
}

/** Group anything with a `date` field into a Map keyed by that date. */
export function bucketByDay<T extends { date: string }>(entries: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const e of entries) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return map;
}

/** Next n open (not done/skipped) entries dated today-or-later, ascending. */
export function upcoming<T extends { date: string; status: string }>(
  entries: T[],
  today: string,
  n: number
): T[] {
  return entries
    .filter((e) => e.date >= today && e.status !== "done" && e.status !== "skipped")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, n);
}
