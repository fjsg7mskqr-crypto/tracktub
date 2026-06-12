"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Seal } from "@/components/Seal";
import { Icon } from "@/components/Icon";

const NAV = [
  { href: "/", label: "Cockpit" },
  { href: "/landing", label: "Landing" },
  { href: "/insights", label: "Insights" },
  { href: "/add-property", label: "Add property" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (pathname.startsWith("/proof") || pathname.startsWith("/landing"))
    return <>{children}</>;

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
            {NAV.map((n) => (
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
