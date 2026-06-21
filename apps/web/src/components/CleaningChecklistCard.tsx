import { Icon } from "@/components/Icon";
import { CLEANING_STEPS, type CleaningStepCode } from "@/lib/types";

/** Read-only display of completed cleaning checklist steps (capture v2). */
export function CleaningChecklistCard({
  steps,
}: {
  steps: CleaningStepCode[] | string[] | null | undefined;
}) {
  const completed = new Set(steps ?? []);
  const items = CLEANING_STEPS.filter((s) => completed.has(s.code));
  if (items.length === 0) return null;

  return (
    <div className="card pad stack">
      <div className="spread">
        <h3 style={{ fontSize: 17 }}>Cleaning checklist</h3>
        <span className="badge ok">
          <Icon name="check" size={12} /> {items.length} completed
        </span>
      </div>
      <ul
        className="stack"
        style={{ gap: 8, margin: 0, padding: 0, listStyle: "none" }}
      >
        {items.map((s) => (
          <li key={s.code} className="row" style={{ gap: 8 }}>
            <Icon name="check" size={14} style={{ color: "var(--verified)" }} />
            <span className="small">{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
