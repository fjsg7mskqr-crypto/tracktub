"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CaptureAnchor } from "@/components/field/CaptureAnchor";
import { FieldButton } from "@/components/field/FieldButton";
import type { DraftPhoto, DraftSnapshot } from "@/lib/actions/turnover";
import {
  CAPTURE_STEP_AFTER_START,
  CAPTURE_STEP_BEFORE,
  CAPTURE_STEP_SUBMIT,
  CAPTURE_STEP_WATER,
  REQUIRED_LOCK_PHOTOS,
} from "@/lib/capture-v2";
import {
  CAPTURE_V2_AFTER_SLOTS,
  CAPTURE_V2_BEFORE_SHOT,
  type CapturePhase,
  type PhotoSlot,
} from "@/lib/types";

const AFTER_COUNT = CAPTURE_V2_AFTER_SLOTS.length;
// before + water + each after slot + finish
const TOTAL_STEPS = 2 + AFTER_COUNT + 1;

function storedPathFor(
  photos: DraftPhoto[],
  slot: PhotoSlot,
  phase: CapturePhase
): string | null {
  return (
    photos.find((p) => p.slot === slot && p.phase === phase)?.storagePath ?? null
  );
}

/**
 * The camera-anchored capture controller (Task 3). Sequences the guided flow —
 * before photo → water → after photos → finish — starting at the resume step
 * computed server-side. Every photo persists immediately through
 * `CaptureAnchor`, so the flow is fully resumable with no timers.
 *
 * The water and finish steps are intentionally thin here: `ChemistryStep`
 * (Task 4) and `FinishProof` (Task 5) drop into the marked seams below. Nothing
 * irreversible runs yet — no lock/submit until Task 5.
 */
export default function CaptureFlow({
  draft,
  initialStep,
  propertyId,
  propertyName,
}: {
  draft: DraftSnapshot;
  initialStep: number;
  propertyId: string;
  propertyName: string;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DraftSnapshot>(draft);
  const [step, setStep] = useState(initialStep);

  const turnoverId = snapshot.turnoverId;

  const afterIndex =
    step >= CAPTURE_STEP_AFTER_START && step < CAPTURE_STEP_SUBMIT
      ? step - CAPTURE_STEP_AFTER_START
      : -1;

  // Human-readable "Step X of N" for the current step.
  const stepNumber = useMemo(() => {
    if (step === CAPTURE_STEP_BEFORE) return 1;
    if (step === CAPTURE_STEP_WATER) return 2;
    if (afterIndex >= 0) return 3 + afterIndex;
    return TOTAL_STEPS;
  }, [step, afterIndex]);

  function stepLabel() {
    return `Step ${stepNumber} of ${TOTAL_STEPS}`;
  }

  // --- Before ---------------------------------------------------------------
  if (step === CAPTURE_STEP_BEFORE) {
    return (
      <CaptureAnchor
        propertyId={propertyId}
        turnoverId={turnoverId}
        slot={CAPTURE_V2_BEFORE_SHOT.slot}
        phase="before"
        title="Before — how you found it"
        hint={CAPTURE_V2_BEFORE_SHOT.hint}
        stepLabel={stepLabel()}
        storedPath={storedPathFor(
          snapshot.photos,
          CAPTURE_V2_BEFORE_SHOT.slot,
          "before"
        )}
        onSaved={setSnapshot}
        onNext={() => setStep(CAPTURE_STEP_WATER)}
        nextLabel="Next: water"
      />
    );
  }

  // --- Water (Task 4 ChemistryStep seam) ------------------------------------
  if (step === CAPTURE_STEP_WATER) {
    return (
      <WaterStepStub
        stepLabel={stepLabel()}
        onBack={() => setStep(CAPTURE_STEP_BEFORE)}
        onNext={() => setStep(CAPTURE_STEP_AFTER_START)}
      />
    );
  }

  // --- After photos ---------------------------------------------------------
  if (afterIndex >= 0) {
    const slot = CAPTURE_V2_AFTER_SLOTS[afterIndex];
    const isLast = afterIndex === AFTER_COUNT - 1;
    return (
      <CaptureAnchor
        // Remount per slot so local preview/state resets cleanly.
        key={`after-${slot.slot}`}
        propertyId={propertyId}
        turnoverId={turnoverId}
        slot={slot.slot}
        phase="after"
        title={`After — ${slot.label}`}
        hint={slot.hint}
        stepLabel={stepLabel()}
        storedPath={storedPathFor(snapshot.photos, slot.slot, "after")}
        onSaved={setSnapshot}
        onNext={() => setStep(step + 1)}
        onBack={() =>
          setStep(afterIndex === 0 ? CAPTURE_STEP_WATER : step - 1)
        }
        nextLabel={isLast ? "Review & finish" : "Next photo"}
      />
    );
  }

  // --- Finish (Task 5 FinishProof seam) -------------------------------------
  return (
    <FinishStub
      propertyName={propertyName}
      photos={snapshot.photos}
      stepLabel={stepLabel()}
      onBack={() => setStep(CAPTURE_STEP_SUBMIT - 1)}
      onDone={() => router.push("/field/today")}
    />
  );
}

/** Placeholder for the Task 4 chemistry step. Advances the flow without input. */
function WaterStepStub({
  stepLabel,
  onBack,
  onNext,
}: {
  stepLabel: string;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    // SEAM: replace this block with <ChemistryStep … onDone={onNext} /> (Task 4).
    <main
      style={{
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: "100dvh",
      }}
    >
      <header style={{ display: "grid", gap: 8 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--field-muted)",
            margin: 0,
          }}
        >
          {stepLabel}
        </p>
        <h1
          style={{
            fontFamily: "var(--field-serif)",
            fontSize: 30,
            fontWeight: 600,
            lineHeight: 1.12,
            margin: 0,
            color: "var(--field-ink)",
          }}
        >
          Water test
        </h1>
      </header>

      <div style={{ flex: 1 }}>
        <div
          style={{
            background: "var(--field-card)",
            borderRadius: 18,
            border: "1px solid rgba(8, 9, 10, 0.06)",
            padding: 24,
            display: "grid",
            gap: 8,
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--field-serif)",
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              color: "var(--field-ink)",
            }}
          >
            Water test — coming next
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--field-muted)",
              margin: 0,
            }}
          >
            The tap-pad chemistry step (TA → pH → hardness → sanitizer) lands in
            the next build.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FieldButton type="button" onClick={onNext}>
          Skip for now
        </FieldButton>
        <button
          type="button"
          onClick={onBack}
          style={{
            appearance: "none",
            background: "transparent",
            border: "none",
            padding: "8px",
            minHeight: 44,
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--field-muted)",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>
    </main>
  );
}

