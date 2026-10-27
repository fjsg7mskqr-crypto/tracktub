// "Before you go in" (spec §5.2): four tiles read from the tub's locked visits.
// Pure. Missing data reads "—", never NaN.

import { READING_TARGETS } from "@/lib/readings";
import {
  daysSince,
  foundStreak,
  lastStepDate,
  type HistoryVisit,
} from "@/lib/tub-history";
import {
  DUE_SOON_DAYS,
  careFor,
  careInterval,
  newestVisit,
  type CareKind,
  type TubCareInput,
} from "@/components/tub/tub-status";

export type BriefTile = {
  value: string;
  label: string;
  note: string;
  tone: "due" | "plain";
};

const EMPTY = "—";

function careTile(
  tub: TubCareInput,
  visits: readonly HistoryVisit[],
  kind: CareKind,
  label: string,
  now: Date
): BriefTile {
  const days = daysSince(
    lastStepDate(
      visits,
      kind === "drain" ? "drained_refilled" : "filter_replaced"
    ),
    now
  );
  const care = careFor(tub, visits, kind, now);
  return {
    value: days === null ? EMPTY : `${days}d`,
    label,
    note: `Usually every ${careInterval(tub, kind)}`,
    tone: care && care.inDays <= DUE_SOON_DAYS ? "due" : "plain",
  };
}

function phTile(visits: readonly HistoryVisit[]): BriefTile {
  const { lo, hi } = READING_TARGETS.ph;
  const ph = newestVisit(visits)?.found?.ph ?? null;
  const tile: BriefTile = {
    value: ph === null ? EMPTY : ph.toFixed(1),
    label: "pH on arrival",
    note: `Target ${lo}–${hi}`,
    tone: "plain",
  };
  if (ph === null || (ph >= lo && ph <= hi)) return tile;

  const dir = ph > hi ? "High" : "Low";
  const streak = foundStreak(visits, "ph");
  return {
    ...tile,
    tone: "due",
    note: streak >= 2 ? `${dir} ${streak} visits running` : `${dir} on arrival`,
  };
}

function lastVisitNote(
  sinceVisit: number | null,
  opened: boolean | null
): string {
  if (sinceVisit === null) return "No visits yet";
  if (opened === true) return "Record opened by owner";
  if (opened === false) return "Not opened yet";
  return "Not sent";
}

/**
 * `lastVisitOpened`: whether the owner opened the last visit's record — null
 * when that record was never shared.
 */
export function buildBrief(input: {
  tub: TubCareInput;
  visits: readonly HistoryVisit[];
  lastVisitOpened: boolean | null;
  now: Date;
}): BriefTile[] {
  const { tub, visits, lastVisitOpened, now } = input;
  const sinceVisit = daysSince(newestVisit(visits)?.at ?? null, now);

  return [
    careTile(tub, visits, "drain", "Since drain", now),
    phTile(visits),
    careTile(tub, visits, "filter", "On this filter", now),
    {
      value: sinceVisit === null ? EMPTY : `${sinceVisit}d`,
      label: "Since last visit",
      note: lastVisitNote(sinceVisit, lastVisitOpened),
      tone: "plain",
    },
  ];
}
