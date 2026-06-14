// Water-chemistry thresholds (PRD §8.8). SINGLE SOURCE OF TRUTH — the capture
// hints, the proof/turnover display flags, and the #100 chemistry-aware layer
// all read from here. Defaults: pH 7.2–7.8 · chlorine 3–5 ppm (bromine 4–6) ·
// temp ≤ 104°F. Out-of-range renders as a `warn`.

export const CHEM_THRESHOLDS = {
  ph: { min: 7.2, max: 7.8 },
  sanitizerPpm: { min: 3, max: 5 }, // chlorine; bromine runs 4–6
  tempF: { max: 104 },
} as const;

export interface WaterReadingValues {
  ph: number | null;
  sanitizer_ppm: number | null;
  temp_f: number | null;
  /** Chemicals added at the turnover (codes — see WATER_TREATMENTS). */
  treatments?: string[] | null;
  /** Free-text amounts / custom treatments. */
  treatment_note?: string | null;
  /** Tech attestation the water was left balanced / guest-ready. */
  balanced?: boolean | null;
}

// What the tech ADDED — preset chips for the common cases; a free-text note
// (treatment_note) covers anything custom. The reading itself is "as found".
export const WATER_TREATMENTS = [
  { code: "shock", label: "Shock" },
  { code: "sanitizer", label: "Chlorine / Bromine" },
  { code: "ph_up", label: "pH Up" },
  { code: "ph_down", label: "pH Down" },
  { code: "alkalinity_up", label: "Alkalinity Up" },
  { code: "clarifier", label: "Clarifier" },
] as const;

export type TreatmentCode = (typeof WATER_TREATMENTS)[number]["code"];

export function treatmentLabel(code: string): string {
  return WATER_TREATMENTS.find((t) => t.code === code)?.label ?? code;
}

export function phOutOfRange(ph: number | null | undefined): boolean {
  return (
    ph != null && (ph < CHEM_THRESHOLDS.ph.min || ph > CHEM_THRESHOLDS.ph.max)
  );
}

/** Below the minimum — the actionable case (#100 re-shock prompt). */
export function sanitizerLow(ppm: number | null | undefined): boolean {
  return ppm != null && ppm < CHEM_THRESHOLDS.sanitizerPpm.min;
}

export function sanitizerOutOfRange(ppm: number | null | undefined): boolean {
  return (
    ppm != null &&
    (ppm < CHEM_THRESHOLDS.sanitizerPpm.min ||
      ppm > CHEM_THRESHOLDS.sanitizerPpm.max)
  );
}

export function tempOutOfRange(tempF: number | null | undefined): boolean {
  return tempF != null && tempF > CHEM_THRESHOLDS.tempF.max;
}

/** True if any provided field is out of range (used to flag a whole reading). */
export function readingHasFlag(r: WaterReadingValues): boolean {
  return (
    phOutOfRange(r.ph) ||
    sanitizerOutOfRange(r.sanitizer_ppm) ||
    tempOutOfRange(r.temp_f)
  );
}

/** True only when at least one numeric field was recorded. */
export function readingHasValues(r: WaterReadingValues): boolean {
  return r.ph != null || r.sanitizer_ppm != null || r.temp_f != null;
}

/** True when the reading carries anything worth showing — a number, a
 *  treatment, a note, or the balanced attestation. */
export function readingHasContent(r: WaterReadingValues): boolean {
  return (
    readingHasValues(r) ||
    (r.treatments?.length ?? 0) > 0 ||
    !!r.treatment_note ||
    !!r.balanced
  );
}
