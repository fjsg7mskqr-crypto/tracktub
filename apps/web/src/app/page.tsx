"use client";

import Link from "next/link";
import { useDB } from "@/lib/store";
import {
  currentUser,
  visibleProperties,
  lastTurnover,
  issueTagsOf,
  userName,
  withinHours,
  canCapture,
} from "@/lib/selectors";
import { timeAgo } from "@/lib/format";
import { DemoGuide } from "@/components/DemoGuide";
import { Icon } from "@/components/Icon";

export default function Cockpit() {
  const db = useDB();
  if (!db) return <div className="skeleton">Loading cockpit…</div>;

  const me = currentUser(db);
  const props = visibleProperties(db);

  const turnoversToday = props.filter((p) =>
    withinHours(lastTurnover(db, p.id)?.submittedAtServer ?? null, 24)
  ).length;
  const openIssues = props.reduce((n, p) => {
    const t = lastTurnover(db, p.id);
    return n + (t ? issueTagsOf(t).length : 0);
  }, 0);
  const needTurnover = props.filter((p) => p.staysSinceTurnover > 0).length;

  const roleLine =
    me.role === "operator"
      ? `${db.orgName} · all ${props.length} properties`
      : me.role === "owner"
      ? `Owner view · read-only · your ${props.length} ${props.length === 1 ? "property" : "properties"}`
      : `Cleaner view · your ${props.length} assigned ${props.length === 1 ? "property" : "properties"}`;

  return (
    <div className="stack">
      <DemoGuide />
      <div className="pagehead spread">
        <div>
          <h1>Turnover cockpit</h1>
          <p className="muted small" style={{ marginTop: 4 }}>
            {roleLine}
          </p>
        </div>
      </div>

      {me.role === "owner" && (
        <div className="note">
          You&apos;re viewing TrackTub as a property owner — a read-only window into
          the proof for your properties. Owners never edit records.
        </div>
      )}

      <div className="tiles">
        <div className="tile">
          <div className="k">Properties</div>
          <div className="v">{props.length}</div>
          <div className="sub">with hot tubs</div>
        </div>
        <div className="tile">
          <div className="k">Turned over (24h)</div>
          <div className="v">{turnoversToday}</div>
          <div className="sub">guest-ready proof on file</div>
        </div>
        <div className="tile">
          <div className="k">Open issues</div>
          <div className="v" style={{ color: openIssues ? "var(--warn)" : undefined }}>
            {openIssues}
          </div>
          <div className="sub">flagged on last visit</div>
        </div>
        <div className="tile">
          <div className="k">Awaiting turnover</div>
          <div className="v" style={{ color: needTurnover ? "var(--danger)" : "var(--ok)" }}>
            {needTurnover}
          </div>
          <div className="sub">stays since last proof</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {props.map((p) => {
          const t = lastTurnover(db, p.id);
          const issues = t ? issueTagsOf(t) : [];
          const needsTurnover = p.staysSinceTurnover > 0;
          const batherLoad = p.staysSinceTurnover >= 3;
          return (
            <Link key={p.id} href={`/p/${p.id}`} className="card card-link pad">
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="row" style={{ gap: 8 }}>
                    <h3 style={{ fontSize: 17 }}>{p.name}</h3>
                  </div>
                  <div className="small dim" style={{ marginTop: 2 }}>
                    {p.address}
                  </div>
                  <div className="small muted" style={{ marginTop: 8 }}>
                    {t ? (
                      <>
                        Last turnover {timeAgo(t.submittedAtServer)} ·{" "}
                        {userName(db, t.submitterId)}
                      </>
                    ) : (
                      <>No turnovers yet</>
                    )}
                  </div>
                </div>
                <div className="row wrap" style={{ justifyContent: "flex-end", maxWidth: 320 }}>
                  {t?.urgent && <span className="badge danger">Urgent</span>}
                  {issues.length > 0 && (
                    <span className="badge warn">{issues.length} issue{issues.length > 1 ? "s" : ""}</span>
                  )}
                  {batherLoad && (
                    <span className="badge brand" title="Heavy guest use since last service">
                      <Icon name="waves" size={12} /> Bather load
                    </span>
                  )}
                  {needsTurnover ? (
                    <span className="badge danger">Needs turnover</span>
                  ) : (
                    <span className="badge ok">Guest-ready</span>
                  )}
                </div>
              </div>

              {canCapture(db, p.id) && needsTurnover && (
                <div style={{ marginTop: 12 }}>
                  <span className="btn primary sm">
                    <Icon name="camera" size={14} /> Start turnover
                  </span>
                  <span className="small dim" style={{ marginLeft: 10 }}>
                    {p.staysSinceTurnover} stay{p.staysSinceTurnover > 1 ? "s" : ""} since last proof
                  </span>
                </div>
              )}
            </Link>
          );
        })}
        {props.length === 0 && (
          <div className="empty">No properties visible for this role.</div>
        )}
      </div>
    </div>
  );
}
