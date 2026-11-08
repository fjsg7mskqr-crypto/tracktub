import { describe, it, expect } from "vitest";
import { treatmentLabel } from "@/lib/chemistry";

describe("treatmentLabel", () => {
  it("labels a stored treatment code", () => {
    expect(treatmentLabel("ph_down")).toBe("pH Down");
    expect(treatmentLabel("alkalinity_up")).toBe("Alkalinity Up");
  });

  it("passes free text through unchanged", () => {
    expect(treatmentLabel("pH down 2 oz")).toBe("pH down 2 oz");
  });
});
