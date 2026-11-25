import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIME_ZONE,
  formatDate,
  formatShortDate,
  formatTime,
  formatTimeWithZone,
  formatZoneLabel,
  isValidTimeZone,
  resolveTimeZone,
} from "@/lib/time";

const DETROIT = "America/Detroit";
const LA = "America/Los_Angeles";

describe("time helpers", () => {
  it("falls back to America/Detroit", () => {
    expect(DEFAULT_TIME_ZONE).toBe(DETROIT);
  });

  it("formats a time in the given zone", () => {
    expect(formatTime("2026-10-26T13:42:00Z", DETROIT)).toBe("9:42 AM");
    expect(formatTime("2026-10-26T13:42:00Z", "UTC")).toBe("1:42 PM");
  });

  it("the same instant reads differently in Los Angeles and Detroit", () => {
    const at = "2026-10-26T13:42:00Z";
    expect(formatTime(at, DETROIT)).toBe("9:42 AM");
    expect(formatTime(at, LA)).toBe("6:42 AM");
  });

  it("formats dates across UTC midnight in the given zone", () => {
    const lateEvening = "2026-10-27T03:30:00Z";
    expect(formatDate(lateEvening, DETROIT)).toBe("Mon Oct 26, 2026");
    expect(formatShortDate(lateEvening, DETROIT)).toBe("Oct 26");
    expect(formatTime(lateEvening, DETROIT)).toBe("11:30 PM");
    // Still the 26th a few time zones west, but the 27th in UTC.
    expect(formatShortDate(lateEvening, "UTC")).toBe("Oct 27");
    expect(formatShortDate("2026-10-27T01:30:00Z", LA)).toBe("Oct 26");
  });

  it("accepts a Date", () => {
    expect(formatTime(new Date("2026-10-26T13:42:00Z"), DETROIT)).toBe(
      "9:42 AM"
    );
  });

  it.each([null, "nope"])("renders %s as a dash", (input) => {
    expect(formatTime(input, DETROIT)).toBe("—");
    expect(formatDate(input, DETROIT)).toBe("—");
    expect(formatShortDate(input, DETROIT)).toBe("—");
    expect(formatTimeWithZone(input, DETROIT)).toBe("—");
  });
});

describe("zone labels", () => {
  it.each([
    ["2026-01-15T17:00:00Z", DETROIT, "EST"],
    ["2026-07-15T17:00:00Z", DETROIT, "EDT"],
    ["2026-01-15T17:00:00Z", LA, "PST"],
    ["2026-07-15T17:00:00Z", LA, "PDT"],
    ["2026-01-15T17:00:00Z", "America/Chicago", "CST"],
    ["2026-07-15T17:00:00Z", "America/Denver", "MDT"],
    ["2026-07-15T17:00:00Z", "America/Phoenix", "MST"],
    ["2026-01-15T17:00:00Z", "America/Anchorage", "AKST"],
    ["2026-01-15T17:00:00Z", "Pacific/Honolulu", "HST"],
  ])("%s in %s is %s", (at, tz, label) => {
    expect(formatZoneLabel(at, tz)).toBe(label);
  });

  it("puts the label after the time", () => {
    expect(formatTimeWithZone("2026-07-15T13:42:00Z", DETROIT)).toBe(
      "9:42 AM EDT"
    );
    expect(formatTimeWithZone("2026-07-15T13:42:00Z", LA)).toBe("6:42 AM PDT");
  });
});

describe("time zone validation", () => {
  it.each([
    "America/Los_Angeles",
    "America/Detroit",
    "UTC",
    "Pacific/Honolulu",
  ])("accepts %s", (tz) => {
    expect(isValidTimeZone(tz)).toBe(true);
    expect(resolveTimeZone(tz)).toBe(tz);
  });

  it.each([
    "",
    "Mars/Olympus_Mons",
    "not a zone",
    "America/" + "x".repeat(80),
    "../etc/passwd",
    "<script>",
    null,
    undefined,
    42,
  ])("rejects %s and falls back", (tz) => {
    expect(isValidTimeZone(tz)).toBe(false);
    expect(resolveTimeZone(tz)).toBe(DETROIT);
    expect(resolveTimeZone(tz, "UTC")).toBe("UTC");
  });
});
