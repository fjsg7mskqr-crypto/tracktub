import { describe, it, expect } from "vitest";
import {
  warrantyAlert,
  countWarrantyAlerts,
  warrantyLabel,
  warrantyTone,
  WARRANTY_SOON_DAYS,
} from "@/lib/equipment";

const TODAY = "2026-07-02";

function daysFromToday(days: number): string {
  const [y, m, d] = TODAY.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

describe("warrantyAlert", () => {
  it("null when no warranty date", () => {
    expect(warrantyAlert(null, TODAY)).toBeNull();
  });

  it("expired when before today", () => {
    expect(warrantyAlert("2026-06-01", TODAY)).toBe("expired");
  });

  it("expiring_soon within the soon window", () => {
    expect(warrantyAlert(daysFromToday(WARRANTY_SOON_DAYS), TODAY)).toBe("expiring_soon");
    expect(warrantyAlert(daysFromToday(1), TODAY)).toBe("expiring_soon");
  });

  it("null when comfortably covered", () => {
    expect(warrantyAlert(daysFromToday(WARRANTY_SOON_DAYS + 1), TODAY)).toBeNull();
  });
});

describe("countWarrantyAlerts", () => {
  it("counts expired and expiring items", () => {
    const counts = countWarrantyAlerts(
      [
        { warrantyUntil: "2026-01-01" },
        { warrantyUntil: daysFromToday(10) },
        { warrantyUntil: daysFromToday(90) },
        { warrantyUntil: null },
      ],
      TODAY
    );
    expect(counts).toEqual({ expired: 1, expiringSoon: 1 });
  });
});

describe("warrantyLabel / warrantyTone", () => {
  it("expired → warn label", () => {
    expect(warrantyLabel("2026-01-01", TODAY)).toBe("Warranty expired");
    expect(warrantyTone("2026-01-01", TODAY)).toBe("warn");
  });

  it("active → neutral until-date label", () => {
    const until = daysFromToday(60);
    expect(warrantyLabel(until, TODAY)).toMatch(/^Warranty until /);
    expect(warrantyTone(until, TODAY)).toBe("neutral");
  });
});
