import { describe, expect, it } from "vitest";
import { cleanReason, pickDate, pickFor, validDueOn } from "@/lib/next-visit";

const TZ = "America/Detroit";
// Tue Oct 27 2026, 11:00 Detroit.
const NOW = new Date("2026-10-27T15:00:00Z");

describe("next visit helpers", () => {
  it("quick picks land on the right day in the app zone", () => {
    expect(pickDate("2d", NOW, TZ)).toBe("2026-10-29");
    expect(pickDate("3d", NOW, TZ)).toBe("2026-10-30");
    expect(pickDate("1w", NOW, TZ)).toBe("2026-11-03");
    expect(pickDate("none", NOW, TZ)).toBeNull();
    expect(pickDate("date", NOW, TZ)).toBeNull();
  });

  it("a late-evening local time still counts from the local day", () => {
    // 11:30 pm Detroit on Oct 27 is already Oct 28 in UTC.
    expect(pickDate("2d", new Date("2026-10-28T03:30:00Z"), TZ)).toBe(
      "2026-10-29"
    );
  });

  it("shows a saved date as its quick pick, else Pick a date", () => {
    expect(pickFor(null, NOW, TZ)).toBe("none");
    expect(pickFor("2026-10-30", NOW, TZ)).toBe("3d");
    expect(pickFor("2026-11-20", NOW, TZ)).toBe("date");
  });

  it("trims and caps the reason at 120 characters", () => {
    expect(cleanReason("  Re-check foaming  ")).toBe("Re-check foaming");
    expect(cleanReason("x".repeat(200))).toHaveLength(120);
    expect(cleanReason(null)).toBe("");
  });

  it("refuses past or malformed dates", () => {
    expect(validDueOn("2026-10-27", NOW, TZ)).toBe("2026-10-27");
    expect(validDueOn("2026-10-26", NOW, TZ)).toBeNull();
    expect(validDueOn("2026-02-31", NOW, TZ)).toBeNull();
    expect(validDueOn("soon", NOW, TZ)).toBeNull();
    expect(validDueOn(null, NOW, TZ)).toBeNull();
  });
});
