"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Seal } from "@/components/Seal";
import { Icon } from "@/components/Icon";
import { resolveRole, type MemberRole } from "@/lib/role";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  // Extra path prefixes that should mark this item active (for entries that
  // front more than one route, e.g. Team & Insights → /team and /insights).
  match?: string[];
};

// Inline nav glyphs (kept local to the shell).
const G = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  drop: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 3.5s6 6.4 6 10.4a6 6 0 11-12 0c0-4 6-10.4 6-10.4z" />
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M16 5.2a3 3 0 010 5.6M17.5 19c0-2.4-1-4-2.5-4.6" />
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 4v16h16" /><path d="M8 14l3-3 3 2 4-5" />
    </svg>
  ),
};

const OPERATOR_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: G.grid },
  { href: "/operations", label: "Operations", icon: G.drop, match: ["/operations", "/chemistry"] },
  {
    href: "/team",
    label: "Team & Insights",
    icon: G.team,
    match: ["/team", "/insights"],
  },
];
const OWNER_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: G.grid },
  { href: "/operations", label: "Operations", icon: G.drop, match: ["/operations", "/chemistry"] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);

  // Resolve role/email client-side so the root layout stays static.
  // Server-side guards remain the real authority; this only drives the nav.
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? null);
      const { data: memberships } = await supabase
        .from("membership")
        .select("org_id, role")
        .eq("user_id", user.id);
      if (!memberships || memberships.length === 0) return;
      const operatorOrgs = memberships
        .filter((m) => m.role === "operator")
        .map((m) => m.org_id);
      let withProps: string[] = [];
      if (operatorOrgs.length > 0) {
        const { data: props } = await supabase
          .from("property")
          .select("org_id")
          .in("org_id", operatorOrgs);
        withProps = [...new Set((props ?? []).map((p) => p.org_id))];
      }
      setRole(resolveRole(memberships, withProps)?.role ?? null);
    })();
  }, []);

  // Capability-link / unauthenticated surfaces render without the app chrome.
  if (
    pathname.startsWith("/proof") ||
    pathname.startsWith("/landing") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/invite")
  )
    return <>{children}</>;

  // Cleaner (staff) keeps the stripped, capture-only experience — a minimal bar.
  if (role === "staff") {
    return (
      <>
        <header className="topbar">
          <div className="inner">
            <Link href="/" className="brand">
              <span className="mark">
                <Seal size={24} />
              </span>
              <span className="word">
                Track<b>Tub</b>
              </span>
            </Link>
            <div className="row" style={{ marginLeft: "auto", gap: 12 }}>
              {email && (
                <span className="dim small" style={{ color: "var(--ink-3)" }}>
                  {email}
                </span>
              )}
              <form action="/auth/signout" method="post">
                <button type="submit" className="btn ghost sm">
                  <Icon name="user" size={15} /> Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="container page">{children}</main>
      </>
    );
  }

  // Operator / owner (and while role resolves) get the sidebar shell.
  const nav = role === "owner" ? OWNER_NAV : OPERATOR_NAV;
  const canAdd = role !== "owner";
  const initials = (email ?? "·").slice(0, 2).toUpperCase();

  return (
    <div className="appshell">
      <aside className="appside">
        <Link href="/" className="brandrow">
          <Seal size={22} />
          <span>
            Track<b>Tub</b>
          </span>
        </Link>
        <nav className="appnav">
          {nav.map((n) => {
            const prefixes = n.match ?? [n.href];
            const active =
              n.href === "/"
                ? pathname === "/"
                : prefixes.some((p) => pathname.startsWith(p));
            return (
              <Link key={n.href} href={n.href} className={active ? "active" : ""}>
                {n.icon}
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="sp" />
        {canAdd && (
          <Link href="/add-property" className="addbtn">
            <Icon name="plus" size={15} /> Add property
          </Link>
        )}
        <div className="userrow">
          <span className="av">{initials}</span>
          {email && <span className="em">{email}</span>}
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn ghost sm">
              <Icon name="user" size={14} />
            </button>
          </form>
        </div>
      </aside>
      <main className="appmain">
        <div className="appmain-inner">{children}</div>
      </main>
    </div>
  );
}
