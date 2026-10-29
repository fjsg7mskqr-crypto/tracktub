// Care due per tub (spec §3, D28): what the tub's own history suggests is next
// — drain & refill, filter change, and "usually visited by now" from the visit
// cadence. Suggestions, not appointments. Pure: callers pass `now`; a tub with
// no history yields [] (never NaN / Invalid Date).

import {
  careFor,
  careInterval,
  type TubCareInput,
} from "@/components/tub/tub-status";
import type { HistoryVisit } from "@/lib/tub-history";

const DAY_MS = 86_400_000;
/** Gaps used for the visit cadence: the most recent few. */
const CADENCE_GAPS = 5;

export type DueKind = "drain" | "filter" | "visit";

export type DueItem = {
  tubId: string;
  kind: DueKind;
  dueOn: Date;
  /** The interval behind the suggestion, in days. */
  everyDays: number;
  label: string;
};

export const DUE_LABELS: Record<DueKind, string> = {
  drain: "Drain & refill due",
  filter: "Filter change due",
  visit: "Usually visited by now",
};

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Typical whole days between visits: the median of the last few gaps, ignoring
 * same-day revisits. Null until there are at least 3 visits (2 usable gaps).
 */
export function visitCadenceDays(
  visits: readonly HistoryVisit[]
): number | null {
  const times = visits
    .map((v) => v.at.getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const days = (times[i] - times[i - 1]) / DAY_MS;
    if (days >= 1) gaps.push(days);
  }
  if (gaps.length < 2) return null;
  return Math.round(median(gaps.slice(-CADENCE_GAPS)));
}

/** Every care suggestion for one tub, soonest first. */
export function careDue(
  tub: TubCareInput & { id: string },
  visits: readonly HistoryVisit[],
  now: Date
): DueItem[] {
  const items: DueItem[] = [];
  for (const kind of ["drain", "filter"] as const) {
    const care = careFor(tub, visits, kind, now);
    if (care)
      items.push({
        tubId: tub.id,
        kind,
        dueOn: care.dueOn,
        everyDays: careInterval(tub, kind),
        label: DUE_LABELS[kind],
      });
  }

  const cadence = visitCadenceDays(visits);
  const last = Math.max(...visits.map((v) => v.at.getTime()));
  if (cadence !== null && Number.isFinite(last))
    items.push({
      tubId: tub.id,
      kind: "visit",
      dueOn: new Date(last + cadence * DAY_MS),
      everyDays: cadence,
      label: DUE_LABELS.visit,
    });

  return items.sort((a, b) => a.dueOn.getTime() - b.dueOn.getTime());
}
