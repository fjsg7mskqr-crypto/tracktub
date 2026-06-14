import {
  phOutOfRange,
  sanitizerOutOfRange,
  tempOutOfRange,
} from "@/lib/chemistry";

/** Compact mono pH/San/Temp readout (`.creadout` atom) shared by the dashboard
 *  rows and the cross-property /chemistry overview, so both read identically.
 *  Renders nothing when there's no reading to show. */
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
