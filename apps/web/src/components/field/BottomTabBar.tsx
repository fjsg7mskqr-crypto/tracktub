import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

export type FieldTab = "today" | "tubs" | "history" | "more";

type TabDef = { key: FieldTab; label: string; href: string; icon: IconName };

const TABS: TabDef[] = [
  { key: "today", label: "Today", href: "/field/today", icon: "gauge" },
  { key: "tubs", label: "Tubs", href: "/field/tubs", icon: "droplet" },
  { key: "history", label: "History", href: "/field/history", icon: "file" },
  { key: "more", label: "More", href: "/field/more", icon: "grid" },
];

/**
 * Fixed bottom-tab navigation for the mobile field section. Four thumb-reachable
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
