"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  addIssuePhotoAction,
  ensureDraftTurnoverAction,
  lockTurnoverAction,
  removeIssuePhotoAction,
  saveDraftReadingAction,
  saveGuidedPhotoAction,
  updateIssueCaptionAction,
  type DraftPhoto,
  type DraftSnapshot,
} from "@/lib/actions/turnover";
import {
  CAPTURE_V2_AFTER_SLOTS,
  CAPTURE_V2_BEFORE_SHOT,
  CLEANING_STEPS,
  type CapturePhase,
  type CleaningStepCode,
  type PhotoSlot,
} from "@/lib/types";
import { photoKey, REQUIRED_LOCK_PHOTOS } from "@/lib/capture-v2";
import { slotTint } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { track } from "@/lib/analytics";
import { Input, Label } from "@/components/ui";
import { photoPublicUrl } from "@/lib/supabase/storage";
import {
  CHEM_THRESHOLDS,
  WATER_TREATMENTS,
  alkalinityOutOfRange,
  calciumHardnessOutOfRange,
  phOutOfRange,
  sanitizerOutOfRange,
  tempHigh,
} from "@/lib/chemistry";

const numOrNull = (v: string): number | null => {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Props {
  propertyId: string;
  propertyName: string;
  initialDraft?: DraftSnapshot | null;
  resumeTurnoverId?: string | null;
}

const AFTER_COUNT = CAPTURE_V2_AFTER_SLOTS.length;
const STEP_BEFORE = 0;
const STEP_WATER = 1;
const STEP_AFTER_START = 2;
const STEP_SUBMIT = STEP_AFTER_START + AFTER_COUNT;

function defaultCleaningSteps(steps: CleaningStepCode[] | undefined): CleaningStepCode[] {
  if (steps && steps.length > 0) return steps;
  return CLEANING_STEPS.map((s) => s.code);
}

function guidedPhotoFromDraft(
  photos: DraftPhoto[],
  slot: PhotoSlot,
  phase: CapturePhase
): DraftPhoto | undefined {
  return photos.find((p) => p.slot === slot && p.phase === phase);
}

function issuePhotosFromDraft(photos: DraftPhoto[]): DraftPhoto[] {
  return photos.filter((p) => p.slot === "issue" && p.phase === "before");
}

function previewForPhoto(p: DraftPhoto | undefined): string | null {
  if (!p?.storagePath) return null;
  return photoPublicUrl(p.storagePath);
}

function hasRequiredPhotos(photos: DraftPhoto[]): boolean {
  const keys = new Set(
    photos.filter((p) => p.storagePath).map((p) => photoKey(p.slot, p.phase))
  );
  return REQUIRED_LOCK_PHOTOS.every(({ slot, phase }) =>
    keys.has(photoKey(slot, phase))
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving") {
    return <span className="badge dim small">Saving…</span>;
  }
  if (status === "saved") {
    return (
      <span className="badge ok small">
        <Icon name="check" size={12} /> Saved
      </span>
    );
  }
  return (
    <span className="badge warn small">
      <Icon name="alert" size={12} /> Save failed
    </span>
  );
}

export default function CaptureWizard({
  propertyId,
  propertyName,
  initialDraft,
  resumeTurnoverId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const guidedFileRef = useRef<HTMLInputElement | null>(null);
  const issueFileRef = useRef<HTMLInputElement | null>(null);

  const [draftLoading, setDraftLoading] = useState(!initialDraft);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftSnapshot | null>(initialDraft ?? null);

  const [step, setStep] = useState(STEP_BEFORE);
  const [processing, setProcessing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoSaveStatus, setPhotoSaveStatus] = useState<SaveStatus>("idle");
  const [readingSaveStatus, setReadingSaveStatus] = useState<SaveStatus>("idle");

  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [urgent, setUrgent] = useState(initialDraft?.urgent ?? false);
  const [cleaningSteps, setCleaningSteps] = useState<CleaningStepCode[]>(() =>
    defaultCleaningSteps(initialDraft?.cleaningSteps)
  );

  const [alkalinity, setAlkalinity] = useState(
    initialDraft?.reading?.total_alkalinity?.toString() ?? ""
  );
  const [ph, setPh] = useState(initialDraft?.reading?.ph?.toString() ?? "");
  const [calciumHardness, setCalciumHardness] = useState(
    initialDraft?.reading?.calcium_hardness?.toString() ?? ""
  );
  const [sanitizer, setSanitizer] = useState(
    initialDraft?.reading?.sanitizer_ppm?.toString() ?? ""
  );
  const [tempF, setTempF] = useState(
    initialDraft?.reading?.temp_f?.toString() ?? ""
  );
  const [treatments, setTreatments] = useState<string[]>(
    initialDraft?.reading?.treatments ?? []
  );
  const [treatmentNote, setTreatmentNote] = useState(
    initialDraft?.reading?.treatment_note ?? ""
  );
  const [balanced, setBalanced] = useState(
    initialDraft?.reading?.balanced ?? false
  );

  const turnoverId = draft?.turnoverId ?? null;

  const applyDraft = useCallback((snapshot: DraftSnapshot) => {
    setDraft(snapshot);
    setNotes(snapshot.notes);
    setUrgent(snapshot.urgent);
    setCleaningSteps(defaultCleaningSteps(snapshot.cleaningSteps));
    if (snapshot.reading) {
      setAlkalinity(snapshot.reading.total_alkalinity?.toString() ?? "");
      setPh(snapshot.reading.ph?.toString() ?? "");
      setCalciumHardness(snapshot.reading.calcium_hardness?.toString() ?? "");
      setSanitizer(snapshot.reading.sanitizer_ppm?.toString() ?? "");
      setTempF(snapshot.reading.temp_f?.toString() ?? "");
      setTreatments(snapshot.reading.treatments ?? []);
      setTreatmentNote(snapshot.reading.treatment_note ?? "");
      setBalanced(snapshot.reading.balanced ?? false);
    }
  }, []);

  useEffect(() => {
    track("turnover_started", { property_id: propertyId });
  }, [propertyId]);

  useEffect(() => {
    if (initialDraft) {
      applyDraft(initialDraft);
      setDraftLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setDraftLoading(true);
      setDraftError(null);
      try {
        const snapshot = await ensureDraftTurnoverAction(
          propertyId,
          resumeTurnoverId ?? null
        );
        if (!cancelled) applyDraft(snapshot);
      } catch (err) {
        if (!cancelled) {
          setDraftError(
            err instanceof Error ? err.message : "Could not start turnover draft."
          );
        }
      } finally {
        if (!cancelled) setDraftLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [propertyId, initialDraft, resumeTurnoverId, applyDraft]);

  useEffect(() => {
    return () => {
      Object.values(localPreviews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [localPreviews]);

  const onBefore = step === STEP_BEFORE;
  const onWater = step === STEP_WATER;
  const onSubmit = step === STEP_SUBMIT;
  const afterIndex =
    step >= STEP_AFTER_START && step < STEP_SUBMIT
      ? step - STEP_AFTER_START
      : -1;
  const onAfter = afterIndex >= 0;

  const beforeGuided = draft
    ? guidedPhotoFromDraft(
        draft.photos,
        CAPTURE_V2_BEFORE_SHOT.slot,
        "before"
      )
    : undefined;
  const issuePhotos = draft ? issuePhotosFromDraft(draft.photos) : [];

  const activeSlot = onBefore
    ? CAPTURE_V2_BEFORE_SHOT
    : onAfter
      ? CAPTURE_V2_AFTER_SLOTS[afterIndex]
      : null;
  const activePhase: CapturePhase | null = onBefore || onAfter ? (onBefore ? "before" : "after") : null;

  const activeGuidedKey =
    activeSlot && activePhase ? photoKey(activeSlot.slot, activePhase) : null;
  const activeGuidedDraft =
    activeSlot && activePhase
      ? guidedPhotoFromDraft(draft?.photos ?? [], activeSlot.slot, activePhase)
      : undefined;
  const activeGuidedPreview =
    (activeGuidedKey && localPreviews[activeGuidedKey]) ||
    previewForPhoto(activeGuidedDraft);

  const beforeDone = !!(
    beforeGuided?.storagePath ||
    localPreviews[photoKey(CAPTURE_V2_BEFORE_SHOT.slot, "before")]
  );
  const requiredPhotosDone = draft ? hasRequiredPhotos(draft.photos) : false;

  function setLocalPreview(key: string, blobUrl: string) {
    setLocalPreviews((prev) => {
      const old = prev[key];
      if (old) URL.revokeObjectURL(old);
      return { ...prev, [key]: blobUrl };
    });
  }

  function clearLocalPreview(key: string) {
    setLocalPreviews((prev) => {
      const old = prev[key];
      if (old) URL.revokeObjectURL(old);
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function openGuidedPicker() {
    setCaptureError(null);
    guidedFileRef.current?.click();
  }

  function openIssuePicker() {
    setCaptureError(null);
    issueFileRef.current?.click();
  }

  async function persistGuidedPhoto(
    file: File,
    slot: PhotoSlot,
    phase: CapturePhase,
    capturedAt: string
  ) {
    if (!turnoverId) throw new Error("Draft not ready");

    const key = photoKey(slot, phase);
    setPhotoSaveStatus("saving");
    setCaptureError(null);

    const fd = new FormData();
    fd.append("propertyId", propertyId);
    fd.append("turnoverId", turnoverId);
    fd.append("slot", slot);
    fd.append("phase", phase);
    fd.append("file", file);
    fd.append("capturedAt", capturedAt);

    try {
      const snapshot = await saveGuidedPhotoAction(fd);
      applyDraft(snapshot);
      clearLocalPreview(key);
      setPhotoSaveStatus("saved");
    } catch (err) {
      setPhotoSaveStatus("error");
      throw err;
    }
  }

  async function onGuidedFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeSlot || !activePhase || !turnoverId) return;

    setProcessing(true);
    setCaptureError(null);
    const capturedAt = new Date().toISOString();
    const key = photoKey(activeSlot.slot, activePhase);

    try {
      const blobUrl = URL.createObjectURL(file);
      setLocalPreview(key, blobUrl);
      await persistGuidedPhoto(file, activeSlot.slot, activePhase, capturedAt);
    } catch (err) {
      setCaptureError(
        err instanceof Error ? err.message : "Could not save that photo — try again."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function onIssueFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !turnoverId) return;

    setProcessing(true);
    setCaptureError(null);
    setPhotoSaveStatus("saving");

    const fd = new FormData();
    fd.append("propertyId", propertyId);
    fd.append("turnoverId", turnoverId);
    fd.append("file", file);
    fd.append("capturedAt", new Date().toISOString());

    try {
      const snapshot = await addIssuePhotoAction(fd);
      applyDraft(snapshot);
      setPhotoSaveStatus("saved");
    } catch (err) {
      setPhotoSaveStatus("error");
      setCaptureError(
        err instanceof Error ? err.message : "Could not add issue photo."
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleRemoveIssue(photoId: string) {
    if (!turnoverId) return;
    setPhotoSaveStatus("saving");
    setCaptureError(null);
    try {
      const snapshot = await removeIssuePhotoAction(
        photoId,
        turnoverId,
        propertyId
      );
      applyDraft(snapshot);
      setPhotoSaveStatus("saved");
    } catch (err) {
      setPhotoSaveStatus("error");
      setCaptureError(
        err instanceof Error ? err.message : "Could not remove photo."
      );
    }
  }

  async function handleIssueCaptionBlur(photoId: string, caption: string) {
    if (!turnoverId) return;
    const existing = issuePhotos.find((p) => p.id === photoId);
    if (!existing || (existing.caption ?? "") === caption.trim()) return;

    setPhotoSaveStatus("saving");
    try {
      const snapshot = await updateIssueCaptionAction(
        photoId,
        turnoverId,
        propertyId,
        caption
      );
      applyDraft(snapshot);
      setPhotoSaveStatus("saved");
    } catch {
      setPhotoSaveStatus("error");
    }
  }

  function buildReadingFormData(): FormData {
    const fd = new FormData();
    fd.append("propertyId", propertyId);
    fd.append("turnoverId", turnoverId ?? "");
    fd.append("total_alkalinity", alkalinity);
    fd.append("ph", ph);
    fd.append("calcium_hardness", calciumHardness);
    fd.append("sanitizer_ppm", sanitizer);
    fd.append("temp_f", tempF);
    fd.append("treatments", JSON.stringify(treatments));
    fd.append("treatment_note", treatmentNote);
    fd.append("balanced", String(balanced));
    return fd;
  }

  async function persistReading() {
    if (!turnoverId) return;
    setReadingSaveStatus("saving");
    try {
      const snapshot = await saveDraftReadingAction(buildReadingFormData());
      applyDraft(snapshot);
      setReadingSaveStatus("saved");
    } catch (err) {
      setReadingSaveStatus("error");
      throw err;
    }
  }

  async function leaveWaterStep() {
    try {
      await persistReading();
      setStep(STEP_AFTER_START);
    } catch (err) {
      setCaptureError(
        err instanceof Error ? err.message : "Could not save water reading."
      );
    }
  }

  function retakeGuided() {
    if (!activeSlot || !activePhase) return;
    const key = photoKey(activeSlot.slot, activePhase);
    clearLocalPreview(key);
    setCaptureError(null);
    setPhotoSaveStatus("idle");
    openGuidedPicker();
  }

  function handleLock() {
    if (!turnoverId || !requiredPhotosDone) return;

    const formData = buildReadingFormData();
    formData.append("notes", notes);
    formData.append("urgent", String(urgent));
    formData.append("cleaning_steps", JSON.stringify(cleaningSteps));

    setSubmitError(null);
    startTransition(async () => {
      try {
        const result = await lockTurnoverAction(formData);
        track("turnover_submitted", {
          property_id: propertyId,
          turnover_id: result.id,
        });
        Object.values(localPreviews).forEach((url) => URL.revokeObjectURL(url));
        router.push(`/t/${result.id}`);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Submission failed. Try again."
        );
      }
    });
  }

  function toggleCleaningStep(code: CleaningStepCode) {
    setCleaningSteps((arr) =>
      arr.includes(code) ? arr.filter((c) => c !== code) : [...arr, code]
    );
  }

  const segBg = (filled: boolean, active: boolean) =>
    filled ? "var(--brand)" : active ? "var(--brand-soft)" : "var(--line)";

  if (draftLoading) {
    return (
      <div className="stack" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="crumb">
          <Link href={`/p/${propertyId}`}>{propertyName}</Link> / New turnover
        </div>
        <div className="card pad stack" style={{ textAlign: "center" }}>
          <p className="muted">Starting turnover draft…</p>
        </div>
      </div>
    );
  }

  if (draftError || !draft) {
    return (
      <div className="stack" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="crumb">
          <Link href={`/p/${propertyId}`}>{propertyName}</Link> / New turnover
        </div>
        <div className="card pad stack">
          <p style={{ color: "var(--urgent)", margin: 0 }}>
            {draftError ?? "Could not load turnover draft."}
          </p>
          <Link href={`/p/${propertyId}`} className="btn ghost">
            ← Back to property
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack" style={{ maxWidth: 480, margin: "0 auto" }}>
      <input
        ref={guidedFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onGuidedFile}
      />
      <input
        ref={issueFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onIssueFile}
      />

      <div className="crumb">
        <Link href={`/p/${propertyId}`}>{propertyName}</Link> / New turnover
      </div>

      <div className="row" style={{ gap: 6 }}>
        <div
          title={CAPTURE_V2_BEFORE_SHOT.label}
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
        {CAPTURE_V2_AFTER_SLOTS.map((s, i) => (
          <div
            key={s.slot}
            title={`After — ${s.label}`}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 999,
              background: segBg(
                !!guidedPhotoFromDraft(draft.photos, s.slot, "after")
                  ?.storagePath ||
                  !!localPreviews[photoKey(s.slot, "after")] ||
                  step > STEP_AFTER_START + i,
                step === STEP_AFTER_START + i
              ),
            }}
          />
        ))}
        <div
          title="Submit"
          style={{
            flex: 1,
            height: 5,
            borderRadius: 999,
            background: onSubmit ? "var(--brand)" : "var(--line)",
          }}
        />
      </div>

      {onBefore && (
        <div className="card pad stack">
          <div className="spread">
            <h2 style={{ fontSize: 18 }}>{CAPTURE_V2_BEFORE_SHOT.label}</h2>
            <span className="badge">
              <Icon name="camera" size={12} /> Required
            </span>
          </div>
          <p className="muted small" style={{ marginTop: -6 }}>
            {CAPTURE_V2_BEFORE_SHOT.hint}
          </p>

          {activeGuidedPreview ? (
            <div style={{ maxWidth: 360, margin: "0 auto", width: "100%" }}>
              <img
                src={activeGuidedPreview}
                alt={CAPTURE_V2_BEFORE_SHOT.label}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  objectFit: "cover",
                  aspectRatio: "4/3",
                }}
              />
              <div
                className="row"
                style={{ justifyContent: "center", marginTop: 10, gap: 8 }}
              >
                <span className="badge ok">✓ Captured</span>
                <SaveIndicator status={photoSaveStatus} />
                <button type="button" className="btn ghost sm" onClick={retakeGuided}>
                  Retake
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openGuidedPicker}
              disabled={processing}
              aria-label="Capture the before full-frame shot"
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
                background: `radial-gradient(120% 85% at 28% 18%, rgba(255,255,255,.25), rgba(255,255,255,0) 55%), linear-gradient(150deg, ${slotTint(CAPTURE_V2_BEFORE_SHOT.slot)[0]}, ${slotTint(CAPTURE_V2_BEFORE_SHOT.slot)[1]})`,
              }}
            >
              <div style={{ textAlign: "center", opacity: 0.92 }}>
                <Icon name="camera" size={36} stroke={1.3} />
                <div className="small" style={{ marginTop: 4 }}>
                  {processing
                    ? "Processing…"
                    : "Tap to capture how you found it"}
                </div>
              </div>
            </button>
          )}

          <div className="stack" style={{ gap: 10, marginTop: 8 }}>
            <div className="spread">
              <div>
                <div className="label">Issue photos</div>
                <p className="tiny dim" style={{ margin: "2px 0 0" }}>
                  Optional — document problems you found
                </p>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={openIssuePicker}
                disabled={processing || !beforeDone}
              >
                <Icon name="plus" size={14} /> Add
              </button>
            </div>

            {issuePhotos.length > 0 && (
              <div className="stack" style={{ gap: 12 }}>
                {issuePhotos.map((p) => {
                  const preview = previewForPhoto(p);
                  return (
                    <div key={p.id} className="card pad stack" style={{ gap: 8 }}>
                      <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                        {preview && (
                          <img
                            src={preview}
                            alt="Issue"
                            style={{
                              width: 72,
                              height: 72,
                              objectFit: "cover",
                              borderRadius: 8,
                              flex: "none",
                            }}
                          />
                        )}
                        <div className="stack" style={{ flex: 1, gap: 6 }}>
                          <Input
                            placeholder="What's wrong? (optional caption)"
                            defaultValue={p.caption ?? ""}
                            onBlur={(e) =>
                              handleIssueCaptionBlur(p.id, e.target.value)
                            }
                          />
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => handleRemoveIssue(p.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {captureError && (
            <p
              className="small"
              style={{ color: "var(--urgent)", margin: 0, textAlign: "center" }}
            >
              {captureError}
            </p>
          )}

          <div className="spread">
            <button className="btn ghost" disabled>
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!beforeDone || photoSaveStatus === "saving"}
              onClick={() => setStep(STEP_WATER)}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {onAfter && activeSlot && activePhase && (
        <div className="card pad stack">
          <div className="spread">
            <h2 style={{ fontSize: 18 }}>
              {activeSlot.label}
              <span className="dim small" style={{ fontWeight: 500 }}>
                {" "}
                · After — guest-ready · step {afterIndex + 1} of {AFTER_COUNT}
              </span>
            </h2>
            <span className="badge">
              <Icon name="camera" size={12} /> Required
            </span>
          </div>
          <p className="muted small" style={{ marginTop: -6 }}>
            {activeSlot.hint}
          </p>

          {activeGuidedPreview ? (
            <div style={{ maxWidth: 360, margin: "0 auto", width: "100%" }}>
              <img
                src={activeGuidedPreview}
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
                style={{ justifyContent: "center", marginTop: 10, gap: 8 }}
              >
                <span className="badge ok">✓ Captured</span>
                <SaveIndicator status={photoSaveStatus} />
                <button type="button" className="btn ghost sm" onClick={retakeGuided}>
                  Retake
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={openGuidedPicker}
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
              onClick={() => setStep((s) => Math.max(STEP_BEFORE, s - 1))}
            >
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!activeGuidedPreview || photoSaveStatus === "saving"}
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
            Test the water as you found it, then log what you added. Skip any
            you didn&apos;t measure.
          </p>

          <p className="tiny dim" style={{ marginTop: -4 }}>
            Test in this order — alkalinity buffers pH, so it&apos;s balanced
            first.
          </p>

          <div className="stack" style={{ gap: 14 }}>
            <div>
              <Label htmlFor="alkalinity">Total Alkalinity (ppm)</Label>
              <Input
                id="alkalinity"
                type="number"
                inputMode="decimal"
                step="1"
                placeholder={`${CHEM_THRESHOLDS.alkalinity.min}–${CHEM_THRESHOLDS.alkalinity.max} ppm`}
                value={alkalinity}
                onChange={(e) => setAlkalinity(e.target.value)}
              />
              {alkalinityOutOfRange(numOrNull(alkalinity)) && (
                <p
                  className="tiny"
                  style={{ color: "var(--pending)", margin: "6px 0 0" }}
                >
                  Outside {CHEM_THRESHOLDS.alkalinity.min}–
                  {CHEM_THRESHOLDS.alkalinity.max} ppm — adjust before pH.
                </p>
              )}
            </div>
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
              <Label htmlFor="calcium_hardness">Calcium Hardness (ppm)</Label>
              <Input
                id="calcium_hardness"
                type="number"
                inputMode="decimal"
                step="1"
                placeholder={`${CHEM_THRESHOLDS.calciumHardness.min}–${CHEM_THRESHOLDS.calciumHardness.max} ppm`}
                value={calciumHardness}
                onChange={(e) => setCalciumHardness(e.target.value)}
              />
              {calciumHardnessOutOfRange(numOrNull(calciumHardness)) && (
                <p
                  className="tiny"
                  style={{ color: "var(--pending)", margin: "6px 0 0" }}
                >
                  Outside {CHEM_THRESHOLDS.calciumHardness.min}–
                  {CHEM_THRESHOLDS.calciumHardness.max} ppm.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="sanitizer">
                Sanitizer — Chlorine/Bromine (ppm)
              </Label>
              <Input
                id="sanitizer"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={`${CHEM_THRESHOLDS.sanitizerPpm.min}–${CHEM_THRESHOLDS.sanitizerPpm.max} ppm`}
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
              <Label htmlFor="temp_f">Water temperature (°F)</Label>
              <Input
                id="temp_f"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder={`≤ ${CHEM_THRESHOLDS.tempF.max}°F`}
                value={tempF}
                onChange={(e) => setTempF(e.target.value)}
              />
              {tempHigh(numOrNull(tempF)) && (
                <p
                  className="tiny"
                  style={{ color: "var(--pending)", margin: "6px 0 0" }}
                >
                  Above {CHEM_THRESHOLDS.tempF.max}°F — many jurisdictions require
                  logged temp ≤104°F.
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

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <SaveIndicator status={readingSaveStatus} />
          </div>

          <div className="spread">
            <button className="btn ghost" onClick={() => setStep(STEP_BEFORE)}>
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={readingSaveStatus === "saving"}
              onClick={() => void leaveWaterStep()}
            >
              After set →
            </button>
          </div>
        </div>
      )}

      {onSubmit && (
        <div className="card pad stack">
          <h2 style={{ fontSize: 18 }}>Review &amp; lock</h2>

          <div
            className={requiredPhotosDone ? "note row" : "note warn row"}
            style={{ gap: 9, alignItems: "flex-start" }}
          >
            <Icon
              name={requiredPhotosDone ? "check" : "alert"}
              size={16}
              style={{
                flex: "none",
                marginTop: 1,
                color: requiredPhotosDone ? "var(--verd)" : "var(--ox)",
              }}
            />
            <span>
              {requiredPhotosDone
                ? "All four required guided photos captured."
                : "Required photos missing — before full-frame, after water-level, after full-frame, and cover."}
            </span>
          </div>

          <div>
            <div className="label">Cleaning checklist</div>
            <div className="stack" style={{ gap: 8, marginTop: 6 }}>
              {CLEANING_STEPS.map((s) => {
                const checked = cleaningSteps.includes(s.code);
                return (
                  <label key={s.code} className="row small" style={{ gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCleaningStep(s.code)}
                    />
                    <span>{s.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <div className="label">How it was found</div>
            <div className="photos">
              {previewForPhoto(beforeGuided) && (
                <img
                  src={previewForPhoto(beforeGuided)!}
                  alt={CAPTURE_V2_BEFORE_SHOT.label}
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
              )}
              {issuePhotos.map(
                (p) =>
                  previewForPhoto(p) && (
                    <img
                      key={p.id}
                      src={previewForPhoto(p)!}
                      alt="Issue"
                      title={p.caption ?? undefined}
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
            <div className="label">Guest-ready</div>
            <div className="photos">
              {CAPTURE_V2_AFTER_SLOTS.map((s) => {
                const p = guidedPhotoFromDraft(draft.photos, s.slot, "after");
                const url = previewForPhoto(p);
                return (
                  url && (
                    <img
                      key={s.slot}
                      src={url}
                      alt={s.label}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: "cover",
                        borderRadius: 8,
                      }}
                    />
                  )
                );
              })}
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
              onClick={() => setStep(STEP_SUBMIT - 1)}
            >
              ← Back
            </button>
            <button
              className="btn primary"
              disabled={!requiredPhotosDone || isPending}
              onClick={handleLock}
            >
              {isPending ? (
                "Locking…"
              ) : (
                <>
                  <Icon name="lock" size={15} /> Lock turnover
                </>
              )}
            </button>
          </div>
          <p className="tiny dim" style={{ textAlign: "center", margin: 0 }}>
            Locking saves your reading and checklist, then creates a shareable
            proof link with a server timestamp.
          </p>
        </div>
      )}
    </div>
  );
}
