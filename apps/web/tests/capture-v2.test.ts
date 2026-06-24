import { describe, expect, it } from "vitest";
import {
  CAPTURE_STEP_AFTER_START,
  CAPTURE_STEP_BEFORE,
  CAPTURE_STEP_SUBMIT,
  CAPTURE_STEP_WATER,
  computeInitialStep,
} from "@/lib/capture-v2";

describe("computeInitialStep", () => {
  it("starts at before when no photos exist", () => {
    expect(computeInitialStep({ photos: [] })).toBe(CAPTURE_STEP_BEFORE);
  });

  it("starts at water after before full-frame only", () => {
    expect(
      computeInitialStep({
        photos: [
          {
            slot: "full_frame",
            phase: "before",
            storagePath: "org/t/before/full_frame",
          },
        ],
      })
    ).toBe(CAPTURE_STEP_WATER);
  });

  it("lands on first incomplete after slot when some after photos exist", () => {
    expect(
      computeInitialStep({
        photos: [
          {
            slot: "full_frame",
            phase: "before",
            storagePath: "org/t/before/full_frame",
          },
          {
            slot: "water_level",
            phase: "after",
            storagePath: "org/t/after/water_level",
          },
          {
            slot: "full_frame",
            phase: "after",
            storagePath: "org/t/after/full_frame",
          },
        ],
      })
    ).toBe(CAPTURE_STEP_AFTER_START + 2);
  });

  it("lands on submit when all guided after slots are captured", () => {
    expect(
      computeInitialStep({
        photos: [
          {
            slot: "full_frame",
            phase: "before",
            storagePath: "org/t/before/full_frame",
          },
          {
            slot: "water_level",
            phase: "after",
            storagePath: "org/t/after/water_level",
          },
          {
            slot: "full_frame",
            phase: "after",
            storagePath: "org/t/after/full_frame",
          },
          { slot: "cover", phase: "after", storagePath: "org/t/after/cover" },
        ],
      })
    ).toBe(CAPTURE_STEP_SUBMIT);
  });
});
