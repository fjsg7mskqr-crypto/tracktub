import { describe, it, expect } from "vitest";
import {
  daysSince,
  foundStreak,
  lastStepDate,
  type HistoryVisit,
} from "@/lib/tub-history";

const NOW = new Date("2026-10-27T15:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

function visit(
  daysAgo: number,
  opts: { steps?: string[]; ph?: number | null; found?: null } = {}
): HistoryVisit {
  return {
    at: ago(daysAgo),
    cleaningSteps: opts.steps ?? [],
    found:
      opts.found === null
        ? null
        : { ph: opts.ph === undefined ? 7.5 : opts.ph },
  };
}

describe("tub-history: no visits", () => {
  it("has no step date, no streak", () => {
    expect(lastStepDate([], "drained_refilled")).toBeNull();
    expect(foundStreak([], "ph")).toBe(0);
    expect(daysSince(lastStepDate([], "filter_replaced"), NOW)).toBeNull();
  });
});

describe("lastStepDate", () => {
  it("returns the newest visit with the code, whatever the input order", () => {
    const visits = [
      visit(40, { steps: ["drained_refilled"] }),
      visit(3, { steps: ["wiped"] }),
      visit(10, { steps: ["drained_refilled", "wiped"] }),
      visit(90, { steps: ["drained_refilled"] }),
    ];
    expect(lastStepDate(visits, "drained_refilled")).toEqual(ago(10));
  });

  it("is null when no visit did the step", () => {
    expect(
      lastStepDate([visit(1, { steps: ["wiped"] })], "filter_replaced")
    ).toBeNull();
  });
});

describe("foundStreak", () => {
  it("counts consecutive most-recent out-of-range found values", () => {
    const visits = [
      visit(30, { ph: 7.5 }),
      visit(1, { ph: 7.9 }),
      visit(20, { ph: 7.9 }),
      visit(10, { ph: 8.0 }),
    ];
    expect(foundStreak(visits, "ph")).toBe(3);
  });

  it("is 0 when the newest found value is in range", () => {
    expect(
      foundStreak([visit(1, { ph: 7.5 }), visit(5, { ph: 8.1 })], "ph")
    ).toBe(0);
  });

  it("null breaks the streak (never claim an unread value)", () => {
    const visits = [
      visit(1, { ph: 7.9 }),
      visit(5, { ph: null }),
      visit(9, { ph: 7.9 }),
    ];
    expect(foundStreak(visits, "ph")).toBe(1);
  });

  it("a visit with no found reading is 0", () => {
    expect(foundStreak([visit(1, { found: null })], "ph")).toBe(0);
  });

  it("a field missing from the reading breaks the streak", () => {
    expect(foundStreak([visit(1, { ph: 7.9 })], "sanitizer_ppm")).toBe(0);
  });
});

describe("daysSince", () => {
  it("floors elapsed whole days", () => {
    expect(daysSince(ago(9.5), NOW)).toBe(9);
    expect(daysSince(ago(0.2), NOW)).toBe(0);
  });

  it("null → null", () => {
    expect(daysSince(null, NOW)).toBeNull();
  });

  it("invalid date → null", () => {
    expect(daysSince(new Date("not a date"), NOW)).toBeNull();
  });

  it("future → 0", () => {
    expect(daysSince(new Date(NOW.getTime() + 3 * DAY), NOW)).toBe(0);
  });
});
