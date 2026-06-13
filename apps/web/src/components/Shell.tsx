"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Seal } from "@/components/Seal";
import { Icon } from "@/components/Icon";
import { resolveRole, type MemberRole } from "@/lib/role";

type NavItem = { href: string; label: string };

// Nav by role (issue #97). Operator = full host cockpit; staff = capture-only
// home (no nav); owner = read-only properties.
const NAV_BY_ROLE: Record<MemberRole, NavItem[]> = {
  operator: [
    { href: "/", label: "Properties" },
    { href: "/team", label: "Team" },
    { href: "/insights", label: "Insights" },
    { href: "/add-property", label: "Add property" },
  ],
  staff: [],
  owner: [{ href: "/", label: "Properties" }],
};

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);

  // Resolve role/email client-side so the root layout stays static (a cookie
  // read there would force every route, including /landing, to be dynamic).
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
    pathname.startsWith("/invite")
  )
    return <>{children}</>;

  const nav = role ? NAV_BY_ROLE[role] : [];

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
          <nav className="navlinks">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={pathname === n.href ? "active" : ""}
              >
                {n.label}
              </Link>
            ))}
          </nav>
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
