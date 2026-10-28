// Calendar days as "YYYY-MM-DD" keys in the app zone (servers run UTC, so a
// visit at 11 pm Detroit must land on the Detroit day). Key arithmetic runs on
// UTC midnights, which has no DST.

import { APP_TIME_ZONE } from "@/lib/time";

const DAY_MS = 86_400_000;
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The calendar day `d` falls on in `tz`. */
export function dayKey(d: Date, tz: string = APP_TIME_ZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function utc(key: string): Date {
  const [, y, m, d] = KEY.exec(key)!;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

const keyOf = (d: Date) => d.toISOString().slice(0, 10);

/** A valid day key, or null (bad query params fall back to today). */
export function parseDayKey(v: string | undefined | null): string | null {
  if (!v || !KEY.test(v)) return null;
  return keyOf(utc(v)) === v ? v : null;
}

export function addDays(key: string, n: number): string {
  return keyOf(new Date(utc(key).getTime() + n * DAY_MS));
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  return addDays(key, -((utc(key).getUTCDay() + 6) % 7));
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((utc(b).getTime() - utc(a).getTime()) / DAY_MS);
}

/** The month of `key` as Monday-led weeks; null pads the edges. */
export function monthGrid(key: string): (string | null)[] {
  const first = `${key.slice(0, 8)}01`;
  const cells: (string | null)[] = Array(
    daysBetween(weekStart(first), first)
  ).fill(null);
  for (let k = first; k.slice(0, 7) === key.slice(0, 7); k = addDays(k, 1))
    cells.push(k);
  while (cells.length % 7) cells.push(null);
  return cells;
}

/** First day of the month `n` months from `key`'s. */
export function addMonths(key: string, n: number): string {
  const d = utc(key);
  return keyOf(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)));
}

export function dayParts(key: string): {
  dow: string;
  weekday: string;
  num: number;
  month: string;
  monthLong: string;
  year: number;
} {
  const d = utc(key);
  const f = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...o }).format(d);
  return {
    dow: f({ weekday: "short" }),
    weekday: f({ weekday: "long" }),
    num: d.getUTCDate(),
    month: f({ month: "short" }),
    monthLong: f({ month: "long" }),
    year: d.getUTCFullYear(),
  };
}
