import { describe, it, expect } from "vitest";
import { fieldRangeStatus } from "@/components/field/ChemistryStep";

// fieldRangeStatus must delegate to the tested predicates in `src/lib/chemistry.ts`
// so thresholds stay single-sourced — no thresholds are duplicated here.
describe("fieldRangeStatus", () => {
  it("TA 100 is in range", () =>
    expect(fieldRangeStatus("alkalinity", 100)).toBe("ok"));
  it("TA 200 is out of range", () =>
    expect(fieldRangeStatus("alkalinity", 200)).toBe("out"));
  it("null reads as empty", () =>
    expect(fieldRangeStatus("alkalinity", null)).toBe("empty"));
  it("undefined reads as empty", () =>
    expect(fieldRangeStatus("ph", undefined)).toBe("empty"));

  it("pH 7.4 is in range, 8.4 is out", () => {
    expect(fieldRangeStatus("ph", 7.4)).toBe("ok");
    expect(fieldRangeStatus("ph", 8.4)).toBe("out");
  });

  it("hardness 200 is in range, 50 is out", () => {
    expect(fieldRangeStatus("hardness", 200)).toBe("ok");
    expect(fieldRangeStatus("hardness", 50)).toBe("out");
  });

  it("sanitizer is judged against the property's type band", () => {
    // chlorine band 1–3 ppm: 2 ok, 4 out
    expect(fieldRangeStatus("sanitizer", 2, "chlorine")).toBe("ok");
    expect(fieldRangeStatus("sanitizer", 4, "chlorine")).toBe("out");
    // bromine band 3–5 ppm: 4 ok, 2 out
    expect(fieldRangeStatus("sanitizer", 4, "bromine")).toBe("ok");
    expect(fieldRangeStatus("sanitizer", 2, "bromine")).toBe("out");
  });
});
