import { describe, it, expect } from "vitest";
import {
  computeInitialStep,
  CAPTURE_STEP_BEFORE,
  CAPTURE_STEP_WATER,
} from "@/lib/capture-v2";

describe("capture resume", () => {
  it("starts at BEFORE when no photos", () => {
    expect(computeInitialStep({ photos: [] })).toBe(CAPTURE_STEP_BEFORE);
  });
  it("advances past BEFORE once the before/full_frame photo is stored", () => {
    const step = computeInitialStep({
      photos: [
        {
          slot: "full_frame",
          phase: "before",
          storagePath: "org/t/before/full_frame",
        },
      ],
    });
    expect(step).toBe(CAPTURE_STEP_WATER);
  });
});
