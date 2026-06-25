import {
  DEFAULT_SANITIZER_TYPE,
  alkalinityOutOfRange,
  calciumHardnessOutOfRange,
  phOutOfRange,
  sanitizerOutOfRange,
  type SanitizerType,
} from "@/lib/chemistry";

/** Compact mono chemistry readout (`.creadout` atom) in buffer-correct order
 *  (TA / pH / Hardness / Sanitizer) with out-of-range values flagged. Shared by
 *  the dashboard rows, the property history list, and the cross-property
 *  /operations overview so all read identically. Renders nothing when there's no
 *  reading to show. */
export function ChemReadout({
  reading,
  sanitizerType = DEFAULT_SANITIZER_TYPE,
}: {
  reading: {
    total_alkalinity: number | null;
    ph: number | null;
    calcium_hardness: number | null;
    sanitizer_ppm: number | null;
  } | null;
  sanitizerType?: SanitizerType;
}) {
  if (
    !reading ||
    (reading.total_alkalinity == null &&
      reading.ph == null &&
      reading.calcium_hardness == null &&
      reading.sanitizer_ppm == null)
  )
    return null;
  const cell = (k: string, v: number | null, bad: boolean, suffix = "") => (
    <span className={bad ? "bad" : ""}>
      <span className="k">{k}</span> <b>{v != null ? `${v}${suffix}` : "—"}</b>
    </span>
  );
  return (
    <div className="creadout">
      {cell(
        "TA",
        reading.total_alkalinity,
        alkalinityOutOfRange(reading.total_alkalinity)
      )}
      {cell("pH", reading.ph, phOutOfRange(reading.ph))}
      {cell(
        "CH",
        reading.calcium_hardness,
        calciumHardnessOutOfRange(reading.calcium_hardness)
      )}
      {cell(
        "San",
        reading.sanitizer_ppm,
        sanitizerOutOfRange(reading.sanitizer_ppm, sanitizerType)
      )}
    </div>
  );
}
