// Shared visit vocabulary: cleaning step codes and photo slot labels.

export type PhotoSlot =
  | "wide"
  | "waterline"
  | "panel"
  | "cover"
  | "full_frame"
  | "water_level"
  | "issue";

/** Cleaning checklist step codes stored on turnover.cleaning_steps (capture v2). */
export type CleaningStepCode =
  | "water_topped"
  | "wiped"
  | "debris_removed"
  | "filters_cleaned"
  | "reassembled"
  | "filter_replaced"
  | "drained_refilled"
  | "cover_cleaned";

export const CLEANING_STEPS: { code: CleaningStepCode; label: string }[] = [
  { code: "water_topped", label: "Water topped off" },
  { code: "wiped", label: "Wiped down" },
  { code: "debris_removed", label: "Debris removed" },
  { code: "filters_cleaned", label: "Filters cleaned" },
  { code: "reassembled", label: "Reassembled" },
  { code: "filter_replaced", label: "Replaced filter" },
  { code: "drained_refilled", label: "Drained & refilled" },
  { code: "cover_cleaned", label: "Cleaned cover" },
];

/** Human-readable labels for every photo_slot enum value (legacy + capture v2). */
export const PHOTO_SLOT_LABELS: Record<PhotoSlot, string> = {
  wide: "Wide shot",
  waterline: "Waterline",
  panel: "Control panel",
  cover: "Cover & filter",
  full_frame: "Full frame",
  water_level: "Water level",
  issue: "Issue photo",
};
