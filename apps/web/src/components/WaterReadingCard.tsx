import { Icon } from "@/components/Icon";
import { Mono } from "@/components/ui";
import {
  CHEM_THRESHOLDS,
  phOutOfRange,
  sanitizerOutOfRange,
  tempOutOfRange,
  type WaterReadingValues,
} from "@/lib/chemistry";

function Field({
  label,
  value,
  unit,
  flagged,
  hint,
}: {
  label: string;
  value: number | null;
  unit?: string;
  flagged: boolean;
  hint: string;
}) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div className="row" style={{ gap: 6, alignItems: "baseline" }}>
        <Mono
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: flagged ? "var(--pending)" : "var(--text-hi)",
          }}
        >
          {value != null ? value : "—"}
        </Mono>
        {value != null && unit && <span className="small dim">{unit}</span>}
        {flagged && (
          <span className="badge warn" style={{ marginLeft: "auto" }}>
            Out of range
          </span>
        )}
      </div>
      <div className="tiny dim" style={{ marginTop: 2 }}>
        {hint}
      </div>
    </div>
  );
}

/** Renders a water reading (pH / sanitizer / temp) with out-of-range fields
 *  flagged. Used on the turnover detail and the public proof page. */
export function WaterReadingCard({
  reading,
  heading = "Water check",
}: {
  reading: WaterReadingValues;
  heading?: string;
}) {
  return (
    <div className="card pad stack">
      <div className="spread">
        <h3 style={{ fontSize: 17 }}>{heading}</h3>
        <span className="badge">
          <Icon name="droplet" size={12} /> Chemistry
        </span>
      </div>
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}
      >
        <Field
          label="pH"
          value={reading.ph}
          flagged={phOutOfRange(reading.ph)}
          hint={`Target ${CHEM_THRESHOLDS.ph.min}–${CHEM_THRESHOLDS.ph.max}`}
        />
        <Field
          label="Sanitizer"
          value={reading.sanitizer_ppm}
          unit="ppm"
          flagged={sanitizerOutOfRange(reading.sanitizer_ppm)}
          hint={`Target ${CHEM_THRESHOLDS.sanitizerPpm.min}–${CHEM_THRESHOLDS.sanitizerPpm.max} ppm`}
        />
        <Field
          label="Temp"
          value={reading.temp_f}
          unit="°F"
          flagged={tempOutOfRange(reading.temp_f)}
          hint={`Target ≤ ${CHEM_THRESHOLDS.tempF.max}°F`}
        />
      </div>
    </div>
  );
}
