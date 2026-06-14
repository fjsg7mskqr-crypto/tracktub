import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared header for the combined "Team & Insights" area. Both `/team` and
 * `/insights` keep their own routes (deep-linkable, server-rendered) but share
 * this title + tab bar so they read as one operator surface — matching the
 * single "Team & Insights" sidebar entry.
 */
export function TeamInsightsHeader({
  active,
  actions,
}: {
  active: "team" | "insights";
  actions?: ReactNode;
}) {
  return (
    <div className="pagehead stack" style={{ gap: 12 }}>
      <div className="spread">
        <h1>Team &amp; Insights</h1>
        {actions}
      </div>
      <nav className="subtabs">
        <Link href="/team" className={active === "team" ? "active" : ""}>
          Team
        </Link>
        <Link href="/insights" className={active === "insights" ? "active" : ""}>
          Insights
        </Link>
      </nav>
    </div>
  );
}
