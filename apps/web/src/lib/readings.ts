// Water-reading configuration for the app rebuild (spec §7, D27). One visit
// stores two readings on its single water_reading row: the existing columns are
// the as-found reading, and left_* columns are the as-left reading. Targets are
// for chlorine tubs, in buffer-correct order (alkalinity buffers pH, so it is
// tested first).

export type ReadingKind = "found" | "left";

export type ReadingField =
  "total_alkalinity" | "ph" | "calcium_hardness" | "sanitizer_ppm";

export const READING_FIELDS: readonly ReadingField[] = [
  "total_alkalinity",
  "ph",
  "calcium_hardness",
  "sanitizer_ppm",
] as const;

export const READING_TARGETS: Record<
  ReadingField,
  {
    label: string;
    short: string;
    lo: number;
    hi: number;
    step: number;
    decimals: 0 | 1;
  }
> = {
  total_alkalinity: {
    label: "Alkalinity",
    short: "TA",
    lo: 80,
    hi: 120,
    step: 10,
    decimals: 0,
  },
  ph: { label: "pH", short: "pH", lo: 7.2, hi: 7.8, step: 0.1, decimals: 1 },
  calcium_hardness: {
    label: "Hardness",
    short: "CH",
    lo: 150,
    hi: 250,
    step: 10,
    decimals: 0,
  },
  sanitizer_ppm: {
    label: "Chlorine",
    short: "Cl",
    lo: 1,
    hi: 3,
    step: 0.5,
    decimals: 1,
  },
};

/** Whether a value sits inside its target band (inclusive); null when unset. */
export function inRange(
  field: ReadingField,
  value: number | null
): boolean | null {
  if (value === null) return null;
  const { lo, hi } = READING_TARGETS[field];
  return value >= lo && value <= hi;
}

/** The water_reading column that stores this field for this reading. */
export function readingColumn(field: ReadingField, kind: ReadingKind): string {
  return kind === "left" ? `left_${field}` : field;
}

/** Care intervals used when a tub has none of its own (null on property). */
export const CARE_DEFAULTS: { drainDays: 90; filterDays: 60 } = {
  drainDays: 90,
  filterDays: 60,
};
