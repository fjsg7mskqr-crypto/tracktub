import { describe, it, expect } from "vitest";
import {
  addDays,
  dayKey,
  dayParts,
  monthGrid,
  parseDayKey,
  weekStart,
} from "@/components/calendar/days";

const TZ = "America/Detroit";

describe("days", () => {
  it("dayKey buckets by the app zone, not UTC", () => {
    expect(dayKey(new Date("2026-10-27T03:30:00Z"), TZ)).toBe("2026-10-26");
    expect(dayKey(new Date("2026-10-27T15:00:00Z"), TZ)).toBe("2026-10-27");
  });

  it("addDays crosses months and DST", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 7)).toBe("2026-11-08");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("weekStart is Monday", () => {
    expect(weekStart("2026-10-28")).toBe("2026-10-26");
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
  });

  it("monthGrid pads to whole Monday-led weeks", () => {
    const g = monthGrid("2026-10-15");
    expect(g.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(g).toHaveLength(35);
    expect(g.filter(Boolean)).toHaveLength(31);
  });

  it("dayParts", () => {
    expect(dayParts("2026-10-26")).toEqual({
      dow: "Mon",
      weekday: "Monday",
      num: 26,
      month: "Oct",
      monthLong: "October",
      year: 2026,
    });
  });

  it("parseDayKey rejects junk", () => {
    expect(parseDayKey("2026-10-26")).toBe("2026-10-26");
    expect(parseDayKey("2026-13-40")).toBeNull();
    expect(parseDayKey("nope")).toBeNull();
    expect(parseDayKey(undefined)).toBeNull();
  });
});
