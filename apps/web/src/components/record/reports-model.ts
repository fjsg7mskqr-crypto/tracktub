// Reports (spec §10) as data: the Sent list and the history report's window.
// Sent = the operator sent or copied the link (a share_copied proof_event);
// Opened = the owner's link was opened at least once (any share_view row).

import { APP_TIME_ZONE, formatShortDate, formatTime } from "@/lib/time";

export type SentEventRow = {
  turnover_id: string;
  occurred_at: string;
  turnover: {
    submitted_at_server: string | null;
    property: { name: string; client: { name: string } | null } | null;
  } | null;
};

export type SentItem = {
  turnoverId: string;
  title: string;
  to: string | null;
  sentAt: string;
  opened: boolean;
};

/** One item per record, at its first send, newest first. */
export function buildSentList(
  events: SentEventRow[],
  openedIds: Set<string>
): SentItem[] {
  const firstSend = new Map<string, SentEventRow>();
  for (const e of events) {
    if (!e.turnover) continue;
    const seen = firstSend.get(e.turnover_id);
    if (!seen || e.occurred_at < seen.occurred_at)
      firstSend.set(e.turnover_id, e);
  }
  return [...firstSend.values()]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .map((e) => ({
      turnoverId: e.turnover_id,
      title: `${e.turnover?.property?.name ?? "—"} · ${formatShortDate(
        e.turnover?.submitted_at_server ?? null
      )}`,
      to: e.turnover?.property?.client?.name ?? null,
      sentAt: formatTime(e.occurred_at),
      opened: openedIds.has(e.turnover_id),
    }));
}

export type HistoryPeriod = "last6" | "season";

export const PERIOD_LABELS: Record<HistoryPeriod, string> = {
  last6: "Last 6 visits",
  season: "This season",
};

export function parsePeriod(v: string | undefined): HistoryPeriod {
  return v === "season" ? "season" : "last6";
}

function yearIn(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
  }).format(d);
}

/**
 * Locked visits in the period, newest first. "This season" is the current
 * calendar year in the app zone; "last 6 visits" is the six most recent.
 */
export function historyVisits<T extends { submitted_at_server: string | null }>(
  visits: T[],
  period: HistoryPeriod,
  now: Date,
  tz: string = APP_TIME_ZONE
): T[] {
  const locked = visits
    .filter((v): v is T & { submitted_at_server: string } =>
      Boolean(v.submitted_at_server)
    )
    .sort((a, b) => b.submitted_at_server.localeCompare(a.submitted_at_server));
  if (period === "last6") return locked.slice(0, 6);
  const year = yearIn(now, tz);
  return locked.filter(
    (v) => yearIn(new Date(v.submitted_at_server), tz) === year
  );
}
