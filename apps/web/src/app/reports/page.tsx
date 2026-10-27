import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { recordPath } from "@/lib/app-routes";
import {
  PERIOD_LABELS,
  buildSentList,
  parsePeriod,
  type HistoryPeriod,
  type SentEventRow,
} from "@/components/record/reports-model";

const chip = (selected: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "var(--tt-tap)",
  padding: "0 14px",
  borderRadius: 999,
  background: selected ? "#1E3A6B" : "var(--tt-raised)",
  color: selected ? "var(--tt-text)" : "#C4C8CF",
  fontSize: 15,
  textDecoration: "none",
});

const reportsHref = (tub: string, period: HistoryPeriod) =>
  `/reports?tub=${encodeURIComponent(tub)}&period=${period}`;

// Reports (screen 10): build a history report for one tub, and the records
// sent to owners. Stays dynamic: getCurrentMembership() reads the session.
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tub?: string; period?: string }>;
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const q = await searchParams;
  const period = parsePeriod(q.period);
  const supabase = await createClient();

  const [{ data: tubs }, { data: events }] = await Promise.all([
    supabase.from("property").select("id, name").order("name"),
    supabase
      .from("proof_event")
      .select(
        `turnover_id, occurred_at,
         turnover:turnover(submitted_at_server, property:property(name, client:client(name)))`
      )
      .eq("kind", "share_copied")
      .order("occurred_at", { ascending: false })
      .limit(200),
  ]);
  const tubList = tubs ?? [];
  const tub = tubList.find((t) => t.id === q.tub) ?? tubList[0] ?? null;

  const sentRows = (events ?? []) as unknown as SentEventRow[];
  const ids = [...new Set(sentRows.map((e) => e.turnover_id))];
  let opened = new Set<string>();
  if (ids.length > 0) {
    const { data: views } = await supabase
      .from("share_view")
      .select("turnover_id")
      .in("turnover_id", ids);
    opened = new Set((views ?? []).map((v) => v.turnover_id));
  }
  const sent = buildSentList(sentRows, opened);

  return (
    <main
      style={{
        padding: "32px 20px 24px",
        maxWidth: 560,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 24,
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
        Reports
      </h1>

      <section
        style={{
          background: "var(--tt-surface)",
          borderRadius: "var(--tt-radius-card)",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          History report
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.45,
            color: "var(--tt-text-2)",
          }}
        >
          Every visit for one tub over a period — readings, drains, filters,
          photos. For a season review, a new client, or when someone asks.
        </p>
        {tub ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tubList.map((t) => (
                <Link
                  key={t.id}
                  href={reportsHref(t.id, period)}
                  style={chip(t.id === tub.id)}
                  aria-current={t.id === tub.id ? "true" : undefined}
                >
                  {t.name}
                </Link>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(Object.keys(PERIOD_LABELS) as HistoryPeriod[]).map((p) => (
                <Link
                  key={p}
                  href={reportsHref(tub.id, p)}
                  style={chip(p === period)}
                  aria-current={p === period ? "true" : undefined}
                >
                  {PERIOD_LABELS[p]}
                </Link>
              ))}
            </div>
            <Link
              href={`/reports/history?tub=${encodeURIComponent(tub.id)}&period=${period}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 48,
                borderRadius: 999,
                background: "var(--tt-action)",
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Build report
            </Link>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 15, color: "var(--tt-text-2)" }}>
            Add a tub first.
          </p>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--tt-text-3)",
          }}
        >
          Sent
        </h2>
        {sent.length === 0 ? (
          <p style={{ margin: 0, fontSize: 15, color: "var(--tt-text-2)" }}>
            Nothing sent yet.
          </p>
        ) : (
          sent.map((s) => (
            <Link
              key={s.turnoverId}
              href={recordPath(s.turnoverId)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                minHeight: 56,
                padding: "0 4px",
                textDecoration: "none",
                color: "var(--tt-text)",
              }}
            >
              <span
                style={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <span style={{ fontSize: 16, fontWeight: 500 }}>{s.title}</span>
                <span style={{ fontSize: 13, color: "var(--tt-text-2)" }}>
                  {s.to ? `To ${s.to} · ${s.sentAt}` : `Sent ${s.sentAt}`}
                </span>
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: s.opened ? "var(--tt-ok)" : "var(--tt-text-3)",
                }}
              >
                {s.opened ? "Opened" : "Sent"}
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
