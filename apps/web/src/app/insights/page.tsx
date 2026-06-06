"use client";

import Link from "next/link";
import { useDB } from "@/lib/store";
import { lastTurnover, issueTagsOf, shareCount, openCount } from "@/lib/selectors";
import { withinHours } from "@/lib/selectors";
import { timeAgo } from "@/lib/format";

function Gate({
  label,
  value,
  target,
  pass,
  hint,
}: {
  label: string;
  value: string;
  target: string;
  pass: boolean;
  hint: string;
}) {
  return (
    <div className="card pad">
      <div className="spread">
        <div className="label" style={{ marginBottom: 0 }}>
          {label}
        </div>
        <span className={pass ? "badge ok" : "badge warn"}>
          {pass ? "● on track" : "● below target"}
        </span>
      </div>
      <div className="row" style={{ alignItems: "baseline", gap: 8, marginTop: 6 }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em" }}>
          {value}
        </div>
        <div className="small dim">target {target}</div>
      </div>
      <div className="small muted" style={{ marginTop: 4 }}>
        {hint}
      </div>
    </div>
  );
}

export default function Insights() {
  const db = useDB();
  if (!db) return <div className="skeleton">Loading…</div>;

  const locked = db.turnovers.filter((t) => t.status === "locked");
  const props = db.properties;

  const recentProps = props.filter((p) =>
    withinHours(lastTurnover(db, p.id)?.submittedAtServer ?? null, 24 * 7)
  ).length;
  const activationPct = props.length
    ? Math.round((recentProps / props.length) * 100)
    : 0;

  const shared = locked.filter((t) => shareCount(t) > 0).length;
  const sharePct = locked.length ? Math.round((shared / locked.length) * 100) : 0;
  const opens = locked.reduce((n, t) => n + openCount(t), 0);

  const openIssues = props.reduce((n, p) => {
    const t = lastTurnover(db, p.id);
    return n + (t ? new Set(issueTagsOf(t)).size : 0);
  }, 0);

  return (
    <div className="stack">
      <div className="pagehead">
        <h1>Insights</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          Founder view — does the thin MVP clear its gates? Numbers are live from
          your activity in this demo.
        </p>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="k">Turnovers logged</div>
          <div className="v">{locked.length}</div>
          <div className="sub">guest-ready proofs on file</div>
        </div>
        <div className="tile">
          <div className="k">Proof opens</div>
          <div className="v">{opens}</div>
          <div className="sub">recipients viewed a link</div>
        </div>
        <div className="tile">
          <div className="k">Open issues</div>
          <div className="v" style={{ color: openIssues ? "var(--warn)" : undefined }}>
            {openIssues}
          </div>
          <div className="sub">flagged on last visits</div>
        </div>
        <div className="tile">
          <div className="k">WTP intents</div>
          <div className="v" style={{ color: db.waitlist.length ? "var(--ok)" : undefined }}>
            {db.waitlist.length}
          </div>
          <div className="sub">hit the $12/mo fake-door</div>
        </div>
      </div>

      <h3 style={{ fontSize: 16, marginTop: 6 }}>Validation gates (PRD §12 / §16)</h3>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <Gate
          label="Activation"
          value={`${activationPct}%`}
          target="≥60%"
          pass={activationPct >= 60}
          hint="Properties with a turnover in the last 7 days. Proxy for week-1 activation."
        />
        <Gate
          label="Wedge — proof shared"
          value={`${sharePct}%`}
          target="≥30%"
          pass={sharePct >= 30}
          hint="Locked turnovers whose proof link was shared. Tests whether operators reach for proof."
        />
        <Gate
          label="Recipient opens"
          value={`${opens}`}
          target="trend ↑"
          pass={opens > 0}
          hint="Owners/guests opening shared links — two-sided proof value."
        />
        <Gate
          label="WTP intent"
          value={`${db.waitlist.length}`}
          target="trend ↑"
          pass={db.waitlist.length > 0}
          hint="Operators trying to add a 2nd property at $12/mo (the fake-door)."
        />
      </div>

      <div className="card pad stack">
        <div className="label" style={{ marginBottom: 0 }}>
          Paid waitlist (WTP fake-door)
        </div>
        {db.waitlist.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            No intents yet. Try{" "}
            <Link href="/add-property">Add property</Link> to log one.
          </p>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            {db.waitlist.map((w, i) => (
              <div key={i} className="spread small">
                <span>
                  <strong>{w.propertyName}</strong>
                  {w.note ? <span className="dim"> — {w.note}</span> : null}
                </span>
                <span className="dim tiny">{timeAgo(w.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="tiny dim">
        Reminder (PRD): this lean path tests <strong>use</strong>, not{" "}
        <strong>willingness-to-pay</strong> — the fake-door is only a proxy until
        a real paywall ships.
      </p>
    </div>
  );
}
