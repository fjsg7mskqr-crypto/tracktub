import { describe, it, expect } from "vitest";
import {
  SANITIZER_BANDS,
  asSanitizerType,
  sanitizerBand,
  sanitizerLabel,
  sanitizerLow,
  sanitizerOutOfRange,
} from "@/lib/chemistry";

describe("sanitizer type bands (#178)", () => {
  it("uses the issue's bands: chlorine 1–3, bromine 3–5", () => {
    expect(SANITIZER_BANDS.chlorine).toEqual({ min: 1, max: 3 });
    expect(SANITIZER_BANDS.bromine).toEqual({ min: 3, max: 5 });
  });

  it("sanitizerBand defaults to chlorine when unspecified", () => {
    expect(sanitizerBand()).toEqual({ min: 1, max: 3 });
    expect(sanitizerBand("bromine")).toEqual({ min: 3, max: 5 });
  });

  it("labels the field per type", () => {
    expect(sanitizerLabel("chlorine")).toBe("Chlorine");
    expect(sanitizerLabel("bromine")).toBe("Bromine");
    expect(sanitizerLabel()).toBe("Chlorine");
  });
});

describe("asSanitizerType", () => {
  it("passes through known values", () => {
    expect(asSanitizerType("chlorine")).toBe("chlorine");
    expect(asSanitizerType("bromine")).toBe("bromine");
  });

  it("falls back to chlorine for unknown/null", () => {
    expect(asSanitizerType(null)).toBe("chlorine");
    expect(asSanitizerType(undefined)).toBe("chlorine");
    expect(asSanitizerType("salt")).toBe("chlorine");
  });
});

describe("sanitizerLow / sanitizerOutOfRange are type-aware", () => {
  it("2 ppm is in-range for chlorine, low/out for bromine", () => {
    expect(sanitizerLow(2, "chlorine")).toBe(false);
    expect(sanitizerOutOfRange(2, "chlorine")).toBe(false);
    expect(sanitizerLow(2, "bromine")).toBe(true);
    expect(sanitizerOutOfRange(2, "bromine")).toBe(true);
  });

  it("4 ppm is high/out for chlorine, in-range for bromine", () => {
    expect(sanitizerOutOfRange(4, "chlorine")).toBe(true);
    expect(sanitizerLow(4, "chlorine")).toBe(false);
    expect(sanitizerOutOfRange(4, "bromine")).toBe(false);
  });

  it("treats null/undefined as not flagged", () => {
    expect(sanitizerLow(null, "chlorine")).toBe(false);
    expect(sanitizerOutOfRange(undefined, "bromine")).toBe(false);
  });

  it("defaults to chlorine when no type is given", () => {
    expect(sanitizerOutOfRange(0.5)).toBe(true);
    expect(sanitizerOutOfRange(2)).toBe(false);
  });
});
