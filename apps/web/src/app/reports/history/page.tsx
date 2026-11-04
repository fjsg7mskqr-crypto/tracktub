import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { recordPath } from "@/lib/app-routes";
import { buildRecord } from "@/components/record/record-model";
import { loadTubRecords } from "@/components/record/load-record";
import {
  PERIOD_LABELS,
  historyVisits,
  parsePeriod,
} from "@/components/record/reports-model";
import "@/components/record/record.css";

// History report (screen 10): one tub's locked records over a period, as a
// white printable page built from the records. No PDF yet (spec: later phase).
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tub?: string; period?: string }>;
}) {
  const q = await searchParams;
  const period = parsePeriod(q.period);
  if (!q.tub) notFound();
  const supabase = await createClient();

  // loadTubRecords reads by the same id, so it needn't wait for the tub row
  // (a bad id just finds no records, and the tub lookup 404s).
  const [membership, { data: tub }, tubRecords] = await Promise.all([
    getCurrentMembership(),
    supabase
      .from("property")
      .select("id, name, client:client(name)")
      .eq("id", q.tub)
      .maybeSingle(),
    loadTubRecords(supabase, q.tub),
  ]);
  if (!membership) redirect("/login");
  if (!tub) notFound();
  const client = Array.isArray(tub.client) ? tub.client[0] : tub.client;

  const rows = historyVisits(tubRecords, period, new Date());
  const records = rows.map(buildRecord);

  return (
    <div className="tt-record-page">
      <div className="tt-record-operator">
        <Link className="tt-record-back" href="/reports">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
          Reports
        </Link>
      </div>
      <article className="tt-record">
        <header className="tt-record-head">
          <div>
            <span className="tt-record-mast">TrackTub history report</span>
            <h1>{tub.name}</h1>
            <p className="tt-record-sub">
              {[client?.name, PERIOD_LABELS[period]]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </header>

        {records.length === 0 ? (
          <p className="tt-record-text tt-record-muted">
            No locked visits in this period.
          </p>
        ) : (
          records.map((r) => {
            const ph = r.water.lines.find((l) => l.field === "ph");
            const cl = r.water.lines.find((l) => l.field === "sanitizer_ppm");
            const done = r.work.filter((w) => w.done).map((w) => w.label);
            return (
              <section key={r.id} className="tt-record-history-row">
                <Link href={recordPath(r.id)}>
                  <h2
                    style={{
                      color: "#08090A",
                      textTransform: "none",
                      letterSpacing: 0,
                      fontSize: 16,
                    }}
                  >
                    {r.date}
                  </h2>
                </Link>
                <p className="tt-record-sub">
                  {r.span}
                  {r.partial.length > 0 && " · Partial"}
                </p>
                <p className="tt-record-text">
                  {r.water.any && ph && cl
                    ? `pH ${ph.found} → ${ph.left} · Cl ${cl.found} → ${cl.left}`
                    : "No reading logged"}
                </p>
                <p className="tt-record-text">
                  {[
                    done.join(", ") || "No work logged",
                    `${r.photos.length} photos`,
                  ].join(" · ")}
                </p>
              </section>
            );
          })
        )}

        <footer>
          <span>
            Built from {records.length} TrackTub{" "}
            {records.length === 1 ? "record" : "records"}. Each visit links to
            its full record.
          </span>
        </footer>
      </article>
    </div>
  );
}