/** Placeholder finish screen. Nothing irreversible — lock/send arrive in Task 5. */
function FinishStub({
  propertyName,
  photos,
  stepLabel,
  onBack,
  onDone,
}: {
  propertyName: string;
  photos: DraftPhoto[];
  stepLabel: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const capturedRequired = REQUIRED_LOCK_PHOTOS.filter(({ slot, phase }) =>
    photos.some((p) => p.slot === slot && p.phase === phase && !!p.storagePath)
  ).length;

  return (
    // SEAM: replace this block with <FinishProof … /> (Task 5: lock + send).
    <main
      style={{
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: "100dvh",
      }}
    >
      <header style={{ display: "grid", gap: 8 }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--field-muted)",
            margin: 0,
          }}
        >
          {stepLabel}
        </p>
        <h1
          style={{
            fontFamily: "var(--field-serif)",
            fontSize: 30,
            fontWeight: 600,
            lineHeight: 1.12,
            margin: 0,
            color: "var(--field-ink)",
          }}
        >
          Turnover captured
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            lineHeight: 1.5,
            color: "var(--field-muted)",
            margin: 0,
          }}
        >
          {propertyName} · {capturedRequired} of {REQUIRED_LOCK_PHOTOS.length}{" "}
          required photos captured.
        </p>
      </header>

      <div style={{ flex: 1 }}>
        <div
          style={{
            background: "var(--field-card)",
            borderRadius: 18,
            border: "1px solid rgba(8, 9, 10, 0.06)",
            padding: 24,
            display: "grid",
            gap: 8,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              lineHeight: 1.5,
              color: "var(--field-muted)",
              margin: 0,
            }}
          >
            Proof assembly and sending to the homeowner arrive in the next build.
            Nothing has been locked or sent yet.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FieldButton
          type="button"
          disabled
          style={{ opacity: 0.5, cursor: "default" }}
        >
          Send to homeowner (coming soon)
        </FieldButton>
        <button
          type="button"
          onClick={onDone}
          style={{
            appearance: "none",
            background: "transparent",
            border: "1px solid rgba(8, 9, 10, 0.14)",
            borderRadius: 12,
            padding: "12px 20px",
            minHeight: 48,
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--field-ink)",
            cursor: "pointer",
          }}
        >
          Done for now
        </button>
        <button
          type="button"
          onClick={onBack}
          style={{
            appearance: "none",
            background: "transparent",
            border: "none",
            padding: "8px",
            minHeight: 44,
            fontFamily: "var(--font-sans)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--field-muted)",
            cursor: "pointer",
          }}
        >
          Back
        </button>
      </div>
    </main>
  );
}
