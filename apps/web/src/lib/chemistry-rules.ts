import { DEFAULT_SANITIZER_TYPE, sanitizerLow } from "./chemistry";
import type { SanitizerType } from "./chemistry";

// Chemistry-aware heuristics (PRD §8.8, issue #100). Sensor-free — they ride on
// data already captured (#99) plus turnover cadence. Every rule is a single
// documented constant so it stays tunable.

/**
 * Bather-load rule: high-frequency / back-to-back stays crash the water between
 * guests. v1 — at least `minTurnovers` locked turnovers within `windowHours`.
 */
export const BATHER_LOAD_RULE = {
  minTurnovers: 2,
  windowHours: 48,
} as const;

const HOUR_MS = 60 * 60 * 1000;

export interface TurnoverChem {
  /** submitted_at_server (ISO). */
  at: string;
  /** sanitizer reading for that turnover, if recorded. */
  sanitizerPpm: number | null;
  /** carries an open `water_cloudy` issue tag. */
  cloudy: boolean;
}

/**
 * The bather-load prompt is active when a property has at least
 * `minTurnovers` locked turnovers inside the trailing `windowHours` AND the
 * most recent turnover hasn't confirmed a healthy sanitizer — i.e. no
 * post-shock reset yet. Logging a fresh turnover whose sanitizer is in range
 * clears the prompt.
 */
export function batherLoadActive(
  turnovers: TurnoverChem[],
  nowMs: number,
  sanitizerType: SanitizerType = DEFAULT_SANITIZER_TYPE
): boolean {
  if (turnovers.length === 0) return false;
  const sorted = [...turnovers].sort((a, b) => b.at.localeCompare(a.at));

  const recentCount = sorted.filter(
    (t) =>
      nowMs - new Date(t.at).getTime() <= BATHER_LOAD_RULE.windowHours * HOUR_MS
  ).length;
  if (recentCount < BATHER_LOAD_RULE.minTurnovers) return false;

  const latest = sorted[0];
  const postShock =
    latest.sanitizerPpm != null &&
    !sanitizerLow(latest.sanitizerPpm, sanitizerType);
  return !postShock;
}

export interface ClarityFlag {
  reason: "low_sanitizer" | "cloudy";
  message: string;
  action: string;
}

/**
 * Water-clarity flag for a single turnover: a `water_cloudy` tag OR a sanitizer
 * reading below threshold raises an open issue with a recommended action.
 */
export function clarityFlag(
  t: TurnoverChem,
  sanitizerType: SanitizerType = DEFAULT_SANITIZER_TYPE
): ClarityFlag | null {
  if (sanitizerLow(t.sanitizerPpm, sanitizerType)) {
    return {
      reason: "low_sanitizer",
      message: `Low sanitizer${t.sanitizerPpm != null ? ` (${t.sanitizerPpm} ppm)` : ""}`,
      action: "Re-shock and retest before the next check-in.",
    };
  }
  if (t.cloudy) {
    return {
      reason: "cloudy",
      message: "Cloudy water flagged",
      action: "Re-shock and retest before the next check-in.",
    };
  }
  return null;
}
