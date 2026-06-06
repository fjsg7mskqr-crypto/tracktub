import type { CSSProperties, ReactNode } from "react";

export type IconName =
  | "camera"
  | "droplet"
  | "gauge"
  | "shield"
  | "check"
  | "alert"
  | "share"
  | "lock"
  | "link"
  | "pin"
  | "plus"
  | "user"
  | "grid"
  | "chart"
  | "file"
  | "sparkle"
  | "reset"
  | "chevron"
  | "waves";

const PATHS: Record<IconName, ReactNode> = {
  camera: (
    <>
      <path d="M3 8.5A2 2 0 0 1 5 6.5h1.4l.9-1.6A1.5 1.5 0 0 1 8.6 4h6.8a1.5 1.5 0 0 1 1.3.9l.9 1.6H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  droplet: <path d="M12 3.4c3 3.9 5.6 6.5 5.6 9.6a5.6 5.6 0 0 1-11.2 0c0-3.1 2.6-5.7 5.6-9.6z" />,
  gauge: (
    <>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="M12 13.2l3.6-2.6" />
      <circle cx="12" cy="13.2" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  shield: <path d="M12 3l7 2.5v5.6c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V5.5z" />,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  alert: (
    <>
      <path d="M12 4.5l8.6 14.8H3.4z" />
      <path d="M12 10v4.2" />
      <path d="M12 17.4h.01" />
    </>
  ),
  share: (
    <>
      <path d="M7 17L17 7" />
      <path d="M9 7h8v8" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  link: (
    <>
      <path d="M9.6 14.4l4.8-4.8" />
      <path d="M8 12l-1.8 1.8a3.2 3.2 0 0 0 4.5 4.5L12.5 16" />
      <path d="M16 12l1.8-1.8a3.2 3.2 0 0 0-4.5-4.5L11.5 8" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-5.5" />
      <path d="M12 20V8" />
      <path d="M17 20v-9" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.5h7l5 5V20A1.5 1.5 0 0 1 16.5 21.5h-9A1.5 1.5 0 0 1 6 20z" />
      <path d="M13 3.5V8.5h5" />
    </>
  ),
  sparkle: <path d="M12 4l1.7 4.6L18 10l-4.3 1.4L12 16l-1.7-4.6L6 10l4.3-1.4z" />,
  reset: (
    <>
      <path d="M19.5 8.5A7 7 0 1 0 20.8 14" />
      <path d="M20.5 4v4.5H16" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  waves: (
    <>
      <path d="M3 8c2-1.7 3.6-1.7 5.6 0s3.6 1.7 5.6 0 3.6-1.7 5.6 0" />
      <path d="M3 13c2-1.7 3.6-1.7 5.6 0s3.6 1.7 5.6 0 3.6-1.7 5.6 0" />
      <path d="M3 18c2-1.7 3.6-1.7 5.6 0s3.6 1.7 5.6 0 3.6-1.7 5.6 0" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  stroke = 1.6,
  style,
  className,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
