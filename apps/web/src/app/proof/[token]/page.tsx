"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useDB, recordOpen } from "@/lib/store";
import { PhotoThumb } from "@/components/PhotoThumb";
import { Seal } from "@/components/Seal";
import { Icon } from "@/components/Icon";
import { formatDateTime, tagLabel } from "@/lib/format";
import { propertyById, userName, issueTagsOf } from "@/lib/selectors";

export default function ProofPage() {
  const token = String(useParams().token);
  const db = useDB();
  const opened = useRef(false);

  useEffect(() => {
    if (db && !opened.current) {
      opened.current = true;
      recordOpen(token); // recipient opened the proof (wedge signal)
    }
  }, [db, token]);

  if (!db)
    return (
      <div className="skeleton" style={{ minHeight: "60vh" }}>
        Loading proof…
      </div>
    );

  const t = db.turnovers.find((x) => x.shareToken === token);
  if (!t)
    return (
      <div className="empty" style={{ minHeight: "60vh" }}>
        This proof link is not valid.
      </div>
    );

  const p = propertyById(db, t.propertyId);
  const issues = Array.from(new Set(issueTagsOf(t)));

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div className="container" style={{ maxWidth: 640, padding: "26px 18px 70px" }}>
        {/* public header */}
        <div className="row" style={{ marginBottom: 18, gap: 10 }}>
          <span style={{ display: "inline-flex" }}>
            <Seal size={24} />
          </span>
          <span
            style={{
              fontFamily: "var(--sans)",
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: "-0.035em",
            }}
          >
            Track<b style={{ fontWeight: 600 }}>Tub</b>
          </span>
          <span className="eyebrow" style={{ marginLeft: "auto" }}>
            Certificate of turnover
          </span>
        </div>

        <div className="card pad stack">
          <div className="spread" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">Turnover proof</div>
              <h1 style={{ fontSize: 26, marginTop: 4 }}>{p?.name ?? "Property"}</h1>
            </div>
            <div
              style={{ textAlign: "center", flex: "none" }}
              title="Server-timestamped, locked record"
            >
              <Seal size={56} />
              <div
                className="eyebrow"
                style={{ color: "var(--verified)", marginTop: 4 }}
              >
                Verified
              </div>
            </div>
          </div>

          <div className="photos">
            {t.photos.map((ph) => (
              <PhotoThumb key={ph.slot} photo={ph} />
            ))}
          </div>

          {issues.length > 0 ? (
            <div className="note warn">
              <strong>Issues flagged on this visit:</strong>{" "}
              {issues.map(tagLabel).join(", ")}.
            </div>
          ) : (
            <div className="note">No issues flagged — tub was guest-ready.</div>
          )}

          <hr className="divider" />

          <dl className="kv">
            <dt>Property</dt>
            <dd>
              {p?.name}
              <div className="tiny dim">{p?.address}</div>
            </dd>
            <dt>Captured</dt>
            <dd>
              {formatDateTime(t.submittedAtServer)}{" "}
              <span className="tiny dim">(server time)</span>
            </dd>
            <dt>Submitted by</dt>
            <dd>{userName(db, t.submitterId)}</dd>
            <dt>Record</dt>
            <dd>
              <span className="row" style={{ gap: 6 }}>
                <Icon name="lock" size={14} /> Locked — unchanged since submission
              </span>
              <span className="mono tiny dim">#{t.shareToken}</span>
            </dd>
          </dl>

          {t.notes && (
            <>
              <hr className="divider" />
              <div>
                <div className="label">Notes from the turnover</div>
                <p className="small" style={{ margin: 0 }}>
                  {t.notes}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="tiny dim" style={{ textAlign: "center", marginTop: 16 }}>
          This record was captured through TrackTub and locked at submission.
          Photos are human-confirmed. No login required to view.
        </p>
      </div>
    </div>
  );
}
