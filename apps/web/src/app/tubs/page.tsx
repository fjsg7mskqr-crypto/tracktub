import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/tub/SectionLabel";
import { TubRow } from "@/components/tub/TubRow";
import {
  groupTubsByClient,
  tubStatus,
  tubSubline,
} from "@/components/tub/tub-status";
import { loadTubHistories, loadTubs } from "./load";

// Screen 4 (spec §4): every tub grouped by client. Stays dynamic:
// getCurrentMembership() reads the session cookie (CSP nonce per request).
export default async function TubsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const supabase = await createClient();
  const tubs = await loadTubs(supabase);
  const histories = await loadTubHistories(
    supabase,
    tubs.map((t) => t.id)
  );
  const now = new Date();
  const groups = groupTubsByClient(tubs);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "32px 20px 24px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          Tubs
        </h1>
        <Link
          href="/tubs/new"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: "var(--tt-tap)",
            padding: "0 16px",
            borderRadius: 999,
            background: "var(--tt-raised)",
            color: "var(--tt-text)",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add tub
        </Link>
      </div>

      {groups.length === 0 ? (
        <p style={{ margin: 0, fontSize: 15, color: "var(--tt-text-2)" }}>
          No tubs yet. Add your first one to start logging visits.
        </p>
      ) : (
        groups.map((g) => (
          <section
            key={g.clientName}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <SectionLabel>
              {g.clientName} · {g.tubs.length}{" "}
              {g.tubs.length === 1 ? "tub" : "tubs"}
            </SectionLabel>
            {g.tubs.map((t) => {
              const visits = histories.get(t.id) ?? [];
              return (
                <TubRow
                  key={t.id}
                  id={t.id}
                  name={t.name}
                  subline={tubSubline(t, visits, now)}
                  status={tubStatus(t, visits, now)}
                />
              );
            })}
          </section>
        ))
      )}
    </main>
  );
}
