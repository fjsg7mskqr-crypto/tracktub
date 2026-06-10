"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDB, setCurrentUser, resetDemo } from "@/lib/store";
import { Seal } from "@/components/Seal";
import { Icon } from "@/components/Icon";

const NAV = [
  { href: "/", label: "Cockpit" },
  { href: "/landing", label: "Landing" },
  { href: "/insights", label: "Insights" },
  { href: "/add-property", label: "Add property" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const db = useDB();
  const pathname = usePathname() ?? "/";

  // Public pages render with no operator chrome (no login, no demo nav): the
  // marketing landing and shareable proof links each bring their own layout.
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
          <div className="row" style={{ marginLeft: "auto" }}>
            {db && (
              <>
                <span
                  className="dim"
                  style={{ color: "var(--ink-3)", display: "inline-flex" }}
                  title="Switch role"
                >
                  <Icon name="user" size={15} />
                </span>
                <select
                  className="input mono"
                  aria-label="Switch role"
                  style={{ width: "auto", padding: "6px 10px", fontSize: 12 }}
                  value={db.currentUserId}
                  onChange={(e) => setCurrentUser(e.target.value)}
                >
                  {db.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    if (confirm("Reset all demo data to the seed?")) resetDemo();
                  }}
                >
                  <Icon name="reset" size={15} />
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="container page">{children}</main>
    </>
  );
}
