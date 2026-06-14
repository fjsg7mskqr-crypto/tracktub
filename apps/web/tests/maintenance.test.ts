import { describe, it, expect } from "vitest";
import { maintenanceStatus, type MaintenanceInput } from "@/lib/maintenance";

const NOW = Date.parse("2026-06-14T12:00:00.000Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

function timeTask(value: number, lastDoneDaysAgo: number | null): MaintenanceInput {
  return {
    recurrenceKind: "time",
    recurrenceValue: value,
    recurrenceUnit: "day",
    lastDoneAt: lastDoneDaysAgo == null ? null : daysAgo(lastDoneDaysAgo),
    turnoversSinceDone: 0,
  };
}

function turnoverTask(value: number, since: number, everDone: boolean): MaintenanceInput {
  return {
    recurrenceKind: "turnover",
    recurrenceValue: value,
    recurrenceUnit: null,
    lastDoneAt: everDone ? daysAgo(30) : null,
    turnoversSinceDone: since,
  };
}

describe("maintenanceStatus — time-based", () => {
  it("never done → due now (overdue)", () => {
    expect(maintenanceStatus(timeTask(90, null), NOW).state).toBe("overdue");
  });
  it("done 30d ago on a 90d cycle → ok", () => {
    expect(maintenanceStatus(timeTask(90, 30), NOW).state).toBe("ok");
  });
  it("done 100d ago on a 90d cycle → overdue", () => {
    const s = maintenanceStatus(timeTask(90, 100), NOW);
    expect(s.state).toBe("overdue");
    expect(s.overdueDays).toBe(10);
  });
  it("due within the soon window (≤3d) → due_soon", () => {
    // 88d ago on a 90d cycle → 2 days left
    expect(maintenanceStatus(timeTask(90, 88), NOW).state).toBe("due_soon");
  });
});

describe("maintenanceStatus — turnover-based", () => {
  it("never done, 0 turnovers, every 3 → due_soon-or-ok not overdue", () => {
    expect(maintenanceStatus(turnoverTask(3, 0, false), NOW).state).not.toBe("overdue");
  });
  it("2 of 3 turnovers → due_soon (1 left)", () => {
    const s = maintenanceStatus(turnoverTask(3, 2, true), NOW);
    expect(s.state).toBe("due_soon");
    expect(s.turnoversLeft).toBe(1);
  });
  it("3 of 3 turnovers → overdue", () => {
    expect(maintenanceStatus(turnoverTask(3, 3, true), NOW).state).toBe("overdue");
  });
  it("4 of 3 turnovers → overdue (1 over)", () => {
    const s = maintenanceStatus(turnoverTask(3, 4, true), NOW);
    expect(s.state).toBe("overdue");
    expect(s.turnoversOver).toBe(1);
  });
});
