// Display times for the signed-in app and the record. Pages render on the
// server (UTC on Vercel), so every time is formatted in an explicit zone rather
// than the runtime's. There is no per-org zone yet; set TRACKTUB_TIME_ZONE to
// override the default.

export const APP_TIME_ZONE: string =
  process.env.TRACKTUB_TIME_ZONE ?? "America/Detroit";

function toDate(d: Date | string | null): Date | null {
  if (d === null) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parts(
  date: Date,
  tz: string,
  opts: Intl.DateTimeFormatOptions
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    ...opts,
  }).formatToParts(date)) {
    out[p.type] = p.value;
  }
  return out;
}

/** "9:42 AM"; "—" when missing or invalid. */
export function formatTime(
  d: Date | string | null,
  tz: string = APP_TIME_ZONE
): string {
  const date = toDate(d);
  if (!date) return "—";
  const p = parts(date, tz, { hour: "numeric", minute: "2-digit" });
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** "Mon Oct 26, 2026"; "—" when missing or invalid. */
export function formatDate(
  d: Date | string | null,
  tz: string = APP_TIME_ZONE
): string {
  const date = toDate(d);
  if (!date) return "—";
  const p = parts(date, tz, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${p.weekday} ${p.month} ${p.day}, ${p.year}`;
}

/** "Oct 26"; "—" when missing or invalid. */
export function formatShortDate(
  d: Date | string | null,
  tz: string = APP_TIME_ZONE
): string {
  const date = toDate(d);
  if (!date) return "—";
  const p = parts(date, tz, { month: "short", day: "numeric" });
  return `${p.month} ${p.day}`;
}
