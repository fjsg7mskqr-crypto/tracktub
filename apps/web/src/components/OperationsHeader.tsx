import Link from "next/link";

/**
 * Header for the Operations hub. Operations is a multi-module surface: Maintenance,
 * Water & chemistry, Supplies, and Equipment are all live.
 * Mirrors the Team & Insights sub-tab pattern.
 */

type Module = { key: string; label: string; href?: string };

// Order is the founder's: Maintenance, Water & chemistry, Supplies, Equipment.
const MODULES: Module[] = [
  { key: "schedule", label: "Schedule", href: "/operations/schedule" },
  { key: "chemistry", label: "Water & Chemistry", href: "/operations" },
  { key: "supplies", label: "Supplies & Inventory", href: "/operations/supplies" },
  { key: "equipment", label: "Equipment", href: "/operations/equipment" },
];

export function OperationsHeader({
  active,
  readyCount,
  attentionCount,
}: {
  active: string;
  readyCount?: number;
  attentionCount?: number;
}) {
  const total = (readyCount ?? 0) + (attentionCount ?? 0);
  return (
    <div className="pagehead stack" style={{ gap: 12 }}>
      <div className="spread">
        <h1>Operations</h1>
      </div>
      {total > 0 && (
        <div className="row">
          <span className="sub">
            <b>{readyCount}</b> guest-ready
            {attentionCount != null && attentionCount > 0 && (
              <>
                {" · "}
                <b className="t-warn">{attentionCount}</b> need
                {attentionCount === 1 ? "s" : ""} attention
              </>
            )}
          </span>
        </div>
      )}
      <nav className="subtabs">
        {MODULES.map((m) =>
          m.href ? (
            <Link
              key={m.key}
              href={m.href}
              className={active === m.key ? "active" : ""}
            >
              {m.label}
            </Link>
          ) : (
            <span key={m.key} className="soon" aria-disabled="true">
              {m.label}
              <span className="soontag">Soon</span>
            </span>
          )
        )}
      </nav>
    </div>
  );
}
