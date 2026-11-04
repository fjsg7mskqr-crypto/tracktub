import type { Chip as ChipData } from "./home-model";

const TONE: Record<ChipData["tone"] | "info", React.CSSProperties> = {
  alert: { background: "rgba(242,102,94,0.14)", color: "var(--tt-alert-text)" },
  due: { background: "rgba(232,163,61,0.14)", color: "var(--tt-due-text)" },
  // Green only for a verified balanced / all-clear state (brand rule).
  ok: { background: "rgba(52,211,153,0.12)", color: "var(--tt-ok)" },
  muted: { background: "var(--tt-raised)", color: "var(--tt-text-2)" },
  info: { background: "rgba(59,130,246,0.15)", color: "var(--tt-link)" },
};

/** A small status pill: "pH 7.9", "2 open", "Balanced". */
export function Chip({
  text,
  tone,
}: {
  text: string;
  tone: ChipData["tone"] | "info";
}) {
  return (
    <span
      style={{
        ...TONE[tone],
        flex: "none",
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
