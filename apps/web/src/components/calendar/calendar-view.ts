// Calendar screen state from the URL (`/calendar?view=week&d=2026-10-26`):
// which days show, their labels and the prev / next targets. Pure.

import {
  addDays,
  addMonths,
  dayParts,
  monthGrid,
  parseDayKey,
  weekStart,
} from "./days";

export type CalendarView = "day" | "week" | "month";

export const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

export function parseView(v: string | undefined): CalendarView {
  return v === "day" || v === "month" ? v : "week";
}

export const calendarHref = (view: CalendarView, d: string) =>
  `/calendar?view=${view}&d=${d}`;

export type CalendarRange = {
  view: CalendarView;
  /** The anchor day (the URL's `d`, or today). */
  anchor: string;
  /** Days listed (day/week), or the month grid with null padding. */
  cells: (string | null)[];
  label: string;
  prev: string;
  next: string;
  containsToday: boolean;
};

export function calendarRange(
  view: CalendarView,
  d: string | undefined,
  today: string
): CalendarRange {
  const anchor = parseDayKey(d) ?? today;
  const p = dayParts(anchor);
  let cells: (string | null)[];
  let label: string;
  let step: (n: number) => string;

  if (view === "day") {
    cells = [anchor];
    label = `${p.weekday}, ${p.month} ${p.num}`;
    step = (n) => addDays(anchor, n);
  } else if (view === "week") {
    const start = weekStart(anchor);
    cells = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const e = dayParts(cells[6]!);
    const s = dayParts(start);
    label =
      s.month === e.month
        ? `${s.month} ${s.num} – ${e.num}`
        : `${s.month} ${s.num} – ${e.month} ${e.num}`;
    step = (n) => addDays(start, 7 * n);
  } else {
    cells = monthGrid(anchor);
    label = `${p.monthLong} ${p.year}`;
    step = (n) => addMonths(anchor, n);
  }
  return {
    view,
    anchor,
    cells,
    label,
    prev: calendarHref(view, step(-1)),
    next: calendarHref(view, step(1)),
    containsToday: cells.includes(today),
  };
}
