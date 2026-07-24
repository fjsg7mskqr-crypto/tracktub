import { describe, it, expect } from "vitest";
import { finishSummaryLines } from "@/components/field/FinishProof";

describe("finishSummaryLines", () => {
  it("states measured/attested facts, never 'verified guest-ready'", () => {
    const lines = finishSummaryLines(
      { alkalinity: 100, ph: 7.4, calcium_hardness: 200, sanitizer_ppm: 3 } as never,
      { balanced: true } as never
    );
    expect(lines.join(" ")).toMatch(/marked balanced/i);
    expect(lines.join(" ").toLowerCase()).not.toContain("verified guest-ready");
  });

  it("reports each measured reading as as-found, never corrected", () => {
    const lines = finishSummaryLines(
      {
        total_alkalinity: 120,
        ph: 7.6,
        calcium_hardness: 250,
        sanitizer_ppm: 4,
        treatments: [],
        treatment_note: null,
      } as never,
      { balanced: false } as never
    );
    const joined = lines.join(" ");
    expect(joined).toMatch(/TA 120 ppm as-found/i);
    expect(joined).toMatch(/pH 7\.6 as-found/i);
    expect(joined).toMatch(/Hardness 250 ppm as-found/i);
    expect(joined).toMatch(/Sanitizer 4 ppm as-found/i);
    // never overstates when the tech did not attest
    expect(joined.toLowerCase()).not.toContain("marked balanced");
    expect(joined.toLowerCase()).not.toContain("verified guest-ready");
    expect(joined.toLowerCase()).not.toContain("guest-ready");
  });

  it("lists recorded treatments as the tech's actions, not claims", () => {
    const lines = finishSummaryLines(
      {
        total_alkalinity: null,
        ph: null,
        calcium_hardness: null,
        sanitizer_ppm: null,
        treatments: ["shock"],
        treatment_note: "2 caps of shock",
      } as never,
      { balanced: true } as never
    );
    const joined = lines.join(" ").toLowerCase();
    expect(joined).toContain("added");
    expect(joined).toContain("2 caps of shock");
    // honest-evidence: the app timestamps + preserves; it never vouches
    expect(joined).not.toContain("verified guest-ready");
  });

  it("returns no reading lines when nothing was measured", () => {
    const lines = finishSummaryLines(null as never, { balanced: false } as never);
    expect(lines.some((l) => /as-found/i.test(l))).toBe(false);
  });
});
