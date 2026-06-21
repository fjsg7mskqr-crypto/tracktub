import type { CapturePhase, PhotoSlot } from "./types";

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
