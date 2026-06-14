"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitTurnoverAction } from "@/lib/actions/turnover";
import { PHOTO_SLOTS, BEFORE_SHOT } from "@/lib/types";
import type { PhotoSlot } from "@/lib/types";
import { slotTint } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { track } from "@/lib/analytics";
import { Input, Label } from "@/components/ui";
import {
  CHEM_THRESHOLDS,
  WATER_TREATMENTS,
  phOutOfRange,
  sanitizerOutOfRange,
  tempOutOfRange,
} from "@/lib/chemistry";

const numOrNull = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

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

// Step flow (founder's intended order):
//   0          = BEFORE — one "as found" shot
//   1          = chemistry / water check
//   2..2+N-1   = AFTER — the guided N-slot guest-ready set
//   2+N        = review & submit
const AFTER_COUNT = PHOTO_SLOTS.length;
const STEP_BEFORE = 0;
const STEP_WATER = 1;
const STEP_AFTER_START = 2;
const STEP_REVIEW = STEP_AFTER_START + AFTER_COUNT;

export default function CaptureWizard({ propertyId, propertyName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState(STEP_BEFORE);
  const [beforePhoto, setBeforePhoto] = useState<CapturedPhoto | null>(null);
  const [afterPhotos, setAfterPhotos] = useState<(CapturedPhoto | null)[]>(() =>
    PHOTO_SLOTS.map(() => null)
  );
  const [processing, setProcessing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [ph, setPh] = useState("");
  const [sanitizer, setSanitizer] = useState("");
  const [temp, setTemp] = useState("");
  const [treatments, setTreatments] = useState<string[]>([]);
  const [treatmentNote, setTreatmentNote] = useState("");
  const [balanced, setBalanced] = useState(false);

  useEffect(() => {
    track("turnover_started", { property_id: propertyId });
  }, [propertyId]);

  const onBefore = step === STEP_BEFORE;
  const onWater = step === STEP_WATER;
  const onReview = step === STEP_REVIEW;
  const afterIndex =
    step >= STEP_AFTER_START && step < STEP_REVIEW
      ? step - STEP_AFTER_START
      : -1;
  const onAfter = afterIndex >= 0;

  // The capture tile is shared by the before shot and each after slot.
  const activeSlot = onBefore
    ? BEFORE_SHOT
    : onAfter
      ? PHOTO_SLOTS[afterIndex]
      : null;
  const activeCaptured = onBefore
    ? beforePhoto
    : onAfter
      ? afterPhotos[afterIndex]
      : null;

  const beforeDone = beforePhoto != null;
  const afterDone = afterPhotos.every((x) => x != null);
  const allCaptured = beforeDone && afterDone;

  function openPicker() {
    setCaptureError(null);
    fileRef.current?.click();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeSlot) return;
    setProcessing(true);
    setCaptureError(null);
    try {
      const captured: CapturedPhoto = {
        slot: activeSlot.slot,
        file,
        previewUrl: URL.createObjectURL(file),
        capturedAt: new Date().toISOString(),
      };
      if (onBefore) {
        if (beforePhoto) URL.revokeObjectURL(beforePhoto.previewUrl);
        setBeforePhoto(captured);
      } else if (onAfter) {
        const idx = afterIndex;
        const prev = afterPhotos[idx];
        if (prev) URL.revokeObjectURL(prev.previewUrl);
        setAfterPhotos((arr) => arr.map((x, i) => (i === idx ? captured : x)));
      }
    } catch {
      setCaptureError("Could not load that photo — try another.");
    } finally {
      setProcessing(false);
    }
  }

  function retake() {
    if (onBefore) {
      if (beforePhoto) URL.revokeObjectURL(beforePhoto.previewUrl);
      setBeforePhoto(null);
    } else if (onAfter) {
      const idx = afterIndex;
      const prev = afterPhotos[idx];
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      setAfterPhotos((arr) => arr.map((x, i) => (i === idx ? null : x)));
    }
    setCaptureError(null);
    openPicker();
  }

  function handleSubmit() {
    if (!allCaptured) return;
    const formData = new FormData();
    formData.append("propertyId", propertyId);
    formData.append("notes", notes);
    formData.append("urgent", String(urgent));
    formData.append("ph", ph);
    formData.append("sanitizer_ppm", sanitizer);
    formData.append("temp_f", temp);
    formData.append("treatments", JSON.stringify(treatments));
    formData.append("treatment_note", treatmentNote);
    formData.append("balanced", String(balanced));
    if (beforePhoto) {
      formData.append("photo_before", beforePhoto.file);
      formData.append("capturedAt_before", beforePhoto.capturedAt);
    }
    for (const p of afterPhotos) {
      if (!p) continue;
      formData.append(`photo_${p.slot}`, p.file);
      formData.append(`capturedAt_${p.slot}`, p.capturedAt);
      formData.append(`tags_${p.slot}`, JSON.stringify([]));
    }
    setSubmitError(null);
    startTransition(async () => {
      try {
        const result = await submitTurnoverAction(formData);
        track("turnover_submitted", {
          property_id: propertyId,
          turnover_id: result.id,
        });
        if (beforePhoto) URL.revokeObjectURL(beforePhoto.previewUrl);
        afterPhotos.forEach((p) => p && URL.revokeObjectURL(p.previewUrl));
        router.push(`/t/${result.id}`);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Submission failed. Try again."
        );
      }
    });
  }

  const segBg = (filled: boolean, active: boolean) =>
    filled ? "var(--brand)" : active ? "var(--brand-soft)" : "var(--line)";

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

      {/* progress: 1 before · 1 water · N after · review */}
      <div className="row" style={{ gap: 6 }}>
        <div
          title={BEFORE_SHOT.label}
          style={{
            flex: 1,
            height: 5,
            borderRadius: 999,
            background: segBg(beforeDone, onBefore),
          }}
        />
        <div
          title="Water check"
          style={{
            flex: 1,
            height: 5,
            borderRadius: 999,
            background: segBg(step > STEP_WATER, onWater),
          }}
        />
        {PHOTO_SLOTS.map((s, i) => (
          <div
            key={s.slot}
            title={`After — ${s.label}`}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 999,
              background: segBg(
                afterPhotos[i] != null || step > STEP_AFTER_START + i,
                step === STEP_AFTER_START + i
              ),
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

      {(onBefore || onAfter) && activeSlot && (
        <div className="card pad stack">
          <div className="spread">
            <h2 style={{ fontSize: 18 }}>
              {activeSlot.label}
              {onAfter && (
                <span className="dim small" style={{ fontWeight: 500 }}>
                  {" "}
                  · After — guest-ready · step {afterIndex + 1} of {AFTER_COUNT}
                </span>
              )}
            </h2>
            <span className="badge">
              <Icon name="camera" size={12} /> Required
            </span>
          </div>
          <p className="muted small" style={{ marginTop: -6 }}>
            {activeSlot.hint}
          </p>

          {activeCaptured ? (
            <div style={{ maxWidth: 360, margin: "0 auto", width: "100%" }}>
              <img
                src={activeCaptured.previewUrl}
                alt={activeSlot.label}
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
              aria-label={`Capture the ${activeSlot.label.toLowerCase()}`}
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
                background: `radial-gradient(120% 85% at 28% 18%, rgba(255,255,255,.25), rgba(255,255,255,0) 55%), linear-gradient(150deg, ${slotTint(activeSlot.slot)[0]}, ${slotTint(activeSlot.slot)[1]})`,
              }}
            >
              <div style={{ textAlign: "center", opacity: 0.92 }}>
                <Icon name="camera" size={36} stroke={1.3} />
                <div className="small" style={{ marginTop: 4 }}>
                  {processing
                    ? "Processing…"
                    : `Tap to capture the ${activeSlot.label.toLowerCase()}`}
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
              disabled={onBefore}
              onClick={() => setStep((s) => Math.max(STEP_BEFORE, s - 1))}
            >
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!activeCaptured}
              onClick={() => setStep((s) => s + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {onWater && (
        <div className="card pad stack">
          <div className="spread">
            <h2 style={{ fontSize: 18 }}>Water — as found</h2>
            <span className="badge">Optional</span>
          </div>
          <p className="muted small" style={{ marginTop: -6 }}>
            Test the water as you found it, then log what you added. Skip any you
            didn&apos;t measure.
          </p>

          <div className="stack" style={{ gap: 14 }}>
            <div>
              <Label htmlFor="ph">pH</Label>
              <Input
                id="ph"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={`${CHEM_THRESHOLDS.ph.min}–${CHEM_THRESHOLDS.ph.max}`}
                value={ph}
                onChange={(e) => setPh(e.target.value)}
              />
              {phOutOfRange(numOrNull(ph)) && (
                <p
                  className="tiny"
                  style={{ color: "var(--pending)", margin: "6px 0 0" }}
                >
                  Outside {CHEM_THRESHOLDS.ph.min}–{CHEM_THRESHOLDS.ph.max} —
                  re-balance before the next guest.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="sanitizer">Sanitizer (ppm)</Label>
              <Input
                id="sanitizer"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={`${CHEM_THRESHOLDS.sanitizerPpm.min}–${CHEM_THRESHOLDS.sanitizerPpm.max} ppm chlorine`}
                value={sanitizer}
                onChange={(e) => setSanitizer(e.target.value)}
              />
              {sanitizerOutOfRange(numOrNull(sanitizer)) && (
                <p
                  className="tiny"
                  style={{ color: "var(--pending)", margin: "6px 0 0" }}
                >
                  Outside {CHEM_THRESHOLDS.sanitizerPpm.min}–
                  {CHEM_THRESHOLDS.sanitizerPpm.max} ppm — re-shock and retest.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="temp">Temperature (°F)</Label>
              <Input
                id="temp"
                type="number"
                inputMode="decimal"
                step="1"
                placeholder={`≤ ${CHEM_THRESHOLDS.tempF.max}°F`}
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
              />
              {tempOutOfRange(numOrNull(temp)) && (
                <p
                  className="tiny"
                  style={{ color: "var(--pending)", margin: "6px 0 0" }}
                >
                  Above {CHEM_THRESHOLDS.tempF.max}°F — let it cool before
                  guests use it.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="treatments">What you added</Label>
            <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
              {WATER_TREATMENTS.map((t) => {
                const on = treatments.includes(t.code);
                return (
                  <button
                    key={t.code}
                    type="button"
                    className="btn ghost sm"
                    aria-pressed={on}
                    onClick={() =>
                      setTreatments((arr) =>
                        on ? arr.filter((c) => c !== t.code) : [...arr, t.code]
                      )
                    }
                    style={{
                      borderColor: on
                        ? "var(--brand-blue-line)"
                        : "var(--border)",
                      background: on ? "var(--brand-blue-dim)" : "transparent",
                      color: on ? "var(--text-hi)" : "var(--text-lo)",
                    }}
                  >
                    {on ? "✓ " : ""}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="treatment_note">Other / amounts (optional)</Label>
            <Input
              id="treatment_note"
              placeholder="e.g. 2 oz dichlor, added antifoam"
              value={treatmentNote}
              onChange={(e) => setTreatmentNote(e.target.value)}
            />
          </div>

          <label className="row small" style={{ gap: 8 }}>
            <input
              type="checkbox"
              checked={balanced}
              onChange={(e) => setBalanced(e.target.checked)}
            />
            <span>
              Left <strong>balanced &amp; guest-ready</strong>
            </span>
          </label>

          <div className="spread">
            <button className="btn ghost" onClick={() => setStep(STEP_BEFORE)}>
              ← Back
            </button>
            <button
              className="btn primary"
              onClick={() => setStep(STEP_AFTER_START)}
            >
              After set →
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
                ? `Before shot + all ${AFTER_COUNT} guest-ready shots captured.`
                : "Some required shots are missing."}
            </span>
          </div>

          <div>
            <div className="label">How it was found</div>
            <div className="photos">
              {beforePhoto && (
                <img
                  src={beforePhoto.previewUrl}
                  alt={BEFORE_SHOT.label}
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
              )}
            </div>
          </div>

          <div>
            <div className="label">Guest-ready</div>
            <div className="photos">
              {afterPhotos.map(
                (p) =>
                  p && (
                    <img
                      key={p.slot}
                      src={p.previewUrl}
                      alt={p.slot}
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
            <button
              className="btn ghost"
              onClick={() => setStep(STEP_REVIEW - 1)}
            >
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
