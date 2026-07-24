/**
 * A thin range track for one chemistry metric: the full scale as a rounded
 * track, the ideal band tinted a soft green, and a dark ink thumb at the
 * value's position. Labels read "min · ideal lo–hi · max". When no value is
 * set, the thumb is hidden (honest — nothing is asserted).
 *
 * Purely presentational; the caller passes the scale + ideal band from
 * `chemistry.ts` thresholds so nothing is duplicated here.
 */
export function RangeBar({
  scaleMin,
  scaleMax,
  idealMin,
  idealMax,
  value,
  formatLabel = (n) => String(n),
}: {
  scaleMin: number;
  scaleMax: number;
  idealMin: number;
  idealMax: number;
  value: number | null;
  formatLabel?: (n: number) => string;
}) {
  const span = scaleMax - scaleMin || 1;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  const pct = (n: number) => clamp(((n - scaleMin) / span) * 100);

  const bandLeft = pct(idealMin);
  const bandRight = pct(idealMax);
  const thumbPct = value == null ? null : pct(value);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          position: "relative",
          height: 10,
          borderRadius: 999,
          background: "rgba(8, 9, 10, 0.07)",
        }}
      >
        {/* ideal band */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${bandLeft}%`,
            width: `${Math.max(0, bandRight - bandLeft)}%`,
            borderRadius: 999,
            background: "rgba(52, 211, 153, 0.32)",
          }}
        />
        {/* thumb */}
        {thumbPct != null && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: `${thumbPct}%`,
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "var(--field-ink)",
              border: "3px solid var(--field-card)",
              boxShadow: "0 1px 4px rgba(8, 9, 10, 0.28)",
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.02em",
          color: "var(--field-muted)",
        }}
      >
        <span>{formatLabel(scaleMin)}</span>
        <span>
          ideal {formatLabel(idealMin)}–{formatLabel(idealMax)}
        </span>
        <span>{formatLabel(scaleMax)}</span>
      </div>
    </div>
  );
}
