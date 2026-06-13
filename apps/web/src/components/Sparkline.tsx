export interface SparkPoint {
  value: number;
  flagged?: boolean;
}

/** Minimal dependency-free SVG sparkline with an optional healthy-range band
 *  and per-point flagging (out-of-range points render in the warn color). */
export function Sparkline({
  points,
  width = 240,
  height = 48,
  band,
}: {
  points: SparkPoint[];
  width?: number;
  height?: number;
  band?: { min?: number; max?: number };
}) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, band?.min ?? Infinity);
  const hi = Math.max(...values, band?.max ?? -Infinity);
  const range = hi - lo || 1;
  const pad = 5;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - 2 * pad);
  const y = (v: number) =>
    height - pad - ((v - lo) / range) * (height - 2 * pad);

  const line = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`
    )
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ display: "block", maxWidth: "100%" }}
    >
      {band && band.min != null && band.max != null && (
        <rect
          x={0}
          y={y(band.max)}
          width={width}
          height={Math.max(0, y(band.min) - y(band.max))}
          fill="var(--verified-dim)"
        />
      )}
      <path
        d={line}
        fill="none"
        stroke="var(--brand-blue-2)"
        strokeWidth={1.5}
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.value)}
          r={2.5}
          fill={p.flagged ? "var(--pending)" : "var(--brand-blue-2)"}
        />
      ))}
    </svg>
  );
}
