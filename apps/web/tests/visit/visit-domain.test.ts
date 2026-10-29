import { describe, it, expect } from "vitest";
import {
  WORK_CHIPS,
  decodeAdded,
  encodeAdded,
  isPartial,
  missingParts,
  photoKindOf,
  type ReadingValues,
  type VisitPhoto,
} from "@/lib/visit";
import { CLEANING_STEPS } from "@/lib/types";

const reading: ReadingValues = {
  total_alkalinity: 90,
  ph: 7.5,
  calcium_hardness: null,
  sanitizer_ppm: null,
};
const photo = (kind: VisitPhoto["kind"]): VisitPhoto => ({
  id: kind,
  kind,
  storagePath: `x/${kind}`,
  capturedAt: null,
});

describe("visit domain", () => {
  it("encodes and decodes an added product", () => {
    const a = { product: "pH down", amount: "2 oz" };
    expect(encodeAdded(a)).toBe("pH down · 2 oz");
    expect(decodeAdded(encodeAdded(a))).toEqual(a);
    expect(decodeAdded("ph_down")).toEqual({ product: "ph_down", amount: "" });
    expect(encodeAdded({ product: " Shock ", amount: " " })).toBe("Shock");
  });

  it("work chips follow the mockup order and use real step codes", () => {
    expect(WORK_CHIPS.map((c) => c.code)).toEqual([
      "filters_cleaned",
      "wiped",
      "filter_replaced",
      "drained_refilled",
      "water_topped",
      "cover_cleaned",
    ]);
    const codes = new Set(CLEANING_STEPS.map((s) => s.code));
    expect(WORK_CHIPS.every((c) => codes.has(c.code))).toBe(true);
  });

  it("maps stored photo rows to kinds", () => {
    expect(photoKindOf("before", "full_frame")).toBe("before");
    expect(photoKindOf("after", "full_frame")).toBe("after");
    expect(photoKindOf("after", "cover")).toBe("cover");
    expect(photoKindOf("before", "issue")).toBeNull();
  });

  it("lists every missing part of an empty visit, in page order", () => {
    expect(missingParts({ photos: [], found: null, left: null })).toEqual([
      "before photo",
      "reading as found",
      "reading as left",
      "after photo",
      "cover photo",
    ]);
  });

  it("an all-null reading still counts as missing", () => {
    const empty: ReadingValues = {
      total_alkalinity: null,
      ph: null,
      calcium_hardness: null,
      sanitizer_ppm: null,
    };
    expect(missingParts({ photos: [], found: empty, left: null })).toContain(
      "reading as found"
    );
  });

  it("a complete visit is not partial", () => {
    expect(
      isPartial({
        photos: [photo("before"), photo("after"), photo("cover")],
        found: reading,
        left: reading,
      })
    ).toBe(false);
  });
});
