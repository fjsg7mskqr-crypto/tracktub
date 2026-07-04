import { describe, it, expect } from "vitest";
import {
  isLow,
  countLow,
  quantityLabel,
  formatQuantity,
  formatDateOnly,
  SUGGESTED_SUPPLIES,
} from "@/lib/supplies";

describe("isLow", () => {
  it("low when quantity is at or below reorder point", () => {
    expect(isLow({ quantity: 1, reorderAt: 1 })).toBe(true);
    expect(isLow({ quantity: 0, reorderAt: 1 })).toBe(true);
    expect(isLow({ quantity: 0.5, reorderAt: 2 })).toBe(true);
  });

  it("not low when comfortably above threshold", () => {
    expect(isLow({ quantity: 5, reorderAt: 1 })).toBe(false);
  });

  it("never low when quantity or threshold is untracked", () => {
    expect(isLow({ quantity: null, reorderAt: 1 })).toBe(false);
    expect(isLow({ quantity: 0, reorderAt: null })).toBe(false);
    expect(isLow({ quantity: null, reorderAt: null })).toBe(false);
  });
});

describe("countLow", () => {
  it("counts only at-or-below-threshold items", () => {
    const items = [
      { quantity: 1, reorderAt: 1 }, // low
      { quantity: 0, reorderAt: 1 }, // low
      { quantity: 5, reorderAt: 1 }, // ok
      { quantity: null, reorderAt: 1 }, // untracked
    ];
    expect(countLow(items)).toBe(2);
  });

  it("is zero for an empty list", () => {
    expect(countLow([])).toBe(0);
  });
});

describe("quantityLabel", () => {
  it("joins quantity and unit", () => {
    expect(quantityLabel({ quantity: 3, unit: "lb" })).toBe("3 lb");
  });

  it("omits a missing unit", () => {
    expect(quantityLabel({ quantity: 12, unit: null })).toBe("12");
  });

  it("dashes an untracked quantity", () => {
    expect(quantityLabel({ quantity: null, unit: "lb" })).toBe("—");
  });
});

describe("formatQuantity", () => {
  it("keeps integers bare", () => {
    expect(formatQuantity(3)).toBe("3");
    expect(formatQuantity(3.0)).toBe("3");
  });

  it("preserves fractional values", () => {
    expect(formatQuantity(2.5)).toBe("2.5");
  });
});

describe("formatDateOnly", () => {
  it("dashes null", () => {
    expect(formatDateOnly(null)).toBe("—");
  });

  it("renders a date", () => {
    expect(formatDateOnly("2026-06-20")).toContain("2026");
  });
});

describe("SUGGESTED_SUPPLIES", () => {
  it("offers the standard hot-tub consumables", () => {
    expect(SUGGESTED_SUPPLIES).toContain("Chlorine granules");
    expect(SUGGESTED_SUPPLIES).toContain("Test strips");
    expect(SUGGESTED_SUPPLIES.length).toBeGreaterThan(5);
  });
});
