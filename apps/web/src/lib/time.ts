// Display times for the signed-in app and the record. Pages render on the
// server (UTC on Vercel), so every time is formatted in an explicit zone rather
// than the runtime's. The zone is the device's (see TimeZoneSync + getTimeZone);
// reports use the zone the visit happened in. `tz` is a required argument on
// purpose: nothing may silently fall back to a default zone.

/** First-party cookie holding the device's IANA zone (set by TimeZoneSync). */
export const TIME_ZONE_COOKIE = "tt_tz";

/** Final fallback: the business is in Michigan. */
export const DEFAULT_TIME_ZONE = "America/Detroit";

/** True when `tz` is an IANA zone the runtime knows. */
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  if (!/^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)*$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** `tz` if it is a real zone, else `fallback` (default America/Detroit). */
export function resolveTimeZone(
  tz: unknown,
  fallback: string = DEFAULT_TIME_ZONE
): string {
  return isValidTimeZone(tz) ? tz : fallback;
}

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
export function formatTime(d: Date | string | null, tz: string): string {
  const date = toDate(d);
  if (!date) return "—";
  const p = parts(date, tz, { hour: "numeric", minute: "2-digit" });
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** "Mon Oct 26, 2026"; "—" when missing or invalid. */
export function formatDate(d: Date | string | null, tz: string): string {
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
export function formatShortDate(d: Date | string | null, tz: string): string {
  const date = toDate(d);
  if (!date) return "—";
  const p = parts(date, tz, { month: "short", day: "numeric" });
  return `${p.month} ${p.day}`;
}

/** "EST", "PDT", "AKST", "HST"…; "" when the zone has no short name. */
export function formatZoneLabel(d: Date | string | null, tz: string): string {
  const date = toDate(d) ?? new Date();
  return parts(date, tz, { timeZoneName: "short" }).timeZoneName ?? "";
}

/** "9:42 AM EST"; "—" when missing or invalid. */
export function formatTimeWithZone(
  d: Date | string | null,
  tz: string
): string {
  const date = toDate(d);
  if (!date) return "—";
  return `${formatTime(date, tz)} ${formatZoneLabel(date, tz)}`.trim();
}
