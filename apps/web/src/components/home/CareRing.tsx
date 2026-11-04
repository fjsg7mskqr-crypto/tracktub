import type { Ring } from "./home-model";

const STROKE: Record<Ring["tone"], string> = {
  blue: "var(--tt-brand)",
  amber: "var(--tt-due)",
  red: "var(--tt-alert)",
  none: "transparent",
};
const TEXT: Record<Ring["tone"], string> = {
  blue: "var(--tt-text)",
  amber: "var(--tt-due-text)",
  red: "var(--tt-alert-text)",
  none: "var(--tt-text-3)",
};

/**
 * Care ring (status board): a circle that empties toward the next drain, with
 * the days left in the centre. Blue normally, amber when close, red overdue.
 */
export function CareRing({ ring, size = 46 }: { ring: Ring; size?: number }) {
  const r = 19;
  const c = 2 * Math.PI * r;
  const text =
    ring.days === null
      ? "—"
      : ring.days < 0
        ? `+${-ring.days}d`
        : `${ring.days}d`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 46 46"
      role="img"
      aria-label={ring.label}
      style={{ flex: "none" }}
    >
      <circle
        cx="23"
        cy="23"
        r={r}
        fill="none"
        stroke="var(--tt-raised)"
        strokeWidth="5"
      />
      {ring.tone === "red" ? (
        <circle
          cx="23"
          cy="23"
          r={r}
          fill="none"
          stroke={STROKE.red}
          strokeWidth="2"
          strokeDasharray="3 4"
        />
      ) : (
        ring.fraction > 0 && (
          <circle
            cx="23"
            cy="23"
            r={r}
            fill="none"
            stroke={STROKE[ring.tone]}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(2, ring.fraction * c)} ${c}`}
            transform="rotate(-90 23 23)"
          />
        )
      )}
      <text
        x="23"
        y="27"
        textAnchor="middle"
        fontSize="11.5"
        fontWeight="600"
        fill={TEXT[ring.tone]}
      >
        {text}
      </text>
    </svg>
  );
}
