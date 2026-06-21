import { photoPublicUrl } from "@/lib/supabase/storage";
import {
  CAPTURE_V2_AFTER_SLOTS,
  PHOTO_SLOT_LABELS,
  type PhotoSlot,
} from "@/lib/types";

export type Shot = { url: string; label: string; caption?: string };

export type TurnoverPhotoRow = {
  slot: string;
  phase?: string | null;
  storage_path: string | null;
  caption?: string | null;
};

export type TurnoverGalleryModel = {
  moneyPair: { before: Shot; after: Shot } | null;
  beforeIssue: Shot[];
  guidedAfter: Shot[];
  legacyBefore: Shot[];
  legacyAfter: Shot[];
};

const V2_SLOTS = new Set(["full_frame", "water_level", "issue"]);

function hasStorage(
  p: TurnoverPhotoRow
): p is TurnoverPhotoRow & { storage_path: string } {
  return !!p.storage_path;
}

function toShot(
  p: TurnoverPhotoRow & { storage_path: string },
  label: string
): Shot {
  return {
    url: photoPublicUrl(p.storage_path),
    label,
    ...(p.caption ? { caption: p.caption } : {}),
  };
}

function slotLabel(slot: string): string {
  return PHOTO_SLOT_LABELS[slot as PhotoSlot] ?? slot;
}

function isV2Capture(photos: TurnoverPhotoRow[]): boolean {
  return photos.some((p) => V2_SLOTS.has(p.slot));
}

/** Builds before/after gallery sections from stored photo rows (legacy + capture v2). */
export function buildTurnoverGallery(
  photos: TurnoverPhotoRow[]
): TurnoverGalleryModel {
  const stored = photos.filter(hasStorage);

  if (isV2Capture(stored)) {
    const before = stored.filter((p) => p.phase === "before");
    const after = stored.filter((p) => p.phase !== "before");

    const beforeFull = before.find((p) => p.slot === "full_frame");
    const afterFull = after.find((p) => p.slot === "full_frame");

    const moneyPair =
      beforeFull && afterFull
        ? {
            before: toShot(beforeFull, "Before — how you found it"),
            after: toShot(afterFull, "Guest-ready — full frame"),
          }
        : null;

    const beforeIssue = before
      .filter((p) => p.slot === "issue")
      .map((p) =>
        toShot(p, p.caption?.trim() ? "Issue — as found" : "Issue photo")
      );

    const afterSlots = moneyPair
      ? CAPTURE_V2_AFTER_SLOTS.filter((s) => s.slot !== "full_frame")
      : CAPTURE_V2_AFTER_SLOTS;

    const guidedAfter = afterSlots
      .map(({ slot, label }) => {
        const ph = after.find((p) => p.slot === slot);
        return ph ? toShot(ph, label) : null;
      })
      .filter((s): s is Shot => s !== null);

    return {
      moneyPair,
      beforeIssue,
      guidedAfter,
      legacyBefore: [],
      legacyAfter: [],
    };
  }

  const legacyBefore = stored
    .filter((p) => p.phase === "before")
    .map((p) => toShot(p, "As found"));

  const legacyAfter = stored
    .filter((p) => p.phase !== "before")
    .map((p) => toShot(p, slotLabel(p.slot)));

  return {
    moneyPair: null,
    beforeIssue: [],
    guidedAfter: [],
    legacyBefore,
    legacyAfter,
  };
}

/** Dashboard / list thumbnail — after full_frame, else wide, cover, or first stored photo. */
export function pickTurnoverThumbnail(
  photos: TurnoverPhotoRow[]
): string | null {
  const stored = photos.filter(hasStorage);
  if (stored.length === 0) return null;

  const after = stored.filter((p) => p.phase !== "before");
  const pick =
    after.find((p) => p.slot === "full_frame") ??
    after.find((p) => p.slot === "wide") ??
    after.find((p) => p.slot === "cover") ??
    stored[0];

  return photoPublicUrl(pick.storage_path);
}
