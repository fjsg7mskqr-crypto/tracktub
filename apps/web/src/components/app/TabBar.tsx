"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_TABS, activeTab, type AppTab } from "@/lib/app-routes";

// Inline tab glyphs (kept local to the tab bar).
const GLYPHS: Record<AppTab["href"], React.ReactNode> = {
  "/": <path d="M4 10.5L12 4l8 6.5V20h-5.5v-5.5h-5V20H4z" />,
  "/calendar": (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  "/tubs": <path d="M12 3.5s6 6.4 6 10.4a6 6 0 11-12 0c0-4 6-10.4 6-10.4z" />,
  "/reports": (
    <>
      <path d="M6.5 3.5h7.5l4 4v13h-11.5z" />
      <path d="M13.5 3.5V8h4.5M9.5 12.5h5M9.5 16h5" />
    </>
  ),
};

/**
 * Fixed bottom navigation for the signed-in app: Home · Calendar · Tubs ·
 * Reports. Thumb-reachable (≥ --tt-tap), safe-area aware, active tab flagged
 * with aria-current="page". Green is intentionally absent — it's reserved for
 * success, locked and in-range.
 */
export function TabBar() {
  const current = activeTab(usePathname() ?? "/");

  return (
    <nav
      aria-label="App navigation"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        display: "flex",
        background: "var(--tt-surface)",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {APP_TABS.map((tab) => {
        const isActive = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              minHeight: "var(--tt-tap)",
              padding: "8px 4px",
              textDecoration: "none",
              fontSize: 11,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--tt-text)" : "var(--tt-text-3)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isActive ? "var(--tt-brand)" : "currentColor"}
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {GLYPHS[tab.href]}
            </svg>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
