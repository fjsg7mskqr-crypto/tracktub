import { describe, it, expect } from "vitest";
import { careDue, visitCadenceDays } from "@/lib/care-due";
import type { HistoryVisit } from "@/lib/tub-history";

const NOW = new Date("2026-10-27T15:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const TUB = { id: "t1", drainIntervalDays: null, filterIntervalDays: null };

function visit(daysAgo: number, steps: string[] = []): HistoryVisit {
  return { at: ago(daysAgo), cleaningSteps: steps, found: null };
}

const kind = (items: ReturnType<typeof careDue>, k: string) =>
  items.find((i) => i.kind === k);

describe("careDue", () => {
  it("no visits → []", () => {
    expect(careDue(TUB, [], NOW)).toEqual([]);
  });

  it("drain = last drain + 90 days by default", () => {
    const drain = kind(
      careDue(TUB, [visit(84, ["drained_refilled"])], NOW),
      "drain"
    );
    expect(drain).toMatchObject({
      tubId: "t1",
      everyDays: 90,
      label: "Drain & refill due",
    });
    expect(drain!.dueOn.getTime()).toBe(ago(84 - 90).getTime());
  });

  it("drain uses the tub's own interval", () => {
    const tub = { ...TUB, drainIntervalDays: 30 };
    const drain = kind(
      careDue(tub, [visit(10, ["drained_refilled"])], NOW),
      "drain"
    );
    expect(drain!.everyDays).toBe(30);
    expect(drain!.dueOn.getTime()).toBe(ago(-20).getTime());
  });

  it("filter = last filter change + 60 days by default, tub interval when set", () => {
    const v = [visit(50, ["filter_replaced"])];
    const f = kind(careDue(TUB, v, NOW), "filter");
    expect(f).toMatchObject({ everyDays: 60, label: "Filter change due" });
    expect(f!.dueOn.getTime()).toBe(ago(-10).getTime());
    const own = kind(
      careDue({ ...TUB, filterIntervalDays: 45 }, v, NOW),
      "filter"
    );
    expect(own!.dueOn.getTime()).toBe(ago(5).getTime());
  });

  it("no drain/filter item when the step was never logged", () => {
    expect(careDue(TUB, [visit(3)], NOW)).toEqual([]);
  });

  it("fewer than 3 visits → no visit item", () => {
    expect(
      kind(careDue(TUB, [visit(8), visit(4)], NOW), "visit")
    ).toBeUndefined();
  });

  it("visit = last visit + median gap once there are 3 visits", () => {
    const items = careDue(TUB, [visit(12), visit(8), visit(4)], NOW);
    const v = kind(items, "visit");
    expect(v).toMatchObject({ everyDays: 4, label: "Usually visited by now" });
    expect(v!.dueOn.getTime()).toBe(ago(0).getTime());
  });

  it("sorts by due date and never yields an invalid date", () => {
    const items = careDue(
      TUB,
      [
        visit(100, ["drained_refilled"]),
        visit(20, ["filter_replaced"]),
        visit(10),
        visit(5),
      ],
      NOW
    );
    expect(items.map((i) => i.kind)).toEqual(["drain", "visit", "filter"]);
    for (const i of items) expect(Number.isNaN(i.dueOn.getTime())).toBe(false);
  });
});

describe("visitCadenceDays", () => {
  it("ignores same-day revisits", () => {
    expect(visitCadenceDays([visit(14), visit(7), visit(7.1), visit(0)])).toBe(
      7
    );
  });

  it("median of the last 5 gaps", () => {
    // gaps oldest→newest: 30, 2, 3, 3, 4, 50 → last five 2,3,3,4,50 → 3
    const at = [92, 62, 60, 57, 54, 50, 0];
    expect(visitCadenceDays(at.map((d) => visit(d)))).toBe(3);
  });

  it("null with too little history", () => {
    expect(visitCadenceDays([])).toBeNull();
    expect(visitCadenceDays([visit(3), visit(3.2), visit(3.4)])).toBeNull();
  });
});
