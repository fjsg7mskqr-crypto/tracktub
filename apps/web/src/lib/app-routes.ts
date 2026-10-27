/**
 * Route contract for the signed-in app (app rebuild, 2026-10-27). Every lane
 * builds links through these helpers so paths change in one place.
 *
 * Every href here must resolve to a real page — `tests/nav-route-coverage.test.ts`
 * enforces it.
 */

export type AppTab = {
  href: "/" | "/calendar" | "/tubs" | "/reports";
  label: "Home" | "Calendar" | "Tubs" | "Reports";
};

/** Bottom tabs, in display order. */
export const APP_TABS: readonly AppTab[] = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tubs", label: "Tubs" },
  { href: "/reports", label: "Reports" },
];

/**
 * The tab a pathname belongs to: the tab itself or anything under it
 * ("/tubs/abc" → "/tubs"). Screens outside the tab set (a visit, a record)
 * return null.
 */
export function activeTab(pathname: string): AppTab["href"] | null {
  if (pathname === "/") return "/";
  const tab = APP_TABS.find(
    (t) =>
      t.href !== "/" &&
      (pathname === t.href || pathname.startsWith(`${t.href}/`))
  );
  return tab?.href ?? null;
}

export const tubPath = (id: string) => `/tubs/${id}`;
export const visitPath = (id: string) => `/visits/${id}`;
export const recordPath = (id: string) => `/records/${id}`;
