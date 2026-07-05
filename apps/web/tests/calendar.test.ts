import { describe, it, expect } from "vitest";
import {
  addDays,
  maintenanceOccurrences,
  weekDays,
  monthGrid,
  bucketByDay,
  upcoming,
  type OccurrenceTask,
} from "@/lib/calendar";

const timeTask = (over: Partial<OccurrenceTask> = {}): OccurrenceTask => ({
  maintenanceTaskId: "t1",
  title: "Shock",
  recurrenceKind: "time",
  recurrenceValue: 7,
  recurrenceUnit: "day",
  lastDoneAt: "2026-07-01T12:00:00Z",
  ...over,
});

describe("addDays", () => {
  it("adds across a month boundary", () => {
    expect(addDays("2026-07-30", 3)).toBe("2026-08-02");
  });
  it("subtracts with negatives", () => {
    expect(addDays("2026-08-02", -3)).toBe("2026-07-30");
  });
});

describe("maintenanceOccurrences", () => {
  it("rolls a time task forward across the horizon", () => {
    // last done 2026-07-01, every 7d → due 07-08, 07-15, 07-22...
    const occ = maintenanceOccurrences(timeTask(), "2026-07-05", 20);
    expect(occ.map((o) => o.dueDate)).toEqual([
      "2026-07-08",
      "2026-07-15",
      "2026-07-22",
    ]);
    expect(occ[0]).toMatchObject({ maintenanceTaskId: "t1", title: "Shock" });
  });
  it("never-done time task → single occurrence at fromDate (overdue today)", () => {
    const occ = maintenanceOccurrences(
      timeTask({ lastDoneAt: null }),
      "2026-07-05",
      20
    );
    expect(occ.map((o) => o.dueDate)).toEqual(["2026-07-05"]);
  });
  it("excludes turnover-based tasks (no calendar date)", () => {
    const occ = maintenanceOccurrences(
      timeTask({ recurrenceKind: "turnover", recurrenceUnit: null }),
      "2026-07-05",
      60
    );
    expect(occ).toEqual([]);
  });
  it("emits nothing when the next due date is beyond the horizon", () => {
    const occ = maintenanceOccurrences(
      timeTask({ recurrenceValue: 30 }),
      "2026-07-05",
      10
    );
    expect(occ).toEqual([]);
  });
});

describe("weekDays", () => {
  it("returns 7 Sunday-start dates containing the anchor", () => {
    // 2026-07-05 is a Sunday
    expect(weekDays("2026-07-08")).toEqual([
      "2026-07-05",
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
    ]);
  });
});

describe("monthGrid", () => {
  it("returns 42 cells with outside flags", () => {
    const grid = monthGrid("2026-07-15");
    expect(grid).toHaveLength(42);
    // July 2026 starts Wed; first cell is Sun 2026-06-28 (outside)
    expect(grid[0]).toEqual({ date: "2026-06-28", outside: true });
    expect(grid.find((c) => c.date === "2026-07-01")).toEqual({
      date: "2026-07-01",
      outside: false,
    });
  });
});

describe("bucketByDay", () => {
  it("groups entries by their date key", () => {
    const map = bucketByDay([
      { date: "2026-07-05", id: "a" },
      { date: "2026-07-05", id: "b" },
      { date: "2026-07-06", id: "c" },
    ]);
    expect(map.get("2026-07-05")?.map((e) => e.id)).toEqual(["a", "b"]);
    expect(map.get("2026-07-06")?.map((e) => e.id)).toEqual(["c"]);
  });
});

describe("upcoming", () => {
  const rows = [
    { date: "2026-07-04", status: "scheduled", id: "past" },
    { date: "2026-07-06", status: "done", id: "done" },
    { date: "2026-07-07", status: "scheduled", id: "b" },
    { date: "2026-07-05", status: "scheduled", id: "a" },
    { date: "2026-07-08", status: "skipped", id: "skip" },
  ];
  it("returns open future entries sorted ascending, capped at n", () => {
    expect(upcoming(rows, "2026-07-05", 5).map((r) => r.id)).toEqual(["a", "b"]);
  });
});
