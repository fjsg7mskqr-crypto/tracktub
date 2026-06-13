import { describe, it, expect } from "vitest";
import {
  BATHER_LOAD_RULE,
  batherLoadActive,
  clarityFlag,
  type TurnoverChem,
} from "@/lib/chemistry-rules";

const NOW = Date.parse("2026-06-12T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

function t(
  hAgo: number,
  sanitizerPpm: number | null = null,
  cloudy = false
): TurnoverChem {
  return { at: hoursAgo(hAgo), sanitizerPpm, cloudy };
}

describe("batherLoadActive", () => {
  const cases: [string, TurnoverChem[], boolean][] = [
    ["no turnovers", [], false],
    ["one recent turnover", [t(2)], false],
    ["two within 48h, latest sanitizer unknown → active", [t(2), t(20)], true],
    [
      "two within 48h, latest low sanitizer → active",
      [t(2, 1), t(20, 1)],
      true,
    ],
    [
      "two within 48h, latest healthy sanitizer (post-shock) → cleared",
      [t(2, 4), t(20, 1)],
      false,
    ],
    ["two but one is older than 48h → inactive", [t(2), t(60)], false],
    ["three within 48h, latest unknown → active", [t(1), t(10), t(40)], true],
  ];

  it.each(cases)("%s", (_label, turnovers, expected) => {
    expect(batherLoadActive(turnovers, NOW)).toBe(expected);
  });

  it("uses the documented constant (2 turnovers / 48h)", () => {
    expect(BATHER_LOAD_RULE.minTurnovers).toBe(2);
    expect(BATHER_LOAD_RULE.windowHours).toBe(48);
  });
});

describe("clarityFlag", () => {
  it("flags low sanitizer with a re-shock action", () => {
    const flag = clarityFlag(t(1, 1));
    expect(flag?.reason).toBe("low_sanitizer");
    expect(flag?.message).toContain("1 ppm");
    expect(flag?.action).toMatch(/re-shock/i);
  });

  it("flags cloudy water when sanitizer is fine", () => {
    const flag = clarityFlag(t(1, 4, true));
    expect(flag?.reason).toBe("cloudy");
  });

  it("prefers the low-sanitizer reason when both apply", () => {
    expect(clarityFlag(t(1, 1, true))?.reason).toBe("low_sanitizer");
  });

  it("returns null for a healthy, clear turnover", () => {
    expect(clarityFlag(t(1, 4, false))).toBeNull();
  });

  it("does not flag when sanitizer was not recorded and water is clear", () => {
    expect(clarityFlag(t(1, null, false))).toBeNull();
  });
});
