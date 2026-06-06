import type { CSSProperties } from "react";

/** The TrackTub mark — a sharp two-tone check (brand/logo/mark-check.svg).
 *  Green short arm = verified; light long arm = the record. Square caps,
 *  flat geometry — the "minimal & sharp" brand register. */
export function Seal({
  size = 64,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  const w = Math.max(4, size * 0.135);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      style={style}
      aria-hidden="true"
    >
      <path
        d="M9 25 L20 36"
        stroke="var(--verified, #34D399)"
        strokeWidth={w}
        strokeLinecap="square"
      />
      <path
        d="M20 36 L40 12"
        stroke="var(--text-hi, #EDEDEF)"
        strokeWidth={w}
        strokeLinecap="square"
      />
    </svg>
  );
}
