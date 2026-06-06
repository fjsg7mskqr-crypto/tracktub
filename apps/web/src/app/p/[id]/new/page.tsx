"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDB, addTurnover } from "@/lib/store";
import { propertyById, currentUser, canCapture } from "@/lib/selectors";
import { PHOTO_SLOTS } from "@/lib/types";
import type { IssueTag, Photo, PhotoSlot } from "@/lib/types";
import { slotTint, tagLabel } from "@/lib/format";
import { PhotoThumb } from "@/components/PhotoThumb";
import { Icon } from "@/components/Icon";

function suggestFor(slot: PhotoSlot, simulate: boolean): IssueTag[] {
  if (!simulate) return [];
  if (slot === "waterline") return ["water_cloudy"];
  if (slot === "panel") return ["panel_error"];
  return ["debris"];
}

export default function NewTurnover() {
  const pid = String(useParams().id);
  const router = useRouter();
  const db = useDB();

  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<(Photo | null)[]>(() =>
    PHOTO_SLOTS.map(() => null)
  );
  const [simIssue, setSimIssue] = useState(false);
  const [notes, setNotes] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  if (!db) return <div className="skeleton">Loading…</div>;
  const p = propertyById(db, pid);
  if (!p) return <div className="empty">Property not found.</div>;
  if (!canCapture(db, pid))
    return (
      <div className="empty">
        This role can&apos;t capture turnovers.{" "}
        <Link href={`/p/${pid}`}>Back to property</Link>
      </div>
    );

  const total = PHOTO_SLOTS.length;
  const onReview = step >= total;
  const slot = onReview ? null : PHOTO_SLOTS[step];
  const capturedHere = !onReview && photos[step] != null;
  const allCaptured = photos.every((x) => x != null);

  function capture() {
    if (!slot) return;
    const ph: Photo = {
      slot: slot.slot,
      dataUrl: null,
      capturedAt: new Date().toISOString(),
      suggestedTags: suggestFor(slot.slot, simIssue),
      confirmedTags: [],
    };
    setPhotos((prev) => prev.map((x, i) => (i === step ? ph : x)));
  }
  function retake() {
    setPhotos((prev) => prev.map((x, i) => (i === step ? null : x)));
  }

  const suggestions = photos.flatMap((ph) =>
    ph ? ph.suggestedTags.map((tag) => ({ slot: ph.slot, tag })) : []
  );
  function toggleConfirm(key: string) {
    setConfirmed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submit() {
    if (!db) return;
    const finalPhotos: Photo[] = photos
      .filter((x): x is Photo => x != null)
      .map((ph) => ({
        ...ph,
        confirmedTags: ph.suggestedTags.filter((tag) =>
          confirmed.has(`${ph.slot}:${tag}`)
        ),
      }));
    const anyConfirmed = finalPhotos.some((ph) => ph.confirmedTags.length > 0);
    const tid = addTurnover(pid, currentUser(db).id, {
      photos: finalPhotos,
      notes,
      urgent: urgent || anyConfirmed,
    });
    router.push(`/t/${tid}`);
  }

  return (
    <div className="stack" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="crumb">
        <Link href={`/p/${pid}`}>{p.name}</Link> / New turnover
      </div>

      {/* progress */}
      <div className="row" style={{ gap: 6 }}>
        {PHOTO_SLOTS.map((s, i) => (
          <div
            key={s.slot}
            title={s.label}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 999,
              background:
                i < step || photos[i]
                  ? "var(--brand)"
                  : i === step
                  ? "var(--brand-soft)"
                  : "var(--line)",
            }}
          />
        ))}
        <div
          title="Review"
          style={{
            flex: 1,
            height: 5,
            borderRadius: 999,
            background: onReview ? "var(--brand)" : "var(--line)",
          }}
        />
      </div>

      {!onReview && slot && (
        <div className="card pad stack">
          <div className="spread">
            <h2 style={{ fontSize: 18 }}>
              {slot.label}
              <span className="dim small" style={{ fontWeight: 500 }}>
                {" "}
                · step {step + 1} of {total}
              </span>
            </h2>
            <span className="badge">
              <Icon name="camera" size={12} /> Required
            </span>
          </div>
          <p className="muted small" style={{ marginTop: -6 }}>
            {slot.hint}
          </p>

          {/* viewfinder */}
          {capturedHere ? (
            <div style={{ maxWidth: 360, margin: "0 auto", width: "100%" }}>
              <PhotoThumb photo={photos[step] as Photo} />
              <div className="row" style={{ justifyContent: "center", marginTop: 10 }}>
                <span className="badge ok">✓ Captured</span>
                <button className="btn ghost sm" onClick={retake}>
                  Retake
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                aspectRatio: "4 / 3",
                maxWidth: 360,
                margin: "0 auto",
                width: "100%",
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                background: `radial-gradient(120% 85% at 28% 18%, rgba(255,255,255,.25), rgba(255,255,255,0) 55%), linear-gradient(150deg, ${slotTint(slot.slot)[0]}, ${slotTint(slot.slot)[1]})`,
              }}
            >
              <div style={{ textAlign: "center", opacity: 0.92 }}>
                <Icon name="camera" size={36} stroke={1.3} />
                <div className="small" style={{ marginTop: 4 }}>
                  Point at the {slot.label.toLowerCase()}
                </div>
              </div>
            </div>
          )}

          {!capturedHere && (slot.slot === "waterline" || slot.slot === "panel") && (
            <label className="row small" style={{ justifyContent: "center", gap: 7 }}>
              <input
                type="checkbox"
                checked={simIssue}
                onChange={(e) => setSimIssue(e.target.checked)}
              />
              Simulate an issue in this shot{" "}
              <span className="mock-tag">demo</span>
            </label>
          )}

          {!capturedHere && (
            <button className="btn primary block" onClick={capture}>
              <Icon name="camera" size={16} /> Capture {slot.label.toLowerCase()}
            </button>
          )}

          <div className="spread">
            <button
              className="btn ghost"
              disabled={step === 0}
              onClick={() => {
                setSimIssue(false);
                setStep((s) => Math.max(0, s - 1));
              }}
            >
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!capturedHere}
              onClick={() => {
                setSimIssue(false);
                setStep((s) => s + 1);
              }}
            >
              {step === total - 1 ? "Review →" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {onReview && (
        <div className="card pad stack">
          <h2 style={{ fontSize: 18 }}>Review &amp; submit</h2>

          <div
            className={allCaptured ? "note row" : "note warn row"}
            style={{ gap: 9, alignItems: "flex-start" }}
          >
            <Icon
              name={allCaptured ? "check" : "alert"}
              size={16}
              style={{
                flex: "none",
                marginTop: 1,
                color: allCaptured ? "var(--verd)" : "var(--ox)",
              }}
            />
            <span>
              {allCaptured
                ? "Photo completeness check passed — all 4 required shots captured."
                : "Some required shots are missing."}{" "}
              <span className="mock-tag">AI mock</span>
            </span>
          </div>

          <div className="photos">
            {photos.map(
              (ph) => ph && <PhotoThumb key={ph.slot} photo={ph} />
            )}
          </div>

          <div>
            <div className="label">AI photo review — confirm or ignore</div>
            {suggestions.length === 0 ? (
              <div className="small muted">No issues detected. ✓</div>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {suggestions.map(({ slot: s, tag }) => {
                  const key = `${s}:${tag}`;
                  const on = confirmed.has(key);
                  return (
                    <label
                      key={key}
                      className="spread small"
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 10,
                        padding: "8px 11px",
                        cursor: "pointer",
                      }}
                    >
                      <span>
                        AI suggests <strong>{tagLabel(tag)}</strong> on the {s} shot
                      </span>
                      <span className="row" style={{ gap: 7 }}>
                        <span className={on ? "badge ok" : "badge"}>
                          {on ? "Confirmed" : "Tap to confirm"}
                        </span>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleConfirm(key)}
                        />
                      </span>
                    </label>
                  );
                })}
                <p className="tiny dim" style={{ margin: 0 }}>
                  AI suggests; a human confirms. Only confirmed tags become part
                  of the record (PRD principle).
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="notes">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              className="textarea"
              rows={3}
              placeholder="Smells, panel readouts, guest-reported issues…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <label className="row small" style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
            />
            Mark <strong>urgent</strong> — needs attention before next check-in
          </label>

          <div className="spread">
            <button className="btn ghost" onClick={() => setStep(total - 1)}>
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!allCaptured}
              onClick={submit}
            >
              <Icon name="lock" size={15} /> Submit &amp; lock turnover
            </button>
          </div>
          <p className="tiny dim" style={{ textAlign: "center", margin: 0 }}>
            Submitting locks the record with a server timestamp and creates a
            shareable proof link.
          </p>
        </div>
      )}
    </div>
  );
}
