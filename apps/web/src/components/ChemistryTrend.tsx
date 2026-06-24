import type { CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { Mono } from "@/components/ui";
import { Sparkline, type SparkPoint } from "@/components/Sparkline";
import { formatDateTime } from "@/lib/format";
import {
  CHEM_THRESHOLDS,
  DEFAULT_SANITIZER_TYPE,
  alkalinityOutOfRange,
  calciumHardnessOutOfRange,
  phOutOfRange,
  sanitizerBand,
  sanitizerLabel,
  sanitizerOutOfRange,
  type SanitizerType,
} from "@/lib/chemistry";

export interface TrendReading {
  recorded_at: string;
  total_alkalinity: number | null;
  ph: number | null;
  calcium_hardness: number | null;
  sanitizer_ppm: number | null;
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
 *  table, with out-of-range points/values flagged. `readings` is newest-first.
 *  `compact` renders only the 3-metric sparkline grid (no card/header/table) —
 *  used by the cross-property /chemistry screen, which supplies its own card. */
export function ChemistryTrend({
  readings,
  compact = false,
  sanitizerType = DEFAULT_SANITIZER_TYPE,
}: {
  readings: TrendReading[];
  compact?: boolean;
  sanitizerType?: SanitizerType;
}) {
  if (readings.length === 0) return null;
  const chrono = [...readings].reverse();
  const sanBand = sanitizerBand(sanitizerType);
  const sanLabel = sanitizerLabel(sanitizerType);

  const alkalinityPts = points(
    chrono,
    (r) => r.total_alkalinity,
    alkalinityOutOfRange
  );
  const phPts = points(chrono, (r) => r.ph, phOutOfRange);
  const hardnessPts = points(
    chrono,
    (r) => r.calcium_hardness,
    calciumHardnessOutOfRange
  );
  const sanitizerPts = points(chrono, (r) => r.sanitizer_ppm, (v) =>
    sanitizerOutOfRange(v, sanitizerType)
  );

  const metrics = (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 16,
      }}
    >
      <Metric
        label="Total Alkalinity"
        unit="ppm"
        pts={alkalinityPts}
        band={{
          min: CHEM_THRESHOLDS.alkalinity.min,
          max: CHEM_THRESHOLDS.alkalinity.max,
        }}
      />
      <Metric
        label="pH"
        pts={phPts}
        band={{ min: CHEM_THRESHOLDS.ph.min, max: CHEM_THRESHOLDS.ph.max }}
      />
      <Metric
        label="Calcium Hardness"
        unit="ppm"
        pts={hardnessPts}
        band={{
          min: CHEM_THRESHOLDS.calciumHardness.min,
          max: CHEM_THRESHOLDS.calciumHardness.max,
        }}
      />
      <Metric
        label={sanLabel}
        unit="ppm"
        pts={sanitizerPts}
        band={{ min: sanBand.min, max: sanBand.max }}
      />
    </div>
  );

  const recent = readings.slice(0, 8);

  const thLabel: CSSProperties = {
    fontFamily: "var(--mono)",
    fontSize: 11,
    fontWeight: 400,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-dim)",
  };
  const table = (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ ...thLabel, textAlign: "left", padding: "6px 0" }}>
            When
          </th>
          <th style={{ ...thLabel, textAlign: "right", padding: "6px 0" }}>
            TA
          </th>
          <th style={{ ...thLabel, textAlign: "right", padding: "6px 0" }}>
            pH
          </th>
          <th style={{ ...thLabel, textAlign: "right", padding: "6px 0" }}>
            CH
          </th>
          <th style={{ ...thLabel, textAlign: "right", padding: "6px 0" }}>
            {sanLabel}
          </th>
        </tr>
      </thead>
      <tbody>
        {recent.map((r, i) => (
          <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
            <td className="small dim" style={{ padding: "8px 0" }}>
              {formatDateTime(r.recorded_at)}
            </td>
            <td style={{ textAlign: "right", padding: "8px 0" }}>
              <Cell
                value={r.total_alkalinity}
                flagged={alkalinityOutOfRange(r.total_alkalinity)}
              />
            </td>
            <td style={{ textAlign: "right", padding: "8px 0" }}>
              <Cell value={r.ph} flagged={phOutOfRange(r.ph)} />
            </td>
            <td style={{ textAlign: "right", padding: "8px 0" }}>
              <Cell
                value={r.calcium_hardness}
                flagged={calciumHardnessOutOfRange(r.calcium_hardness)}
              />
            </td>
            <td style={{ textAlign: "right", padding: "8px 0" }}>
              <Cell
                value={r.sanitizer_ppm}
                flagged={sanitizerOutOfRange(r.sanitizer_ppm, sanitizerType)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Compact (cross-property /chemistry screen): sparklines + the titled
  // readings table, but no outer card/header — the caller supplies the card.
  if (compact) {
    return (
      <>
        {metrics}
        <hr className="divider" />
        {table}
      </>
    );
  }

  return (
    <div className="card pad stack">
      <div className="spread">
        <h3 style={{ fontSize: 17 }}>Water</h3>
        <span className="badge">
          <Icon name="droplet" size={12} /> Chemistry trend
        </span>
      </div>

      {metrics}

      <hr className="divider" />

      {table}
    </div>
  );
}
