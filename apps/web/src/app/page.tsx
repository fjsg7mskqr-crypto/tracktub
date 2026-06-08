import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// M1 proof-of-life dashboard. Server component: it reads the signed-in user's
// org membership and visible properties THROUGH RLS — what renders here is
// exactly what the database lets this user see. Styling is intentionally minimal
// (the UI/brand track owns the visual shell).
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: memberships }, { data: orgs }, { data: properties }] =
    await Promise.all([
      supabase.from("membership").select("role, org_id"),
      supabase.from("org").select("id, name"),
      supabase.from("property").select("id, name, address"),
    ]);

  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <h1
        style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}
      >
        Backend skeleton{" "}
        <span style={{ color: "#34d399" }}>✓</span>
      </h1>
      <p style={{ marginTop: 4, color: "#8a8f98" }}>{user.email}</p>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 13, color: "#8a8f98", fontWeight: 500 }}>
          Memberships
        </h2>
        {memberships && memberships.length > 0 ? (
          <ul style={{ marginTop: 8, listStyle: "none", padding: 0 }}>
            {memberships.map((m, i) => (
              <li
                key={i}
                style={{ fontSize: 14, fontFamily: "var(--font-jbmono, monospace)" }}
              >
                {orgName.get(m.org_id) ?? m.org_id} ·{" "}
                <span style={{ color: "#34d399" }}>{m.role}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ marginTop: 8, color: "#8a8f98", fontSize: 14 }}>
            No org membership yet — seed one for this user (see
            supabase/seed.sql).
          </p>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 13, color: "#8a8f98", fontWeight: 500 }}>
          Properties visible to you ({properties?.length ?? 0})
        </h2>
        <ul style={{ marginTop: 8, listStyle: "none", padding: 0 }}>
          {(properties ?? []).map((p) => (
            <li
              key={p.id}
              style={{
                padding: "12px 14px",
                marginTop: 8,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.09)",
                background: "#131417",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</div>
              {p.address && (
                <div style={{ fontSize: 13, color: "#8a8f98", marginTop: 2 }}>
                  {p.address}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form action="/auth/signout" method="post" style={{ marginTop: 28 }}>
        <button
          type="submit"
          style={{
            fontSize: 13,
            color: "#8a8f98",
            background: "none",
            border: "none",
            textDecoration: "underline",
            cursor: "pointer",
            padding: 0,
          }}
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
