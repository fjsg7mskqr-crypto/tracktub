import { Icon } from "@/components/Icon";
import { Mono } from "@/components/ui";
import {
  CHEM_THRESHOLDS,
  alkalinityOutOfRange,
  calciumHardnessOutOfRange,
  phOutOfRange,
  sanitizerOutOfRange,
  tempHigh,
  treatmentLabel,
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

/** Renders a water reading (alkalinity / pH / hardness / sanitizer, in
 *  buffer-correct order) with out-of-range fields flagged. Used on the turnover
 *  detail and the public proof page. */
export function WaterReadingCard({
  reading,
  heading = "Water — as found",
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
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 16,
        }}
      >
        <Field
          label="Total Alkalinity"
          value={reading.total_alkalinity}
          unit="ppm"
          flagged={alkalinityOutOfRange(reading.total_alkalinity)}
          hint={`Target ${CHEM_THRESHOLDS.alkalinity.min}–${CHEM_THRESHOLDS.alkalinity.max} ppm`}
        />
        <Field
          label="pH"
          value={reading.ph}
          flagged={phOutOfRange(reading.ph)}
          hint={`Target ${CHEM_THRESHOLDS.ph.min}–${CHEM_THRESHOLDS.ph.max}`}
        />
        <Field
          label="Calcium Hardness"
          value={reading.calcium_hardness}
          unit="ppm"
          flagged={calciumHardnessOutOfRange(reading.calcium_hardness)}
          hint={`Target ${CHEM_THRESHOLDS.calciumHardness.min}–${CHEM_THRESHOLDS.calciumHardness.max} ppm`}
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
          value={reading.temp_f ?? null}
          unit="°F"
          flagged={tempHigh(reading.temp_f)}
          hint={`Max ${CHEM_THRESHOLDS.tempF.max}°F`}
        />
      </div>

      {((reading.treatments?.length ?? 0) > 0 ||
        reading.treatment_note ||
        reading.balanced) && (
        <div className="stack" style={{ gap: 8 }}>
          {(reading.treatments?.length ?? 0) > 0 && (
            <div>
              <div className="label" style={{ marginBottom: 4 }}>
                Added
              </div>
              <div className="row wrap" style={{ gap: 6 }}>
                {reading.treatments!.map((c) => (
                  <span key={c} className="badge">
                    {treatmentLabel(c)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {reading.treatment_note && (
            <div className="tiny dim">{reading.treatment_note}</div>
          )}
          {reading.balanced && (
            <span className="badge ok" style={{ alignSelf: "flex-start" }}>
              <Icon name="check" size={12} /> Left balanced &amp; guest-ready
            </span>
          )}
        </div>
      )}
    </div>
  );
}
