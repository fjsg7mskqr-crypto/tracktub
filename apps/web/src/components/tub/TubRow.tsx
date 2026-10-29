import Link from "next/link";
import { tubPath } from "@/lib/app-routes";
import type { TubStatus } from "@/components/tub/tub-status";

const DOT: Record<TubStatus, { color: string; label: string }> = {
  attention: { color: "var(--tt-due)", label: "Needs attention" },
  balanced: { color: "var(--tt-ok)", label: "Balanced at last visit" },
  none: { color: "#3A3F48", label: "No reading yet" },
};

/** One tub on the Tubs list: name, summary line, status dot (spec §4). */
export function TubRow({
  id,
  name,
  subline,
  status,
}: {
  id: string;
  name: string;
  subline: string;
  status: TubStatus;
}) {
  const dot = DOT[status];
  return (
    <Link
      href={tubPath(id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 14,
        minHeight: "var(--tt-tap)",
        borderRadius: "var(--tt-radius-tile)",
        background: "var(--tt-surface)",
        color: "var(--tt-text)",
        textDecoration: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "#1B2A44",
          flex: "none",
        }}
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 600 }}>{name}</span>
        <span style={{ fontSize: 13, color: "var(--tt-text-2)" }}>
          {subline}
        </span>
      </span>
      <span
        role="img"
        aria-label={dot.label}
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: dot.color,
          flex: "none",
        }}
      />
    </Link>
  );
}
