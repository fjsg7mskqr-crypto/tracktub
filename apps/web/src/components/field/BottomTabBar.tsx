import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

export type FieldTab = "today";

type TabDef = { key: FieldTab; label: string; href: string; icon: IconName };

/**
 * Only routes that EXIST may appear here — `tests/nav-route-coverage.test.ts`
 * enforces it. Tubs / History / More were advertised from July 2026 with no
 * routes behind them and 404'd in production for six weeks; they were removed
 * on 2026-09-03 rather than stubbed, since the whole `/field` section is
 * replaced in phase 2 of the app surface rebuild.
 */
const TABS: TabDef[] = [
  { key: "today", label: "Today", href: "/field/today", icon: "gauge" },
];

/**
 * Fixed bottom-tab navigation for the mobile field section. Thumb-reachable
 * targets (≥44px), safe-area aware, active tab flagged with aria-current="page".
 * Green is intentionally absent — chrome uses ink/muted/accent only.
 */
export function BottomTabBar({ active }: { active: FieldTab }) {
  return (
    <nav
      aria-label="Field navigation"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        display: "flex",
        background: "var(--field-card)",
        borderTop: "1px solid rgba(8, 9, 10, 0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              minHeight: 56,
              padding: "8px 4px",
              textDecoration: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: isActive ? 600 : 500,
              letterSpacing: "0.01em",
              color: isActive ? "var(--field-accent)" : "var(--field-muted)",
            }}
          >
            <Icon name={tab.icon} size={22} stroke={isActive ? 2 : 1.6} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
