import { describe, expect, it } from "vitest";
import {
  APP_TIME_ZONE,
  formatDate,
  formatShortDate,
  formatTime,
} from "@/lib/time";

describe("time helpers", () => {
  it("defaults to America/Detroit", () => {
    expect(APP_TIME_ZONE).toBe(
      process.env.TRACKTUB_TIME_ZONE ?? "America/Detroit"
    );
  });

  it("formats a time in the app zone", () => {
    expect(formatTime("2026-10-26T13:42:00Z")).toBe("9:42 AM");
  });

  it("formats a long date in the app zone", () => {
    expect(formatDate("2026-10-26T13:42:00Z")).toBe("Mon Oct 26, 2026");
  });

  it("formats a short date", () => {
    expect(formatShortDate("2026-10-26T13:42:00Z")).toBe("Oct 26");
  });

  it("formats in APP_TIME_ZONE across UTC midnight", () => {
    const lateEvening = "2026-10-27T03:30:00Z";
    expect(formatDate(lateEvening)).toBe("Mon Oct 26, 2026");
    expect(formatShortDate(lateEvening)).toBe("Oct 26");
    expect(formatTime(lateEvening)).toBe("11:30 PM");
  });

  it("accepts an explicit zone", () => {
    expect(formatTime("2026-10-26T13:42:00Z", "UTC")).toBe("1:42 PM");
  });

  it("accepts a Date", () => {
    expect(formatTime(new Date("2026-10-26T13:42:00Z"))).toBe("9:42 AM");
  });

  it.each([null, "nope"])("renders %s as a dash", (input) => {
    expect(formatTime(input)).toBe("—");
    expect(formatDate(input)).toBe("—");
    expect(formatShortDate(input)).toBe("—");
  });
});
