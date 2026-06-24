// Water-chemistry thresholds (PRD §8.8). SINGLE SOURCE OF TRUTH — the capture
// hints, the proof/turnover display flags, and the #100 chemistry-aware layer
// all read from here. The spa test set, in buffer-correct order (#170): Total
// Alkalinity 80–120 ppm (tested first — buffers pH) · pH 7.2–7.8 · Calcium
// Hardness 150–250 ppm · Sanitizer (type-aware — see SANITIZER_BANDS) · Temp
// ≤104°F (capture v2 — soft compliance flag above 104). Out-of-range renders as
// `warn`.

// Per-property sanitizer type (#178). A tub runs either chlorine or bromine;
// the healthy residual band differs, so the reading is labelled and flagged
// against the right target band per property.
export type SanitizerType = "chlorine" | "bromine";

export const SANITIZER_TYPES: readonly SanitizerType[] = [
  "chlorine",
  "bromine",
] as const;

export const DEFAULT_SANITIZER_TYPE: SanitizerType = "chlorine";

// Healthy free-sanitizer residual bands (ppm), per type (#178):
//   Chlorine 1–3 ppm · Bromine 3–5 ppm.
export const SANITIZER_BANDS: Record<
  SanitizerType,
  { min: number; max: number }
> = {
  chlorine: { min: 1, max: 3 },
  bromine: { min: 3, max: 5 },
};

const SANITIZER_LABELS: Record<SanitizerType, string> = {
  chlorine: "Chlorine",
  bromine: "Bromine",
};

/** Normalise an untrusted value to a known sanitizer type (default chlorine). */
export function asSanitizerType(value: unknown): SanitizerType {
  return value === "bromine" ? "bromine" : DEFAULT_SANITIZER_TYPE;
}

/** Healthy residual band for a property's sanitizer type. */
export function sanitizerBand(
  type: SanitizerType = DEFAULT_SANITIZER_TYPE
): { min: number; max: number } {
  return SANITIZER_BANDS[type];
}

/** Display name for the sanitizer field, per the property's type. */
export function sanitizerLabel(
  type: SanitizerType = DEFAULT_SANITIZER_TYPE
): string {
  return SANITIZER_LABELS[type];
}

export const CHEM_THRESHOLDS = {
  alkalinity: { min: 80, max: 120 },
  ph: { min: 7.2, max: 7.8 },
  calciumHardness: { min: 150, max: 250 },
  /** @deprecated chlorine band — use `sanitizerBand(type)` for type-awareness (#178). */
  sanitizerPpm: SANITIZER_BANDS.chlorine,
  tempF: { max: 104 },
} as const;

export interface WaterReadingValues {
  total_alkalinity: number | null;
  ph: number | null;
  calcium_hardness: number | null;
  sanitizer_ppm: number | null;
  temp_f?: number | null;
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

export function alkalinityOutOfRange(alk: number | null | undefined): boolean {
  return (
    alk != null &&
    (alk < CHEM_THRESHOLDS.alkalinity.min ||
      alk > CHEM_THRESHOLDS.alkalinity.max)
  );
}

export function phOutOfRange(ph: number | null | undefined): boolean {
  return (
    ph != null && (ph < CHEM_THRESHOLDS.ph.min || ph > CHEM_THRESHOLDS.ph.max)
  );
}

export function calciumHardnessOutOfRange(
  ch: number | null | undefined
): boolean {
  return (
    ch != null &&
    (ch < CHEM_THRESHOLDS.calciumHardness.min ||
      ch > CHEM_THRESHOLDS.calciumHardness.max)
  );
}

/** Below the minimum for the property's sanitizer type — the actionable case
 *  (#100 re-shock prompt). Type defaults to chlorine when unknown (#178). */
export function sanitizerLow(
  ppm: number | null | undefined,
  type: SanitizerType = DEFAULT_SANITIZER_TYPE
): boolean {
  return ppm != null && ppm < sanitizerBand(type).min;
}

export function sanitizerOutOfRange(
  ppm: number | null | undefined,
  type: SanitizerType = DEFAULT_SANITIZER_TYPE
): boolean {
  const band = sanitizerBand(type);
  return ppm != null && (ppm < band.min || ppm > band.max);
}

/** Soft compliance flag — many jurisdictions require logged temp ≤104°F. */
export function tempHigh(temp: number | null | undefined): boolean {
  return temp != null && temp > CHEM_THRESHOLDS.tempF.max;
}

/** True if any provided field is out of range (used to flag a whole reading).
 *  Sanitizer is flagged against the property's type band (#178). */
export function readingHasFlag(
  r: WaterReadingValues,
  sanitizerType: SanitizerType = DEFAULT_SANITIZER_TYPE
): boolean {
  return (
    alkalinityOutOfRange(r.total_alkalinity) ||
    phOutOfRange(r.ph) ||
    calciumHardnessOutOfRange(r.calcium_hardness) ||
    sanitizerOutOfRange(r.sanitizer_ppm, sanitizerType) ||
    tempHigh(r.temp_f)
  );
}

/** True only when at least one numeric field was recorded. */
export function readingHasValues(r: WaterReadingValues): boolean {
  return (
    r.total_alkalinity != null ||
    r.ph != null ||
    r.calcium_hardness != null ||
    r.sanitizer_ppm != null ||
    r.temp_f != null
  );
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
