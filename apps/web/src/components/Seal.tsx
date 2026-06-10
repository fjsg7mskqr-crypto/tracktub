import type { CSSProperties } from "react";

/** The TrackTub mark — a verified check over a hot-tub waterline.
 *  White/ink check = the record; blue wave = the tub. Square caps, sharp
 *  geometry. This is the small-size recut (one bold wave) tuned for UI; the
 *  full mark + lockups live in /branding/. Colors are theme-driven:
 *  check = --text-hi, water = --brand. */
export function Seal({
  size = 64,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <g transform="translate(-2 3.5)">
        <path
          d="M10 44 q8 -5 16 0 t16 0 t16 0"
          stroke="var(--brand, #3B82F6)"
          strokeWidth={4}
          fill="none"
        />
        <path
          d="M16 23 L27 34"
          stroke="var(--text-hi, #EDEDEF)"
          strokeWidth={8}
          strokeLinecap="square"
        />
        <path
          d="M27 34 L50 8"
          stroke="var(--text-hi, #EDEDEF)"
          strokeWidth={8}
          strokeLinecap="square"
        />
      </g>
    </svg>
  );
}
