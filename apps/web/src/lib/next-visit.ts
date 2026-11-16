// "Next visit" (issue #401): a re-check scheduled from a visit's finish step.
// One per tub; shows on the Calendar and Home until the next visit on that tub
// starts. Pure helpers here; the table access is in visit-data.ts / the loader.

import { addDays, dayKey, parseDayKey } from "@/components/calendar/days";

export const NEXT_VISIT_REASON_MAX = 120;

/** A scheduled re-check as the screens use it. */
export type NextVisit = {
  tubId: string;
  /** YYYY-MM-DD, app zone. */
  dueOn: string;
  /** "" when none was given. */
  reason: string;
};

/** Quick picks on the finish step. "date" opens a date input; null = none. */
export const NEXT_VISIT_PICKS = [
  { id: "none", label: "None", days: null },
  { id: "2d", label: "In 2 days", days: 2 },
  { id: "3d", label: "In 3 days", days: 3 },
  { id: "1w", label: "In 1 week", days: 7 },
  { id: "date", label: "Pick a date", days: null },
] as const;

export type NextVisitPickId = (typeof NEXT_VISIT_PICKS)[number]["id"];

/** The day a quick pick lands on, from `now` in the app zone. */
export function pickDate(
  pick: NextVisitPickId,
  now: Date,
  tz?: string
): string | null {
  const p = NEXT_VISIT_PICKS.find((x) => x.id === pick);
  if (!p || p.days === null) return null;
  return addDays(dayKey(now, tz), p.days);
}

/** Which pick a saved date corresponds to (for showing the current choice). */
export function pickFor(
  dueOn: string | null,
  now: Date,
  tz?: string
): NextVisitPickId {
  if (!dueOn) return "none";
  for (const p of NEXT_VISIT_PICKS)
    if (p.days !== null && pickDate(p.id, now, tz) === dueOn) return p.id;
  return "date";
}

export function cleanReason(reason: string | null | undefined): string {
  return (reason ?? "").trim().slice(0, NEXT_VISIT_REASON_MAX);
}

/** A valid future-or-today day key, else null. */
export function validDueOn(
  value: string | null | undefined,
  now: Date,
  tz?: string
): string | null {
  const key = parseDayKey(value);
  if (!key || key < dayKey(now, tz)) return null;
  return key;
}
