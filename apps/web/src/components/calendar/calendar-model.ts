// Home + Calendar as data (spec §2–3, D28): visits logged and care due, by day
// in the app zone. Nothing else — no bookings, guest times or assigning.
// Pure: callers pass `now`.

import { careDue, type DueItem } from "@/lib/care-due";
import { READING_FIELDS, READING_TARGETS } from "@/lib/readings";
import { formatTime, APP_TIME_ZONE } from "@/lib/time";
import { foundStreak, type HistoryVisit } from "@/lib/tub-history";
import { recordPath, tubPath } from "@/lib/app-routes";
import { DUE_SOON_DAYS, type TubCareInput } from "@/components/tub/tub-status";
import { addDays, dayKey, dayParts, daysBetween, weekStart } from "./days";

export type CareTub = TubCareInput & { id: string; name: string };
export type LoggedVisit = HistoryVisit & {
  id: string;
  tubId: string;
  /** The record's share link exists. */
  sent: boolean;
};

export type CalItem = {
  id: string;
  kind: "logged" | "due";
  tubId: string;
  tubName: string;
  href: string;
  /** Calendar line: "Visit logged 9:52 AM · record sent". */
  what: string;
  /** Home's Today line: "Logged 9:52 AM · sent", "Drain due". */
  short: string;
  /** Logged and sent — the one success state (green). */
  sent: boolean;
};

const SHORT: Record<DueItem["kind"], string> = {
  drain: "Drain due",
  filter: "Filter change due",
  visit: "Usually visited by now",
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function byTub<T extends { tubId: string }>(
  xs: readonly T[]
): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(x.tubId, [...(m.get(x.tubId) ?? []), x]);
  return m;
}

/**
 * Every item by day key. Care that is already overdue sits on today (worded
 * as overdue) so it never hides in a past week.
 */
export function calendarItems(
  tubs: readonly CareTub[],
  visits: readonly LoggedVisit[],
  now: Date,
  tz: string = APP_TIME_ZONE
): Map<string, CalItem[]> {
  const today = dayKey(now, tz);
  const names = new Map(tubs.map((t) => [t.id, t.name]));
  const out = new Map<string, CalItem[]>();
  const put = (key: string, item: CalItem) =>
    out.set(key, [...(out.get(key) ?? []), item]);

  for (const v of [...visits].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const name = names.get(v.tubId);
    if (!name || Number.isNaN(v.at.getTime())) continue;
    const time = formatTime(v.at, tz);
    put(dayKey(v.at, tz), {
      id: `v-${v.id}`,
      kind: "logged",
      tubId: v.tubId,
      tubName: name,
      href: recordPath(v.id),
      what: `Visit logged ${time}${v.sent ? " · record sent" : ""}`,
      short: `Logged ${time}${v.sent ? " · sent" : ""}`,
      sent: v.sent,
    });
  }

  const history = byTub(visits);
  for (const t of tubs) {
    for (const d of careDue(t, history.get(t.id) ?? [], now)) {
      const due = dayKey(d.dueOn, tz);
      const over = daysBetween(due, today);
      const every = `every ~${plural(d.everyDays, "day")}`;
      put(over > 0 ? today : due, {
        id: `d-${t.id}-${d.kind}`,
        kind: "due",
        tubId: t.id,
        tubName: t.name,
        href: tubPath(t.id),
        what:
          over > 0
            ? `${d.label} (${every}) · ${plural(over, "day")} over`
            : `${d.label} (${every})`,
        short: SHORT[d.kind],
        sent: false,
      });
    }
  }
  return out;
}

export type AttentionItem = {
  id: string;
  tubId: string;
  title: string;
  detail: string;
  /** "due": now, overdue or drifting (amber); "upcoming": later this week. */
  tone: "due" | "upcoming";
  /** Lower is worse. */
  severity: number;
};

function fmt(field: (typeof READING_FIELDS)[number], v: number): string {
  return v.toFixed(READING_TARGETS[field].decimals);
}

/**
 * Needs attention (spec §2): care due within a week, or a reading found out of
 * range two or more visits running. Worst first.
 */
export function attentionList(
  tubs: readonly CareTub[],
  visits: readonly LoggedVisit[],
  now: Date,
  tz: string = APP_TIME_ZONE
): AttentionItem[] {
  const today = dayKey(now, tz);
  const history = byTub(visits);
  const items: AttentionItem[] = [];

  for (const t of tubs) {
    const own = history.get(t.id) ?? [];
    for (const d of careDue(t, own, now)) {
      const inDays = daysBetween(today, dayKey(d.dueOn, tz));
      if (inDays > DUE_SOON_DAYS) continue;
      const what =
        d.kind === "drain"
          ? "drain"
          : d.kind === "filter"
            ? "filter change"
            : "usual visit";
      const when =
        inDays < 0
          ? "overdue"
          : inDays === 0
            ? "due"
            : `due ${dayParts(addDays(today, inDays)).dow}`;
      const since = d.everyDays - inDays;
      items.push({
        id: `d-${t.id}-${d.kind}`,
        tubId: t.id,
        title: `${t.name} — ${what} ${when}`,
        detail:
          d.kind === "visit"
            ? `${plural(since, "day")} since the last visit, you usually go ~${d.everyDays}`
            : `${plural(since, "day")}, you usually go ${d.everyDays}`,
        tone: inDays <= 0 ? "due" : "upcoming",
        severity: inDays,
      });
    }

    const newest = [...own].sort((a, b) => b.at.getTime() - a.at.getTime());
    for (const field of READING_FIELDS) {
      const streak = foundStreak(own, field);
      if (streak < 2) continue;
      const values = newest
        .slice(0, streak)
        .map((v) => v.found?.[field])
        .filter((v): v is number => typeof v === "number");
      const high = values[0] > READING_TARGETS[field].hi;
      const edge = high ? Math.min(...values) : Math.max(...values);
      items.push({
        id: `r-${t.id}-${field}`,
        tubId: t.id,
        title: `${t.name} — ${READING_TARGETS[field].label} arriving ${high ? "high" : "low"}`,
        detail: `${high ? `${fmt(field, edge)}+` : `${fmt(field, edge)} or under`} · ${streak} visits running`,
        tone: "due",
        severity: -streak,
      });
    }
  }
  return items.sort(
    (a, b) => a.severity - b.severity || a.title.localeCompare(b.title)
  );
}

/** This week (Monday–Sunday, app zone): visits logged, records sent, opened. */
export function weekCounts(
  input: {
    visits: readonly LoggedVisit[];
    sent: readonly { turnover_id: string; occurred_at: string }[];
    opened: readonly { turnover_id: string; opened_at: string }[];
  },
  now: Date,
  tz: string = APP_TIME_ZONE
): { logged: number; sent: number; opened: number } {
  const start = weekStart(dayKey(now, tz));
  const end = addDays(start, 6);
  const inWeek = (d: Date) => {
    if (Number.isNaN(d.getTime())) return false;
    const k = dayKey(d, tz);
    return k >= start && k <= end;
  };
  const distinct = (rows: { turnover_id: string; at: string }[]) =>
    new Set(
      rows.filter((r) => inWeek(new Date(r.at))).map((r) => r.turnover_id)
    ).size;
  return {
    logged: input.visits.filter((v) => inWeek(v.at)).length,
    sent: distinct(
      input.sent.map((r) => ({ turnover_id: r.turnover_id, at: r.occurred_at }))
    ),
    opened: distinct(
      input.opened.map((r) => ({ turnover_id: r.turnover_id, at: r.opened_at }))
    ),
  };
}
