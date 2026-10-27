import { describe, it, expect } from "vitest";
import {
  groupTubsByClient,
  nextCare,
  tubStatus,
  tubSubline,
  type TubCareInput,
} from "@/components/tub/tub-status";
import type { HistoryVisit } from "@/lib/tub-history";

const NOW = new Date("2026-10-27T15:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const DEFAULTS: TubCareInput = {
  drainIntervalDays: null,
  filterIntervalDays: null,
};
const inRangeReading = {
  total_alkalinity: 100,
  ph: 7.5,
  calcium_hardness: 200,
  sanitizer_ppm: 2,
};

function visit(
  daysAgo: number,
  steps: string[] = [],
  found: HistoryVisit["found"] = inRangeReading
): HistoryVisit {
  return { at: ago(daysAgo), cleaningSteps: steps, found };
}

describe("nextCare", () => {
  it("no visits → null", () => {
    expect(nextCare(DEFAULTS, [], NOW)).toBeNull();
  });

  it("uses the default drain interval (90) when the tub has none", () => {
    const care = nextCare(DEFAULTS, [visit(84, ["drained_refilled"])], NOW);
    expect(care).toMatchObject({ kind: "drain", inDays: 6 });
    expect(care?.dueOn).toEqual(new Date(ago(84).getTime() + 90 * DAY));
  });

  it("uses the tub's own interval", () => {
    const care = nextCare(
      { drainIntervalDays: 30, filterIntervalDays: null },
      [visit(10, ["drained_refilled"])],
      NOW
    );
    expect(care).toMatchObject({ kind: "drain", inDays: 20 });
  });

  it("returns the earliest of drain and filter", () => {
    const care = nextCare(
      DEFAULTS,
      [visit(10, ["drained_refilled"]), visit(50, ["filter_replaced"])],
      NOW
    );
    expect(care).toMatchObject({ kind: "filter", inDays: 10 });
  });

  it("overdue is negative", () => {
    const care = nextCare(DEFAULTS, [visit(95, ["drained_refilled"])], NOW);
    expect(care).toMatchObject({ kind: "drain", inDays: -5 });
  });
});

describe("tubStatus", () => {
  it("no visits → none", () => {
    expect(tubStatus(DEFAULTS, [], NOW)).toBe("none");
  });

  it("care due within 7 days → attention", () => {
    expect(
      tubStatus(DEFAULTS, [visit(3), visit(84, ["drained_refilled"])], NOW)
    ).toBe("attention");
  });

  it("last found reading out of range → attention", () => {
    expect(
      tubStatus(DEFAULTS, [visit(3, [], { ...inRangeReading, ph: 7.9 })], NOW)
    ).toBe("attention");
  });

  it("only the newest visit's reading counts", () => {
    expect(
      tubStatus(
        DEFAULTS,
        [visit(3), visit(10, [], { ...inRangeReading, ph: 7.9 })],
        NOW
      )
    ).toBe("balanced");
  });

  it("last visit without a reading → none", () => {
    expect(tubStatus(DEFAULTS, [visit(3, [], null)], NOW)).toBe("none");
  });
});

describe("tubSubline", () => {
  it("no visits", () => {
    expect(tubSubline(DEFAULTS, [], NOW)).toBe("No visits yet");
  });

  it("days since visit + drain due", () => {
    expect(
      tubSubline(DEFAULTS, [visit(9), visit(84, ["drained_refilled"])], NOW)
    ).toBe("9 days since visit · drain due in 6");
  });

  it("balanced", () => {
    expect(tubSubline(DEFAULTS, [visit(3)], NOW)).toBe(
      "3 days since visit · balanced"
    );
  });

  it("singular day, out-of-range reading", () => {
    expect(
      tubSubline(DEFAULTS, [visit(1, [], { ...inRangeReading, ph: 7.9 })], NOW)
    ).toBe("1 day since visit · pH high");
  });

  it("visited today, filter overdue", () => {
    expect(
      tubSubline(DEFAULTS, [visit(0.1), visit(63, ["filter_replaced"])], NOW)
    ).toBe("Visited today · filter overdue 3d");
  });

  it("due today", () => {
    expect(
      tubSubline(DEFAULTS, [visit(2), visit(60, ["filter_replaced"])], NOW)
    ).toBe("2 days since visit · filter due today");
  });

  it("never contains NaN or null", () => {
    const line = tubSubline(DEFAULTS, [visit(5, [], { ph: null })], NOW);
    expect(line).toBe("5 days since visit");
  });
});

describe("groupTubsByClient", () => {
  const tub = (id: string, name: string, clientName: string | null) => ({
    id,
    name,
    clientId: clientName ? `c-${clientName}` : null,
    clientName,
  });

  it("groups by client name, sorted, tubs sorted by name", () => {
    const groups = groupTubsByClient([
      tub("1", "Pine Ridge", "Lakeview Rentals"),
      tub("2", "Harbor House", "Bayside Stays"),
      tub("3", "Cedar Cabin", "Lakeview Rentals"),
    ]);
    expect(groups.map((g) => g.clientName)).toEqual([
      "Bayside Stays",
      "Lakeview Rentals",
    ]);
    expect(groups[1].tubs.map((t) => t.name)).toEqual([
      "Cedar Cabin",
      "Pine Ridge",
    ]);
  });

  it("null client → a 'No client' group, last", () => {
    const groups = groupTubsByClient([
      tub("1", "Loner", null),
      tub("2", "Harbor House", "Zeta"),
    ]);
    expect(groups.map((g) => g.clientName)).toEqual(["Zeta", "No client"]);
  });

  it("no tubs → no groups", () => {
    expect(groupTubsByClient([])).toEqual([]);
  });
});
