import {
  CAPTURE_V2_AFTER_SLOTS,
  CAPTURE_V2_BEFORE_SHOT,
  type CapturePhase,
  type PhotoSlot,
} from "./types";

/** Wizard step indices (capture v2 flow). */
export const CAPTURE_STEP_BEFORE = 0;
export const CAPTURE_STEP_WATER = 1;
export const CAPTURE_STEP_AFTER_START = 2;
export const CAPTURE_STEP_SUBMIT =
  CAPTURE_STEP_AFTER_START + CAPTURE_V2_AFTER_SLOTS.length;

/** The four guided photos required before a turnover can lock (capture v2). */
export const REQUIRED_LOCK_PHOTOS: {
  slot: PhotoSlot;
  phase: CapturePhase;
}[] = [
  { slot: "full_frame", phase: "before" },
  { slot: "water_level", phase: "after" },
  { slot: "full_frame", phase: "after" },
  { slot: "cover", phase: "after" },
];

export function guidedPhotoStoragePath(
  orgId: string,
  turnoverId: string,
  slot: PhotoSlot,
  phase: CapturePhase
): string {
  return `${orgId}/${turnoverId}/${phase}/${slot}`;
}

export function issuePhotoStoragePath(
  orgId: string,
  turnoverId: string,
  photoId: string
): string {
  return `${orgId}/${turnoverId}/before/issue/${photoId}`;
}

export function photoKey(
  slot: PhotoSlot,
  phase: CapturePhase
): string {
  return `${phase}:${slot}`;
}

type DraftPhotoForStep = {
  slot: PhotoSlot;
  phase: CapturePhase;
  storagePath: string | null;
};

function hasStoredGuidedPhoto(
  photos: DraftPhotoForStep[],
  slot: PhotoSlot,
  phase: CapturePhase
): boolean {
  return photos.some(
    (p) => p.slot === slot && p.phase === phase && !!p.storagePath
  );
}

/** Resume wizard at the first incomplete step for an in-progress draft. */
export function computeInitialStep(snapshot: {
  photos: DraftPhotoForStep[];
}): number {
  if (
    !hasStoredGuidedPhoto(
      snapshot.photos,
      CAPTURE_V2_BEFORE_SHOT.slot,
      "before"
    )
  ) {
    return CAPTURE_STEP_BEFORE;
  }

  const hasAnyAfter = snapshot.photos.some(
    (p) => p.phase === "after" && !!p.storagePath
  );
  if (!hasAnyAfter) {
    return CAPTURE_STEP_WATER;
  }

  for (let i = 0; i < CAPTURE_V2_AFTER_SLOTS.length; i++) {
    const { slot } = CAPTURE_V2_AFTER_SLOTS[i];
    if (!hasStoredGuidedPhoto(snapshot.photos, slot, "after")) {
      return CAPTURE_STEP_AFTER_START + i;
    }
  }

  return CAPTURE_STEP_SUBMIT;
}
