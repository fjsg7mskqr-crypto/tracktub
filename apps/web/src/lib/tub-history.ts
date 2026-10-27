// History questions about one tub, answered from its past visits (app rebuild,
// spec §4–5; Lane 5's care-due projection builds on these). Pure: callers load
// the visits and pass `now`, so every rule is unit-testable and an empty
// history answers null / 0, never NaN.

import { inRange, type ReadingField } from "@/lib/readings";
import type { CleaningStepCode } from "@/lib/types";

export type HistoryVisit = {
  /** Visit start (turnover.submitted_at_server). */
  at: Date;
  /** turnover.cleaning_steps */
  cleaningSteps: readonly string[];
  /** The as-found reading; null when the visit has none. */
  found: Partial<Record<ReadingField, number | null>> | null;
};

const DAY_MS = 86_400_000;

function newestFirst(visits: readonly HistoryVisit[]): HistoryVisit[] {
  return [...visits].sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** When the step was last done, or null if no visit did it. */
export function lastStepDate(
  visits: readonly HistoryVisit[],
  code: CleaningStepCode
): Date | null {
  const hit = newestFirst(visits).find((v) => v.cleaningSteps.includes(code));
  return hit ? hit.at : null;
}

/**
 * How many of the most recent visits in a row found this field out of range.
 * A visit without a value for the field stops the count: a streak is never
 * claimed across a reading nobody took.
 */
export function foundStreak(
  visits: readonly HistoryVisit[],
  field: ReadingField
): number {
  let streak = 0;
  for (const v of newestFirst(visits)) {
    if (inRange(field, v.found?.[field] ?? null) !== false) break;
    streak++;
  }
  return streak;
}

/** Whole days elapsed since `d` (≥ 0); null for a missing or invalid date. */
export function daysSince(d: Date | null, now: Date): number | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / DAY_MS));
}
