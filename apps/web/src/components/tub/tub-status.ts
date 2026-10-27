// Tubs-list status for one tub (spec §4): the dot, the next care item and the
// one-line summary. Pure — the page loads visits and passes `now`.

import {
  CARE_DEFAULTS,
  READING_FIELDS,
  READING_TARGETS,
  inRange,
  type ReadingField,
} from "@/lib/readings";
import { lastStepDate, daysSince, type HistoryVisit } from "@/lib/tub-history";

const DAY_MS = 86_400_000;

/** Care due within this many days counts as needing attention (matches Home). */
export const DUE_SOON_DAYS = 7;

/** Reading labels as the operator says them (mockup chips). */
export const READING_NAMES: Record<ReadingField, string> = {
  total_alkalinity: "Alk",
  ph: "pH",
  calcium_hardness: "Hard",
  sanitizer_ppm: "Cl",
};

export type CareKind = "drain" | "filter";
/** inDays < 0 means overdue. */
export type NextCare = { kind: CareKind; dueOn: Date; inDays: number };
export type TubStatus = "attention" | "balanced" | "none";
export type TubCareInput = {
  drainIntervalDays: number | null;
  filterIntervalDays: number | null;
};

export function careInterval(tub: TubCareInput, kind: CareKind): number {
  return kind === "drain"
    ? (tub.drainIntervalDays ?? CARE_DEFAULTS.drainDays)
    : (tub.filterIntervalDays ?? CARE_DEFAULTS.filterDays);
}

/** The single care item for one kind, or null when the step was never logged. */
export function careFor(
  tub: TubCareInput,
  visits: readonly HistoryVisit[],
  kind: CareKind,
  now: Date
): NextCare | null {
  const last = lastStepDate(
    visits,
    kind === "drain" ? "drained_refilled" : "filter_replaced"
  );
  if (!last) return null;
  const dueOn = new Date(last.getTime() + careInterval(tub, kind) * DAY_MS);
  const inDays = Math.floor((dueOn.getTime() - now.getTime()) / DAY_MS);
  return { kind, dueOn, inDays };
}

/** The earliest drain / filter item; null when neither has any history. */
export function nextCare(
  tub: TubCareInput,
  visits: readonly HistoryVisit[],
  now: Date
): NextCare | null {
  const items = (["drain", "filter"] as const)
    .map((k) => careFor(tub, visits, k, now))
    .filter((c): c is NextCare => c !== null);
  return items.reduce<NextCare | null>(
    (a, b) => (!a || b.dueOn < a.dueOn ? b : a),
    null
  );
}

export function newestVisit(
  visits: readonly HistoryVisit[]
): HistoryVisit | null {
  return visits.reduce<HistoryVisit | null>(
    (a, v) => (!a || v.at > a.at ? v : a),
    null
  );
}

/** First out-of-range field (buffer order) on a reading, with its direction. */
export function firstOutOfRange(
  found: HistoryVisit["found"]
): { field: ReadingField; value: number; dir: "high" | "low" } | null {
  if (!found) return null;
  for (const field of READING_FIELDS) {
    const value = found[field] ?? null;
    if (value !== null && inRange(field, value) === false) {
      return {
        field,
        value,
        dir: value > READING_TARGETS[field].hi ? "high" : "low",
      };
    }
  }
  return null;
}

function hasReading(found: HistoryVisit["found"]): boolean {
  return !!found && READING_FIELDS.some((f) => (found[f] ?? null) !== null);
}

export function tubStatus(
  tub: TubCareInput,
  visits: readonly HistoryVisit[],
  now: Date
): TubStatus {
  const care = nextCare(tub, visits, now);
  if (care && care.inDays <= DUE_SOON_DAYS) return "attention";
  const last = newestVisit(visits);
  if (!last) return "none";
  if (firstOutOfRange(last.found)) return "attention";
  return hasReading(last.found) ? "balanced" : "none";
}

export function careText(care: NextCare): string {
  if (care.inDays < 0) return `${care.kind} overdue ${-care.inDays}d`;
  if (care.inDays === 0) return `${care.kind} due today`;
  return `${care.kind} due in ${care.inDays}`;
}

export function tubSubline(
  tub: TubCareInput,
  visits: readonly HistoryVisit[],
  now: Date
): string {
  const last = newestVisit(visits);
  const days = daysSince(last?.at ?? null, now);
  if (!last || days === null) return "No visits yet";

  const parts = [
    days === 0
      ? "Visited today"
      : `${days} ${days === 1 ? "day" : "days"} since visit`,
  ];
  const care = nextCare(tub, visits, now);
  const off = firstOutOfRange(last.found);
  if (care && care.inDays <= DUE_SOON_DAYS) parts.push(careText(care));
  else if (off) parts.push(`${READING_NAMES[off.field]} ${off.dir}`);
  else if (hasReading(last.found)) parts.push("balanced");
  return parts.join(" · ");
}

export type ListTub = {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
};

export const NO_CLIENT = "No client";

/** Tubs grouped under their client, clients A→Z with "No client" last. */
export function groupTubsByClient<T extends ListTub>(
  tubs: readonly T[]
): { clientName: string; tubs: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const t of tubs) {
    const key = t.clientName ?? NO_CLIENT;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) =>
      a === NO_CLIENT ? 1 : b === NO_CLIENT ? -1 : a.localeCompare(b)
    )
    .map(([clientName, list]) => ({
      clientName,
      tubs: list.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
