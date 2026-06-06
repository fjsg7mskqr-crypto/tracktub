"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useDB } from "@/lib/store";
import {
  propertyById,
  lockedTurnovers,
  canCapture,
  issueTagsOf,
  userName,
  shareCount,
} from "@/lib/selectors";
import { timeAgo, tagLabel } from "@/lib/format";
import { PhotoThumb } from "@/components/PhotoThumb";
import { Icon } from "@/components/Icon";

export default function PropertyPage() {
  const pid = String(useParams().id);
  const db = useDB();
  if (!db) return <div className="skeleton">Loading…</div>;

  const p = propertyById(db, pid);
  if (!p)
    return (
      <div className="empty">
        Property not found. <Link href="/">Back to cockpit</Link>
      </div>
    );

  const turns = lockedTurnovers(db, pid);
  const owner = db.users.find((u) => u.id === p.ownerId);
  const batherLoad = p.staysSinceTurnover >= 3;
  const canCap = canCapture(db, pid);

  return (
    <div className="stack">
      <div className="crumb">
        <Link href="/">Cockpit</Link> / {p.name}
      </div>
      <div className="spread pagehead">
        <div>
          <h1>{p.name}</h1>
          <div className="small dim" style={{ marginTop: 4 }}>
            {p.address}
          </div>
        </div>
        {canCap && (
          <Link href={`/p/${pid}/new`} className="btn primary">
            <Icon name="plus" size={15} /> New turnover
          </Link>
        )}
      </div>

      {batherLoad && (
        <div className="note row" style={{ gap: 10, alignItems: "flex-start" }}>
          <Icon
            name="waves"
            size={17}
            style={{ color: "var(--verd)", flex: "none", marginTop: 1 }}
          />
          <span>
            <strong>Bather-load reminder</strong> — {p.staysSinceTurnover} guest
            stays since the last service. Heavy use depletes sanitizer fast;
            recommend a shock + check before the next check-in.{" "}
            <span className="mock-tag">roadmap mock</span>
          </span>
        </div>
      )}

      <div className="card pad">
        <dl className="kv">
          <dt>Tub notes</dt>
          <dd>{p.tubNotes}</dd>
          <dt>Owner</dt>
          <dd>{owner?.name ?? "—"}</dd>
          <dt>Geofence</dt>
          <dd>
            {p.geofenceRadiusM} m radius{" "}
            <span className="mock-tag">fast-follow</span>
          </dd>
          <dt>Status</dt>
          <dd>
            {p.staysSinceTurnover > 0 ? (
              <span className="badge danger">
                Needs turnover · {p.staysSinceTurnover} stay
                {p.staysSinceTurnover > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="badge ok">● Guest-ready</span>
            )}
          </dd>
        </dl>
      </div>

      <div className="card pad">
        <div className="spread" style={{ marginBottom: 10 }}>
          <h3 style={{ fontSize: 16 }}>Upcoming maintenance</h3>
          <span className="mock-tag">reminders · fast-follow</span>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {[
            { t: "Filter rinse", d: "Due in 4 days", soon: true },
            { t: "Drain & refill", d: "Due in 3 weeks", soon: false },
            { t: "Reorder test strips", d: "Due in 6 weeks", soon: false },
          ].map((m) => (
            <div key={m.t} className="spread small">
              <span className="row" style={{ gap: 8 }}>
                <span className={`dot ${m.soon ? "warn" : ""}`} />
                {m.t}
              </span>
              <span className="dim">{m.d}</span>
            </div>
          ))}
        </div>
      </div>

      <h3 style={{ fontSize: 16, marginTop: 6 }}>
        Turnover history{" "}
        <span className="dim small" style={{ fontWeight: 500 }}>
          ({turns.length})
        </span>
      </h3>
      <div className="stack">
        {turns.map((t) => {
          const issues = issueTagsOf(t);
          return (
            <Link key={t.id} href={`/t/${t.id}`} className="card card-link pad">
              <div className="spread" style={{ marginBottom: 10 }}>
                <div className="row">
                  <strong>{timeAgo(t.submittedAtServer)}</strong>
                  <span className="small dim">· {userName(db, t.submitterId)}</span>
                  <span
                    className="dim"
                    title="Record is locked"
                    style={{ display: "inline-flex" }}
                  >
                    <Icon name="lock" size={13} />
                  </span>
                </div>
                <div className="row wrap" style={{ justifyContent: "flex-end" }}>
                  {t.urgent && <span className="badge danger">Urgent</span>}
                  {issues.length > 0 ? (
                    <span className="badge warn">
                      {Array.from(new Set(issues)).map(tagLabel).join(", ")}
                    </span>
                  ) : (
                    <span className="badge ok">Clean</span>
                  )}
                  {shareCount(t) > 0 && (
                    <span className="badge brand">
                      <Icon name="share" size={11} /> Shared
                    </span>
                  )}
                </div>
              </div>
              <div className="photos">
                {t.photos.map((ph) => (
                  <PhotoThumb key={ph.slot} photo={ph} />
                ))}
              </div>
            </Link>
          );
        })}
        {turns.length === 0 && <div className="empty">No turnovers yet.</div>}
      </div>
    </div>
  );
}
