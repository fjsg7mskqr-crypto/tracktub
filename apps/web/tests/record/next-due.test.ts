import { describe, expect, it } from "vitest";
import { careFromVisits, nextDueLine } from "@/components/record/record-model";

describe("nextDueLine", () => {
  it("picks the earlier of drain and filter", () => {
    expect(
      nextDueLine({
        drainedAt: "2026-10-26T14:58:00Z",
        drainDays: 90,
        filterAt: "2026-10-01T14:58:00Z",
        filterDays: 60,
      })
    ).toBe("Filter change due Nov 30");
    expect(
      nextDueLine({
        drainedAt: "2026-08-01T14:58:00Z",
        drainDays: 90,
        filterAt: "2026-10-01T14:58:00Z",
        filterDays: 60,
      })
    ).toBe("Drain & refill due Oct 30");
  });

  it("uses the care defaults when the tub has no interval", () => {
    expect(
      nextDueLine({
        drainedAt: "2026-10-26T14:58:00Z",
        drainDays: null,
        filterAt: null,
        filterDays: null,
      })
    ).toBe("Drain & refill due Jan 24");
  });

  it("is null with no history", () => {
    expect(
      nextDueLine({
        drainedAt: null,
        drainDays: 90,
        filterAt: null,
        filterDays: 60,
      })
    ).toBeNull();
  });
});

describe("careFromVisits", () => {
  it("finds the latest drain and filter change", () => {
    expect(
      careFromVisits([
        {
          submitted_at_server: "2026-09-01T12:00:00Z",
          cleaning_steps: ["drained_refilled", "filter_replaced"],
        },
        {
          submitted_at_server: "2026-10-01T12:00:00Z",
          cleaning_steps: ["filter_replaced"],
        },
        { submitted_at_server: "2026-10-20T12:00:00Z", cleaning_steps: null },
      ])
    ).toEqual({
      drainedAt: "2026-09-01T12:00:00Z",
      filterAt: "2026-10-01T12:00:00Z",
    });
  });

  it("no visits → nulls", () => {
    expect(careFromVisits([])).toEqual({ drainedAt: null, filterAt: null });
  });
});
