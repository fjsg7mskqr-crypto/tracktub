import { FieldButton } from "@/components/field/FieldButton";
import { startFieldTurnoverAction } from "@/lib/field/actions";
import { timeAgo } from "@/lib/format";
import type { TodayCard } from "@/lib/field/today";

/**
 * A single tub's Today card in the "Water" style — white card on the soft
 * blue-grey ground, serif property name, a quiet last-visit line, and one
 * thumb-reachable blue action. Shows "Resume turnover" when a draft is in
 * progress, otherwise "Start turnover". Submitting posts to the existing,
 * access-checked draft action and lands on /field/turnover/<id>.
 */
export function TubCard({ card }: { card: TodayCard }) {
  const resuming = card.inProgressTurnoverId != null;
  const lastLine = card.lastTurnoverAt
    ? `Last turnover ${timeAgo(card.lastTurnoverAt)}`
    : "No turnovers yet";

  return (
    <article
      style={{
        background: "var(--field-card)",
        borderRadius: 18,
        border: "1px solid rgba(8, 9, 10, 0.06)",
        boxShadow: "0 1px 2px rgba(8, 9, 10, 0.04)",
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h2
          style={{
            fontFamily: "var(--field-serif)",
            fontSize: 24,
            fontWeight: 600,
            lineHeight: 1.15,
            margin: 0,
            color: "var(--field-ink)",
            wordBreak: "break-word",
          }}
        >
          {card.propertyName}
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.4,
            color: "var(--field-muted)",
          }}
        >
          {resuming ? (
            <span style={{ color: "var(--field-accent)", fontWeight: 600 }}>
              Turnover in progress
            </span>
          ) : (
            lastLine
          )}
        </p>
      </div>

      <form action={startFieldTurnoverAction}>
        <input type="hidden" name="propertyId" value={card.propertyId} />
        {card.inProgressTurnoverId && (
          <input
            type="hidden"
            name="turnoverId"
            value={card.inProgressTurnoverId}
          />
        )}
        <FieldButton type="submit">
          {resuming ? "Resume turnover" : "Start turnover"}
        </FieldButton>
      </form>
    </article>
  );
}
