// Home as data (2026-11-04 status-board design): today's route, the focus
// card, the worst-first status board and its care rings. Pure: callers load
// the rows and pass `now`, so every rule is unit-tested (tests/home).

import { careDue } from "@/lib/care-due";
import { READING_FIELDS, READING_TARGETS } from "@/lib/readings";
import { APP_TIME_ZONE, formatShortDate, formatTime } from "@/lib/time";
import { readingLogged, type PhotoKind } from "@/lib/visit";
import {
  DUE_SOON_DAYS,
  READING_NAMES,
  careFor,
  careInterval,
  firstOutOfRange,
  newestVisit,
} from "@/components/tub/tub-status";
import type {
  CareTub,
  LoggedVisit,
} from "@/components/calendar/calendar-model";
import { dayKey, dayParts, daysBetween } from "@/components/calendar/days";
import { itemsChip, type OpenItem, type Reading } from "./open-items";

export type HomeTub = CareTub & { clientName: string | null };

/** The last visit's record, as the host sees it. */
export type ReportState = "not_sent" | "sent" | "opened";

export type HomeVisit = LoggedVisit & {
  /** The as-left reading; null when none was logged. */
  left: Reading;
  ownerFlag: string | null;
  report: ReportState;
};

/** An open (draft) visit, with what it has so far. */
export type HomeDraft = {
  id: string;
  tubId: string;
  openedAt: Date;
  photoKinds: PhotoKind[];
  foundLogged: boolean;
  leftLogged: boolean;
  /** Work chips ticked plus products added. */
  workCount: number;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function byTime(visits: readonly HomeVisit[]): HomeVisit[] {
  return visits
    .filter((v) => !Number.isNaN(v.at.getTime()))
    .sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** How the tub was last left: the as-left reading, else the as-found one. */
export function lastReading(visits: readonly HomeVisit[]): Reading {
  const v = byTime(visits)[0];
  if (!v) return null;
  return readingLogged(asValues(v.left)) ? v.left : v.found;
}

function asValues(r: Reading) {
  if (!r) return null;
  return Object.fromEntries(
    READING_FIELDS.map((f) => [f, r[f] ?? null])
  ) as Record<(typeof READING_FIELDS)[number], number | null>;
}

// ── Care ring ────────────────────────────────────────────────────────────────

export type Ring = {
  tone: "blue" | "amber" | "red" | "none";
  /** Days to the next drain (negative = overdue); null when never drained. */
  days: number | null;
  /** How full the ring is: 1 just drained → 0 at the drain. */
  fraction: number;
  label: string;
};

/** The care ring: empties toward the next drain & refill. */
export function ringState(
  tub: HomeTub | CareTub,
  visits: readonly HomeVisit[],
  now: Date
): Ring {
  const care = careFor(tub, visits, "drain", now);
  if (!care)
    return {
      tone: "none",
      days: null,
      fraction: 0,
      label: "No drain logged yet",
    };
  const days = care.inDays;
  const every = careInterval(tub, "drain");
  return {
    tone: days < 0 ? "red" : days <= DUE_SOON_DAYS ? "amber" : "blue",
    days,
    fraction: Math.min(1, Math.max(0, days / every)),
    label:
      days < 0
        ? `Drain ${plural(-days, "day")} overdue`
        : days === 0
          ? "Drain due today"
          : `Drain in ${plural(days, "day")}`,
  };
}

/** "Drain in 34 days · filter in 12"; null when neither was ever logged. */
export function careCountdown(
  tub: HomeTub | CareTub,
  visits: readonly HomeVisit[],
  now: Date
): string | null {
  const parts: string[] = [];
  for (const kind of ["drain", "filter"] as const) {
    const c = careFor(tub, visits, kind, now);
    if (!c) continue;
    const first = parts.length === 0;
    const name = first ? kind[0].toUpperCase() + kind.slice(1) : kind;
    const n = Math.abs(c.inDays);
    parts.push(
      c.inDays < 0
        ? first
          ? `${name} ${plural(n, "day")} overdue`
          : `${name} overdue`
        : c.inDays === 0
          ? `${name} due today`
          : first
            ? `${name} in ${plural(n, "day")}`
            : `${name} in ${n}`
    );
  }
  return parts.length ? parts.join(" · ") : null;
}

// ── Problems ─────────────────────────────────────────────────────────────────

export type Problem = {
  kind: "reading" | "flag" | "overdue";
  /** Tile chip: "pH 7.9", "Owner flagged", "Drain overdue". */
  chip: string;
  /** Focus-card chip, with the visit's weekday when it wasn't today. */
  chipWithDay: string;
};

/** The tub's problem, if any: last reading out of range, an owner flag, or a
 *  drain / filter overdue. */
export function tubProblem(
  tub: HomeTub | CareTub,
  visits: readonly HomeVisit[],
  now: Date,
  tz: string = APP_TIME_ZONE
): Problem | null {
  const last = byTime(visits)[0];
  if (last) {
    const off = firstOutOfRange(lastReading([last]));
    if (off) {
      const chip = `${READING_NAMES[off.field]} ${off.value.toFixed(READING_TARGETS[off.field].decimals)}`;
      const day = dayKey(last.at, tz);
      return {
        kind: "reading",
        chip,
        chipWithDay:
          day === dayKey(now, tz)
            ? chip
            : // Within the week a weekday reads naturally; older, the date.
              `${chip} ${daysBetween(day, dayKey(now, tz)) < 7 ? dayParts(day).dow : formatShortDate(last.at, tz)}`,
      };
    }
    if (last.ownerFlag?.trim())
      return {
        kind: "flag",
        chip: "Owner flagged",
        chipWithDay: "Owner flagged",
      };
  }
  for (const kind of ["drain", "filter"] as const) {
    const c = careFor(tub, visits, kind, now);
    if (c && c.inDays < 0) {
      const chip = `${kind === "drain" ? "Drain" : "Filter"} overdue`;
      return { kind: "overdue", chip, chipWithDay: chip };
    }
  }
  return null;
}

// ── Status board ─────────────────────────────────────────────────────────────

export type BoardRank = "problem" | "open" | "due" | "calm";
const RANK: Record<BoardRank, number> = {
  problem: 0,
  open: 1,
  due: 2,
  calm: 3,
};

export type Chip = { text: string; tone: "alert" | "due" | "ok" | "muted" };

export type BoardEntry = {
  tubId: string;
  name: string;
  state: BoardRank;
  chip: Chip;
  problem: Problem | null;
  /** Soonest care suggestion (drain, filter, usual visit); null if none. */
  soonest: Date | null;
};

/** Care due soon (drain / filter within DUE_SOON_DAYS, or the usual visit
 *  due by today): the chip text, or null. */
function dueSoon(
  tub: HomeTub | CareTub,
  visits: readonly HomeVisit[],
  now: Date
): string | null {
  for (const kind of ["drain", "filter"] as const) {
    const c = careFor(tub, visits, kind, now);
    if (c && c.inDays >= 0 && c.inDays <= DUE_SOON_DAYS) {
      const name = kind === "drain" ? "Drain" : "Filter";
      return c.inDays === 0 ? `${name} due` : `${name} in ${c.inDays}d`;
    }
  }
  const visit = careDue({ ...tub, id: "" }, visits, now).find(
    (d) => d.kind === "visit"
  );
  return visit && visit.dueOn.getTime() <= now.getTime() ? "Visit due" : null;
}

function calmChip(visits: readonly HomeVisit[]): Chip {
  if (!newestVisit(visits)) return { text: "No visits yet", tone: "muted" };
  const r = asValues(lastReading(visits));
  // Green only for a verified all-clear: every value logged and in range.
  if (r && READING_FIELDS.every((f) => r[f] !== null) && !firstOutOfRange(r))
    return { text: "Balanced", tone: "ok" };
  return { text: "No reading", tone: "muted" };
}

export function boardState(
  tub: HomeTub | CareTub,
  visits: readonly HomeVisit[],
  items: readonly OpenItem[],
  now: Date,
  tz: string = APP_TIME_ZONE
): BoardEntry {
  const problem = tubProblem(tub, visits, now, tz);
  const open = itemsChip(items);
  const due = dueSoon(tub, visits, now);
  const soon = careDue({ ...tub, id: tub.id }, visits, now)[0]?.dueOn ?? null;
  const base = { tubId: tub.id, name: tub.name, problem, soonest: soon };
  if (problem)
    return {
      ...base,
      state: "problem",
      chip: { text: problem.chip, tone: "alert" },
    };
  if (open)
    return { ...base, state: "open", chip: { text: open, tone: "due" } };
  if (due) return { ...base, state: "due", chip: { text: due, tone: "due" } };
  return { ...base, state: "calm", chip: calmChip(visits) };
}

/** Worst first: problem → open items → care due soon → calm; then soonest
 *  care (none last), then name. */
export function boardOrder<T extends BoardEntry>(entries: readonly T[]): T[] {
  const t = (d: Date | null) => d?.getTime() ?? Number.POSITIVE_INFINITY;
  return [...entries].sort(
    (a, b) =>
      RANK[a.state] - RANK[b.state] ||
      t(a.soonest) - t(b.soonest) ||
      a.name.localeCompare(b.name)
  );
}

// ── Today's route ────────────────────────────────────────────────────────────

export type RouteStop = {
  tubId: string;
  name: string;
  state: "done" | "current" | "todo";
  /** Under the dot: "done 10:42 AM", "in progress", "up next", "pH 7.9". */
  label: string;
  /** A problem waiting at this tub (red ring). */
  problem: boolean;
  /** The open draft on this tub, if any. */
  draftId: string | null;
  /** Locked visit today, for a done stop. */
  doneVisitId: string | null;
  /** Added to today by hand (removable). */
  added: boolean;
};

/**
 * Today's stops (approved default): tubs visited today or with a draft open,
 * tubs whose care is due or overdue today, and tubs added by hand. Order: done
 * (by time) → in progress (newest draft current) → problem → overdue → due →
 * added; then name. No clock times — the app has no bookings.
 */
export function todaysRoute(input: {
  tubs: readonly (HomeTub | CareTub)[];
  visits: readonly HomeVisit[];
  drafts: readonly HomeDraft[];
  added: readonly string[];
  now: Date;
  tz?: string;
}): RouteStop[] {
  const { tubs, visits, drafts, added, now, tz = APP_TIME_ZONE } = input;
  const today = dayKey(now, tz);
  const draftOf = new Map<string, HomeDraft>();
  for (const d of [...drafts].sort(
    (a, b) => b.openedAt.getTime() - a.openedAt.getTime()
  ))
    if (!draftOf.has(d.tubId)) draftOf.set(d.tubId, d);

  type Row = RouteStop & { group: number; sortKey: number };
  const rows: Row[] = [];
  for (const tub of tubs) {
    const own = visits.filter((v) => v.tubId === tub.id);
    const draft = draftOf.get(tub.id) ?? null;
    const doneToday = byTime(own).find((v) => dayKey(v.at, tz) === today);
    const problem = tubProblem(tub, own, now, tz);
    const due = careDue({ ...tub, id: tub.id }, own, now).filter(
      (d) => daysBetween(dayKey(d.dueOn, tz), today) >= 0
    );
    const isAdded = added.includes(tub.id);
    if (!draft && !doneToday && due.length === 0 && !isAdded) continue;

    const stop = {
      tubId: tub.id,
      name: tub.name,
      problem: problem !== null,
      draftId: draft?.id ?? null,
      doneVisitId: doneToday?.id ?? null,
      added: isAdded,
    };
    if (draft) {
      rows.push({
        ...stop,
        state: "todo",
        label: "in progress",
        group: 1,
        sortKey: -draft.openedAt.getTime(),
      });
    } else if (doneToday) {
      rows.push({
        ...stop,
        state: "done",
        label: `done ${formatTime(doneToday.at, tz)}`,
        group: 0,
        sortKey: doneToday.at.getTime(),
      });
    } else {
      const overdue = due.some(
        (d) => daysBetween(dayKey(d.dueOn, tz), today) > 0
      );
      const urgency = problem ? 0 : overdue ? 1 : due.length ? 2 : 3;
      rows.push({
        ...stop,
        state: "todo",
        label: problem
          ? problem.chip
          : due.length
            ? `${due[0].kind} ${overdue ? "overdue" : "due"}`
            : "added",
        group: 2 + urgency,
        sortKey: 0,
      });
    }
  }
  rows.sort(
    (a, b) =>
      a.group - b.group || a.sortKey - b.sortKey || a.name.localeCompare(b.name)
  );

  const current =
    rows.find((r) => r.group === 1) ?? rows.find((r) => r.state !== "done");
  if (current) {
    current.state = "current";
    if (!current.draftId) current.label = "up next";
  }
  return rows.map(({ group: _g, sortKey: _s, ...stop }) => stop);
}

export type Focus = {
  kind: "working" | "next";
  tubId: string;
  draftId: string | null;
} | null;

/** Working on (the current stop has a draft), Up next (first not-done stop),
 *  or hidden (no route, or every stop done). */
export function focusCard(route: readonly RouteStop[]): Focus {
  const cur = route.find((s) => s.state === "current");
  if (!cur) return null;
  return cur.draftId
    ? { kind: "working", tubId: cur.tubId, draftId: cur.draftId }
    : { kind: "next", tubId: cur.tubId, draftId: null };
}

// ── Visit progress ───────────────────────────────────────────────────────────

export type ProgressStep = {
  key: "before" | "readings" | "work" | "after";
  label: string;
  done: boolean;
};

/** The Working-on card's four steps: Before photo · Readings · Work · After
 *  (after + cover photos). */
export function visitProgress(d: HomeDraft): {
  steps: ProgressStep[];
  done: number;
} {
  const has = (k: PhotoKind) => d.photoKinds.includes(k);
  const steps: ProgressStep[] = [
    { key: "before", label: "Before", done: has("before") },
    { key: "readings", label: "Readings", done: d.foundLogged || d.leftLogged },
    { key: "work", label: "Work", done: d.workCount > 0 },
    { key: "after", label: "After", done: has("after") && has("cover") },
  ];
  return { steps, done: steps.filter((s) => s.done).length };
}
