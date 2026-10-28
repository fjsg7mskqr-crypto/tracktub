import { describe, it, expect } from "vitest";
import { calendarRange, parseView } from "@/components/calendar/calendar-view";

const TODAY = "2026-10-26";

describe("calendarRange", () => {
  it("week is Monday-first with a cross-month label", () => {
    const r = calendarRange("week", "2026-10-28", TODAY);
    expect(r.cells).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(r.label).toBe("Oct 26 – Nov 1");
    expect(r.prev).toBe("/calendar?view=week&d=2026-10-19");
    expect(r.next).toBe("/calendar?view=week&d=2026-11-02");
    expect(r.containsToday).toBe(true);
  });

  it("day and month labels and steps", () => {
    const day = calendarRange("day", undefined, TODAY);
    expect(day.label).toBe("Monday, Oct 26");
    expect(day.next).toBe("/calendar?view=day&d=2026-10-27");
    const month = calendarRange("month", "2026-10-26", TODAY);
    expect(month.label).toBe("October 2026");
    expect(month.prev).toBe("/calendar?view=month&d=2026-09-01");
    expect(month.next).toBe("/calendar?view=month&d=2026-11-01");
  });

  it("junk falls back to today and week", () => {
    expect(parseView("bookings")).toBe("week");
    expect(calendarRange("day", "2026-02-30", TODAY).anchor).toBe(TODAY);
  });
});
