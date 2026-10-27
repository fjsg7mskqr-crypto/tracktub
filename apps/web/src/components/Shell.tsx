"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";

/**
 * Capability-link / unauthenticated surfaces — and the mobile field section,
 * which brings its own full-bleed shell — render without app chrome.
 */
const PUBLIC_PREFIXES = ["/proof", "/landing", "/blog", "/invite", "/field"];

/** Signed-out entry points: no tab bar before there's an app to navigate. */
const SIGNED_OUT_PREFIXES = ["/login", "/auth"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Root chrome switch. Every other path is signed-in — middleware redirects a
 * signed-out request to /login before it renders — so it gets the four-tab
 * app shell. Single user (spec): no role branches.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  if (
    startsWithAny(pathname, PUBLIC_PREFIXES) ||
    startsWithAny(pathname, SIGNED_OUT_PREFIXES)
  )
    return <>{children}</>;

  return <AppShell>{children}</AppShell>;
}
