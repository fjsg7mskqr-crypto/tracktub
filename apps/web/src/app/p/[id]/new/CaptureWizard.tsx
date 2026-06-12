"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitTurnoverAction } from "@/lib/actions/turnover";
import { PHOTO_SLOTS } from "@/lib/types";
import type { PhotoSlot } from "@/lib/types";
import { slotTint } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { track } from "@/lib/analytics";

interface CapturedPhoto {
  slot: PhotoSlot;
  file: File;
  previewUrl: string;
  capturedAt: string;
}

interface Props {
  propertyId: string;
  propertyName: string;
}

export default function CaptureWizard({ propertyId, propertyName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<(CapturedPhoto | null)[]>(() =>
    PHOTO_SLOTS.map(() => null)
  );
  const [processing, setProcessing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    track("turnover_started", { property_id: propertyId });
  }, [propertyId]);

  const total = PHOTO_SLOTS.length;
  const onReview = step >= total;
  const slot = onReview ? null : PHOTO_SLOTS[step];
  const capturedHere = !onReview && photos[step] != null;
  const allCaptured = photos.every((x) => x != null);

  function openPicker() {
    setCaptureError(null);
    fileRef.current?.click();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !slot) return;
    setProcessing(true);
    setCaptureError(null);
    try {
      const prev = photos[step];
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      const captured: CapturedPhoto = {
        slot: slot.slot,
        file,
        previewUrl: URL.createObjectURL(file),
        capturedAt: new Date().toISOString(),
      };
      setPhotos((prev) => prev.map((x, i) => (i === step ? captured : x)));
    } catch {
      setCaptureError("Could not load that photo — try another.");
    } finally {
      setProcessing(false);
    }
  }

  function retake() {
    const prev = photos[step];
    if (prev) URL.revokeObjectURL(prev.previewUrl);
    setPhotos((prev) => prev.map((x, i) => (i === step ? null : x)));
    setCaptureError(null);
    openPicker();
  }

  function handleSubmit() {
    if (!allCaptured) return;
    const formData = new FormData();
    formData.append("propertyId", propertyId);
    formData.append("notes", notes);
    formData.append("urgent", String(urgent));
    for (const ph of photos) {
      if (!ph) continue;
      formData.append(`photo_${ph.slot}`, ph.file);
      formData.append(`capturedAt_${ph.slot}`, ph.capturedAt);
      formData.append(`tags_${ph.slot}`, JSON.stringify([]));
    }
    setSubmitError(null);
    startTransition(async () => {
      try {
        const result = await submitTurnoverAction(formData);
        track("turnover_submitted", {
          property_id: propertyId,
          turnover_id: result.id,
        });
        photos.forEach((ph) => ph && URL.revokeObjectURL(ph.previewUrl));
        router.push(`/t/${result.id}`);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Submission failed. Try again."
        );
      }
    });
  }

  return (
    <div className="stack" style={{ maxWidth: 480, margin: "0 auto" }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
      />

      <div className="crumb">
        <Link href={`/p/${propertyId}`}>{propertyName}</Link> / New turnover
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

          {capturedHere ? (
            <div style={{ maxWidth: 360, margin: "0 auto", width: "100%" }}>
              <img
                src={(photos[step] as CapturedPhoto).previewUrl}
                alt={slot.label}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  objectFit: "cover",
                  aspectRatio: "4/3",
                }}
              />
              <div
                className="row"
                style={{ justifyContent: "center", marginTop: 10 }}
              >
                <span className="badge ok">✓ Captured</span>
                <button className="btn ghost sm" onClick={retake}>
                  Retake
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openPicker}
              disabled={processing}
              aria-label={`Capture the ${slot.label.toLowerCase()}`}
              style={{
                appearance: "none",
                font: "inherit",
                border: "none",
                aspectRatio: "4 / 3",
                maxWidth: 360,
                margin: "0 auto",
                width: "100%",
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                cursor: processing ? "default" : "pointer",
                background: `radial-gradient(120% 85% at 28% 18%, rgba(255,255,255,.25), rgba(255,255,255,0) 55%), linear-gradient(150deg, ${slotTint(slot.slot)[0]}, ${slotTint(slot.slot)[1]})`,
              }}
            >
              <div style={{ textAlign: "center", opacity: 0.92 }}>
                <Icon name="camera" size={36} stroke={1.3} />
                <div className="small" style={{ marginTop: 4 }}>
                  {processing
                    ? "Processing…"
                    : `Tap to capture the ${slot.label.toLowerCase()}`}
                </div>
              </div>
            </button>
          )}

          {captureError && (
            <p
              className="small"
              style={{ color: "var(--urgent)", margin: 0, textAlign: "center" }}
            >
              {captureError}
            </p>
          )}

          <div className="spread">
            <button
              className="btn ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!capturedHere}
              onClick={() => setStep((s) => s + 1)}
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
                ? "All 4 required shots captured."
                : "Some required shots are missing."}
            </span>
          </div>

          <div className="photos">
            {photos.map(
              (ph) =>
                ph && (
                  <img
                    key={ph.slot}
                    src={ph.previewUrl}
                    alt={ph.slot}
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                )
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

          {submitError && (
            <div
              className="note warn row"
              style={{ gap: 9, alignItems: "flex-start" }}
            >
              <Icon
                name="alert"
                size={16}
                style={{ flex: "none", marginTop: 1, color: "var(--ox)" }}
              />
              <span>{submitError}</span>
            </div>
          )}

          <div className="spread">
            <button className="btn ghost" onClick={() => setStep(total - 1)}>
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!allCaptured || isPending}
              onClick={handleSubmit}
            >
              {isPending ? (
                "Uploading…"
              ) : (
                <>
                  <Icon name="lock" size={15} /> Submit &amp; lock turnover
                </>
              )}
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
