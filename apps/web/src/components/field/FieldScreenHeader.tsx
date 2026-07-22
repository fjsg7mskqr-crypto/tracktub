import type { ReactNode } from "react";

/**
 * The shared "Water"-style screen header — a small mono uppercase eyebrow, a
 * serif display title, and an optional muted hint. Every capture screen in the
 * field flow opens with this block, so it lives here once instead of being
 * hand-rolled per screen (CaptureAnchor, ChemistryStep, finish).
 */
export function FieldScreenHeader({
  eyebrow,
  title,
  hint,
}: {
  eyebrow: string;
  title: string;
  hint?: ReactNode;
}) {
  return (
    <header style={{ display: "grid", gap: 8 }}>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--field-muted)",
          margin: 0,
        }}
      >
        {eyebrow}
      </p>
      <h1
        style={{
          fontFamily: "var(--field-serif)",
          fontSize: 30,
          fontWeight: 600,
          lineHeight: 1.12,
          margin: 0,
          color: "var(--field-ink)",
        }}
      >
        {title}
      </h1>
      {hint != null && (
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--field-muted)",
            margin: 0,
          }}
        >
          {hint}
        </p>
      )}
    </header>
  );
}
