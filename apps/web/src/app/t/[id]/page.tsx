"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDB, shareTurnover, toggleConfirmedTag } from "@/lib/store";
import {
  turnoverById,
  propertyById,
  userName,
  currentUser,
  issueTagsOf,
  shareCount,
  openCount,
} from "@/lib/selectors";
import { formatDateTime, timeAgo, tagLabel } from "@/lib/format";
import { PhotoThumb } from "@/components/PhotoThumb";
import { Seal } from "@/components/Seal";
import { Icon } from "@/components/Icon";

export default function TurnoverPage() {
  const tid = String(useParams().id);
  const db = useDB();
  const [toast, setToast] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }

  if (!db) return <div className="skeleton">Loading…</div>;
  const t = turnoverById(db, tid);
  if (!t)
    return (
      <div className="empty">
        Turnover not found. <Link href="/">Back to cockpit</Link>
      </div>
    );

  const p = propertyById(db, t.propertyId);
  const me = currentUser(db);
  const isOperator = me.role === "operator";
  const issues = Array.from(new Set(issueTagsOf(t)));
  const link =
    (typeof window !== "undefined" ? window.location.origin : "") +
    `/proof/${t.shareToken}`;

  const pendingSuggestions = t.photos.flatMap((ph) =>
    ph.suggestedTags
      .filter((tag) => !ph.confirmedTags.includes(tag))
      .map((tag) => ({ slot: ph.slot, tag }))
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      flash("Proof link copied");
    } catch {
      flash("Copy failed — select the link manually");
    }
  }
  function share(channel: string) {
    shareTurnover(t!.id, channel);
    flash(`Shared via ${channel}`);
  }
  function draftSummary() {
    const issueLine = issues.length
      ? `Issues noted: ${issues.map(tagLabel).join(", ")}.`
      : "No issues — the tub was clean and guest-ready.";
    setSummary(
      `Turnover summary — ${p?.name}\n` +
        `${formatDateTime(t!.submittedAtServer)}, completed by ${userName(db!, t!.submitterId)}.\n` +
        `${issueLine}` +
        (t!.notes ? `\nNotes: ${t!.notes}` : "") +
        `\nProof: ${link}`
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="crumb">
        <Link href="/">Cockpit</Link> /{" "}
        <Link href={`/p/${t.propertyId}`}>{p?.name}</Link> / Turnover
      </div>

      <div className="spread pagehead">
        <div>
          <h1 style={{ fontSize: 21 }}>{p?.name}</h1>
          <div className="small muted" style={{ marginTop: 3 }}>
            {formatDateTime(t.submittedAtServer)} ·{" "}
            {userName(db, t.submitterId)}
          </div>
        </div>
        <div className="row wrap" style={{ justifyContent: "flex-end" }}>
          <span className="badge">
            <Icon name="lock" size={12} /> Locked
          </span>
          {t.urgent && <span className="badge danger">Urgent</span>}
          {issues.length > 0 ? (
            <span className="badge warn">
              {issues.map(tagLabel).join(", ")}
            </span>
          ) : (
            <span className="badge ok">Clean</span>
          )}
        </div>
      </div>

      <div className="card pad stack">
        <div className="photos">
          {t.photos.map((ph) => (
            <PhotoThumb key={ph.slot} photo={ph} enlargeable />
          ))}
        </div>
        {t.notes && (
          <div>
            <div className="label">Notes</div>
            <p className="small" style={{ margin: 0 }}>
              {t.notes}
            </p>
          </div>
        )}
      </div>

      {/* AI suggestions pending human confirmation */}
      {isOperator && pendingSuggestions.length > 0 && (
        <div className="card pad stack">
          <div className="label" style={{ marginBottom: 0 }}>
            AI suggestions awaiting confirmation{" "}
            <span className="mock-tag">AI mock</span>
          </div>
          {pendingSuggestions.map(({ slot, tag }) => (
            <div key={`${slot}:${tag}`} className="spread small">
              <span>
                AI flagged <strong>{tagLabel(tag)}</strong> on the {slot} shot
              </span>
              <button
                className="btn sm"
                onClick={() => {
                  toggleConfirmedTag(t.id, slot, tag);
                  flash("Confirmed");
                }}
              >
                Confirm
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Proof — the differentiator */}
      <div className="card pad stack">
        <div className="spread">
          <h3 style={{ fontSize: 17 }}>Proof</h3>
          <span className="row" style={{ gap: 7 }}>
            <span style={{ display: "inline-flex" }}>
              <Seal size={20} />
            </span>
            <span className="eyebrow" style={{ color: "var(--verified)" }}>
              Verified
            </span>
          </span>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <input className="input mono" readOnly value={link} />
          <button className="btn" onClick={copyLink}>
            <Icon name="link" size={14} /> Copy
          </button>
        </div>

        {isOperator && (
          <div className="row wrap">
            <button
              className="btn primary sm"
              onClick={() => share("Owner email")}
            >
              <Icon name="share" size={15} /> Share with owner
            </button>
            <button className="btn sm" onClick={() => share("Guest / Airbnb")}>
              <Icon name="share" size={15} /> Share with guest / Airbnb
            </button>
            <a
              className="btn ghost sm"
              href={link}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="link" size={15} /> Open public view
            </a>
          </div>
        )}

        {shareCount(t) > 0 ? (
          <div className="stack" style={{ gap: 6 }}>
            <div className="label" style={{ marginBottom: 0 }}>
              Shared {shareCount(t)}× · opened {openCount(t)}×
            </div>
            {t.shares.map((s, i) => (
              <div key={i} className="spread small muted">
                <span>
                  {s.channel} · {timeAgo(s.sharedAt)}
                </span>
                <span className={s.opens.length ? "badge ok" : "badge"}>
                  {s.opens.length
                    ? `opened ${s.opens.length}×`
                    : "not opened yet"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="tiny dim" style={{ margin: 0 }}>
            Not shared yet. Sharing + recipient opens are the wedge signal (PRD
            §12).
          </p>
        )}

        <hr className="divider" />
        <div className="row wrap small dim">
          <span className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" disabled>
              <Icon name="file" size={14} /> Signed PDF
            </button>
            <span className="mock-tag">fast-follow</span>
          </span>
          <span className="row" style={{ gap: 6 }}>
            <span className="badge">
              <Icon name="pin" size={12} /> Geofence
            </span>
            <span className="mock-tag">fast-follow</span>
          </span>
        </div>
      </div>

      {isOperator && (
        <div className="card pad stack">
          <div className="spread">
            <div className="label" style={{ marginBottom: 0 }}>
              AI owner summary <span className="mock-tag">AI mock</span>
            </div>
            <button className="btn sm" onClick={draftSummary}>
              <Icon name="sparkle" size={14} /> Draft summary
            </button>
          </div>
          {summary && (
            <>
              <textarea
                className="textarea mono small"
                rows={6}
                readOnly
                value={summary}
              />
              <button
                className="btn sm"
                style={{ alignSelf: "flex-start" }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summary);
                    flash("Summary copied");
                  } catch {
                    flash("Copy failed");
                  }
                }}
              >
                Copy summary
              </button>
            </>
          )}
        </div>
      )}

      <p className="tiny dim row" style={{ gap: 6, alignItems: "flex-start" }}>
        <Icon name="lock" size={13} style={{ marginTop: 1, flex: "none" }} />
        This record is locked and unchanged since submission. Corrections create
        a new turnover — the original is preserved.
      </p>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
