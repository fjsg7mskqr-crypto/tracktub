import {
  phOutOfRange,
  sanitizerOutOfRange,
  tempOutOfRange,
} from "@/lib/chemistry";

/** Compact mono chemistry readout (pH / San / Temp) with out-of-range
 *  values flagged. Reused by the dashboard rows and the property history
 *  list — renders the `.creadout` atom. Returns null when there's nothing
 *  to show. */
export function ChemReadout({
  reading,
}: {
  reading: {
    ph: number | null;
    sanitizer_ppm: number | null;
    temp_f: number | null;
  } | null;
}) {
  if (
    !reading ||
    (reading.ph == null &&
      reading.sanitizer_ppm == null &&
      reading.temp_f == null)
  )
    return null;
  const cell = (k: string, v: number | null, bad: boolean, suffix = "") => (
    <span className={bad ? "bad" : ""}>
      <span className="k">{k}</span> <b>{v != null ? `${v}${suffix}` : "—"}</b>
    </span>
  );
  return (
    <div className="creadout">
      {cell("pH", reading.ph, phOutOfRange(reading.ph))}
      {cell(
        "San",
        reading.sanitizer_ppm,
        sanitizerOutOfRange(reading.sanitizer_ppm)
      )}
      {cell("Temp", reading.temp_f, tempOutOfRange(reading.temp_f), "°")}
    </div>
  );
}
