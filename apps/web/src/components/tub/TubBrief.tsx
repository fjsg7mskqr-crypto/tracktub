import type { BriefTile } from "@/components/tub/brief";
import { SectionLabel } from "@/components/tub/SectionLabel";

/** "Before you go in": the four brief tiles (spec §5.2, mockup Tub). */
export function TubBrief({ tiles }: { tiles: BriefTile[] }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <SectionLabel>Before you go in</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {tiles.map((t) => (
          <div
            key={t.label}
            style={{
              background: "var(--tt-surface)",
              borderRadius: "var(--tt-radius-tile)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color:
                  t.tone === "due" ? "var(--tt-due-text)" : "var(--tt-text)",
              }}
            >
              {t.value}
            </span>
            <span style={{ fontSize: 14, color: "#C4C8CF" }}>{t.label}</span>
            {t.note && (
              <span style={{ fontSize: 12, color: "var(--tt-text-3)" }}>
                {t.note}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
