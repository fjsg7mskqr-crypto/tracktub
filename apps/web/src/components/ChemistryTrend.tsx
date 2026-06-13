import { Icon } from "@/components/Icon";
import { Mono } from "@/components/ui";
import { Sparkline, type SparkPoint } from "@/components/Sparkline";
import { formatDateTime } from "@/lib/format";
import {
  CHEM_THRESHOLDS,
  phOutOfRange,
  sanitizerOutOfRange,
  tempOutOfRange,
} from "@/lib/chemistry";

export interface TrendReading {
  recorded_at: string;
  ph: number | null;
  sanitizer_ppm: number | null;
  temp_f: number | null;
}

function points(
  chrono: TrendReading[],
  pick: (r: TrendReading) => number | null,
  flag: (v: number | null) => boolean
): SparkPoint[] {
  return chrono
    .map((r) => pick(r))
    .filter((v): v is number => v != null)
    .map((value) => ({ value, flagged: flag(value) }));
}

function Metric({
  label,
  pts,
  band,
  unit,
}: {
  label: string;
  pts: SparkPoint[];
  band?: { min?: number; max?: number };
  unit?: string;
}) {
  const latest = pts[pts.length - 1];
  return (
    <div style={{ minWidth: 0 }}>
      <div className="spread" style={{ alignItems: "baseline" }}>
        <span className="label" style={{ marginBottom: 0 }}>
          {label}
        </span>
        {latest && (
          <Mono
            style={{
              color: latest.flagged ? "var(--pending)" : "var(--text-lo)",
            }}
          >
            {latest.value}
            {unit ? <span className="dim"> {unit}</span> : null}
          </Mono>
        )}
      </div>
      <div style={{ marginTop: 6 }}>
        {pts.length >= 2 ? (
          <Sparkline points={pts} band={band} />
        ) : (
          <div className="tiny dim">Need 2+ readings to chart.</div>
        )}
      </div>
    </div>
  );
}

function Cell({ value, flagged }: { value: number | null; flagged: boolean }) {
  if (value == null) return <span className="dim">—</span>;
  return (
    <Mono style={{ color: flagged ? "var(--pending)" : "var(--text-hi)" }}>
      {value}
    </Mono>
  );
}

/** Per-property chemistry trend (issue #100): sparklines + a recent-readings
 *  table, with out-of-range points/values flagged. `readings` is newest-first. */
export function ChemistryTrend({ readings }: { readings: TrendReading[] }) {
  if (readings.length === 0) return null;
  const chrono = [...readings].reverse();

  const phPts = points(chrono, (r) => r.ph, phOutOfRange);
  const sanitizerPts = points(
    chrono,
    (r) => r.sanitizer_ppm,
    sanitizerOutOfRange
  );
  const tempPts = points(chrono, (r) => r.temp_f, tempOutOfRange);
  const recent = readings.slice(0, 8);

  return (
    <div className="card pad stack">
      <div className="spread">
        <h3 style={{ fontSize: 17 }}>Water</h3>
        <span className="badge">
          <Icon name="droplet" size={12} /> Chemistry trend
        </span>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
        }}
      >
        <Metric
          label="pH"
          pts={phPts}
          band={{ min: CHEM_THRESHOLDS.ph.min, max: CHEM_THRESHOLDS.ph.max }}
        />
        <Metric
          label="Sanitizer"
          unit="ppm"
          pts={sanitizerPts}
          band={{
            min: CHEM_THRESHOLDS.sanitizerPpm.min,
            max: CHEM_THRESHOLDS.sanitizerPpm.max,
          }}
        />
        <Metric label="Temp" unit="°F" pts={tempPts} />
      </div>

      <hr className="divider" />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr className="label">
            <th style={{ textAlign: "left", padding: "6px 0" }}>When</th>
            <th style={{ textAlign: "right", padding: "6px 0" }}>pH</th>
            <th style={{ textAlign: "right", padding: "6px 0" }}>Sanitizer</th>
            <th style={{ textAlign: "right", padding: "6px 0" }}>Temp</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
              <td className="small dim" style={{ padding: "8px 0" }}>
                {formatDateTime(r.recorded_at)}
              </td>
              <td style={{ textAlign: "right", padding: "8px 0" }}>
                <Cell value={r.ph} flagged={phOutOfRange(r.ph)} />
              </td>
              <td style={{ textAlign: "right", padding: "8px 0" }}>
                <Cell
                  value={r.sanitizer_ppm}
                  flagged={sanitizerOutOfRange(r.sanitizer_ppm)}
                />
              </td>
              <td style={{ textAlign: "right", padding: "8px 0" }}>
                <Cell value={r.temp_f} flagged={tempOutOfRange(r.temp_f)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
