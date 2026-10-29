import { describe, it, expect } from "vitest";
import {
  CARE_DEFAULTS,
  READING_FIELDS,
  READING_TARGETS,
  inRange,
  readingColumn,
} from "@/lib/readings";
import { CLEANING_STEPS } from "@/lib/types";

describe("reading targets (app rebuild, D27)", () => {
  it("orders fields buffer-correct: alkalinity → pH → hardness → chlorine", () => {
    expect(READING_FIELDS).toEqual([
      "total_alkalinity",
      "ph",
      "calcium_hardness",
      "sanitizer_ppm",
    ]);
  });

  it("uses the plan's targets and step sizes", () => {
    const pick = (f: keyof typeof READING_TARGETS) => {
      const { lo, hi, step } = READING_TARGETS[f];
      return { lo, hi, step };
    };
    expect(pick("total_alkalinity")).toEqual({ lo: 80, hi: 120, step: 10 });
    expect(pick("ph")).toEqual({ lo: 7.2, hi: 7.8, step: 0.1 });
    expect(pick("calcium_hardness")).toEqual({ lo: 150, hi: 250, step: 10 });
    expect(pick("sanitizer_ppm")).toEqual({ lo: 1, hi: 3, step: 0.5 });
    expect(READING_TARGETS.ph.decimals).toBe(1);
    expect(READING_TARGETS.total_alkalinity.decimals).toBe(0);
  });

  it("inRange flags out-of-range, in-range and unset values", () => {
    expect(inRange("ph", 7.9)).toBe(false);
    expect(inRange("ph", 7.5)).toBe(true);
    expect(inRange("sanitizer_ppm", null)).toBeNull();
  });

  it("inRange treats the bounds as in range", () => {
    expect(inRange("ph", 7.2)).toBe(true);
    expect(inRange("ph", 7.8)).toBe(true);
    expect(inRange("total_alkalinity", 79)).toBe(false);
  });

  it("readingColumn maps as-found to the existing column and as-left to left_*", () => {
    expect(readingColumn("ph", "found")).toBe("ph");
    expect(readingColumn("ph", "left")).toBe("left_ph");
    expect(readingColumn("sanitizer_ppm", "left")).toBe("left_sanitizer_ppm");
  });

  it("defaults care intervals to drain 90 / filter 60 days", () => {
    expect(CARE_DEFAULTS).toEqual({ drainDays: 90, filterDays: 60 });
  });
});

describe("cleaning step codes", () => {
  it("adds the rebuild's work codes and keeps the existing ones", () => {
    const codes = CLEANING_STEPS.map((s) => s.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "water_topped",
        "wiped",
        "debris_removed",
        "filters_cleaned",
        "reassembled",
        "filter_replaced",
        "drained_refilled",
        "cover_cleaned",
      ])
    );
    const label = (c: string) =>
      CLEANING_STEPS.find((s) => s.code === c)?.label;
    expect(label("filter_replaced")).toBe("Replaced filter");
    expect(label("drained_refilled")).toBe("Drained & refilled");
    expect(label("cover_cleaned")).toBe("Cleaned cover");
  });
});
