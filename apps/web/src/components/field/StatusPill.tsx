import type { RangeStatus } from "@/components/field/ChemistryStep";

/**
 * A single status pill for one chemistry metric. Brand rule: **green
 * (`--field-ok`) is used ONLY for the in-range "ok" state** — never as an action
 * or decoration. Out-of-range reads in amber ink (attention, not alarm) and the
 * unset state reads in muted grey. The pill states what was *measured*, it never
 * claims the software "verified" anything.
 */
export function StatusPill({ status }: { status: RangeStatus }) {
  const config = {
    ok: {
      label: "In range",
      fg: "#0f7a52",
      bg: "rgba(52, 211, 153, 0.16)",
      border: "rgba(52, 211, 153, 0.4)",
    },
    out: {
      label: "Out of range",
      fg: "#8a5a00",
      bg: "rgba(232, 163, 61, 0.16)",
      border: "rgba(232, 163, 61, 0.42)",
    },
    empty: {
      label: "Not set yet",
      fg: "var(--field-muted)",
      bg: "rgba(8, 9, 10, 0.05)",
      border: "rgba(8, 9, 10, 0.1)",
    },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        alignSelf: "flex-start",
        padding: "7px 14px",
        borderRadius: 999,
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.fg,
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "currentColor",
          opacity: status === "empty" ? 0.5 : 1,
        }}
      />
      {config.label}
    </span>
  );
}
