"use client";

import { useMemo, useState } from "react";
import { CaptureAnchor } from "@/components/field/CaptureAnchor";
import { ChemistryStep } from "@/components/field/ChemistryStep";
import { FinishProof } from "@/components/field/FinishProof";
import type { DraftPhoto, DraftSnapshot } from "@/lib/actions/turnover";
import type { SanitizerType } from "@/lib/chemistry";
import {
  CAPTURE_STEP_AFTER_START,
  CAPTURE_STEP_BEFORE,
  CAPTURE_STEP_SUBMIT,
  CAPTURE_STEP_WATER,
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
  sanitizerType,
}: {
  draft: DraftSnapshot;
  initialStep: number;
  propertyId: string;
  propertyName: string;
  sanitizerType: SanitizerType;
}) {
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

  // --- Water (chemistry — Task 4) -------------------------------------------
  if (step === CAPTURE_STEP_WATER) {
    return (
      <ChemistryStep
        turnoverId={turnoverId}
        propertyId={propertyId}
        sanitizerType={sanitizerType}
        value={snapshot.reading}
        onSaved={setSnapshot}
        onBack={() => setStep(CAPTURE_STEP_BEFORE)}
        onDone={() => setStep(CAPTURE_STEP_AFTER_START)}
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

  // --- Finish (proof + lock + send — Task 5) --------------------------------
  return (
    <FinishProof
      turnoverId={turnoverId}
      propertyId={propertyId}
      propertyName={propertyName}
      reading={snapshot.reading}
      photos={snapshot.photos}
      sanitizerType={sanitizerType}
      onBack={() => setStep(CAPTURE_STEP_SUBMIT - 1)}
    />
  );
}
