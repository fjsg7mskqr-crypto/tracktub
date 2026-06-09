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
      <g transform="translate(-1 1.25)">
        <path
          d="M9 42 q8 -5.5 16 0 t16 0 t16 0"
          stroke="var(--brand, #3B82F6)"
          strokeWidth={4}
          fill="none"
        />
        <path
          d="M15 29 L27 41"
          stroke="var(--text-hi, #EDEDEF)"
          strokeWidth={8}
          strokeLinecap="square"
        />
        <path
          d="M27 41 L50 14"
          stroke="var(--text-hi, #EDEDEF)"
          strokeWidth={8}
          strokeLinecap="square"
        />
      </g>
    </svg>
  );
}
