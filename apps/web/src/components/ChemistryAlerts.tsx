import { Icon } from "@/components/Icon";
import { Note } from "@/components/ui";
import type { ClarityFlag } from "@/lib/chemistry-rules";

/** Surfaces the chemistry-aware prompts (issue #100): the bather-load
 *  reminder and water-clarity flags, each with a recommended action. Renders
 *  nothing when the water's fine. */
export function ChemistryAlerts({
  batherLoad,
  flags,
}: {
  batherLoad: boolean;
  flags: ClarityFlag[];
}) {
  if (!batherLoad && flags.length === 0) return null;

  return (
    <div className="stack" style={{ gap: 8 }}>
      {batherLoad && (
        <Note variant="warn">
          <div className="row" style={{ gap: 9, alignItems: "flex-start" }}>
            <Icon
              name="droplet"
              size={16}
              style={{ flex: "none", marginTop: 1, color: "var(--pending)" }}
            />
            <span>
              <strong>Shock the tub before the next check-in.</strong>{" "}
              Back-to-back stays burn through sanitizer faster than normal
              turnover.
            </span>
          </div>
        </Note>
      )}
      {flags.map((flag, i) => (
        <Note variant="warn" key={i}>
          <div className="row" style={{ gap: 9, alignItems: "flex-start" }}>
            <Icon
              name="alert"
              size={16}
              style={{ flex: "none", marginTop: 1, color: "var(--pending)" }}
            />
            <span>
              <strong>{flag.message}.</strong> {flag.action}
            </span>
          </div>
        </Note>
      ))}
    </div>
  );
}
