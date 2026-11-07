// Treatment codes from the older capture flow (turnover → water_reading.treatments).
// The current visit screen doesn't write them, but past records still carry
// them, so record and log views turn codes into labels. Anything else stored
// there (free text) passes through unchanged. Reading targets live in
// `@/lib/readings`.

export const WATER_TREATMENTS = [
  { code: "shock", label: "Shock" },
  { code: "sanitizer", label: "Chlorine / Bromine" },
  { code: "ph_up", label: "pH Up" },
  { code: "ph_down", label: "pH Down" },
  { code: "alkalinity_up", label: "Alkalinity Up" },
  { code: "clarifier", label: "Clarifier" },
] as const;

export function treatmentLabel(code: string): string {
  return WATER_TREATMENTS.find((t) => t.code === code)?.label ?? code;
}
