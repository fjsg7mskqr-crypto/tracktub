// Domain types — client mirror of PRD §10 (docs/PRD.md). No backend in the demo.

export type Role = "operator" | "staff" | "owner";

export type PhotoSlot =
  | "wide"
  | "waterline"
  | "panel"
  | "cover"
  | "full_frame"
  | "water_level"
  | "issue";

/** before = single "as found" shot; after = guest-ready guided set */
export type CapturePhase = "before" | "after";

/** Cleaning checklist step codes stored on turnover.cleaning_steps (capture v2). */
export type CleaningStepCode =
  | "water_topped"
  | "wiped"
  | "debris_removed"
  | "filters_cleaned"
  | "reassembled";

export const CLEANING_STEPS: { code: CleaningStepCode; label: string }[] = [
  { code: "water_topped", label: "Water topped off" },
  { code: "wiped", label: "Wiped down" },
  { code: "debris_removed", label: "Debris removed" },
  { code: "filters_cleaned", label: "Filters cleaned" },
  { code: "reassembled", label: "Reassembled" },
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

// Legacy guided AFTER set (v1 wizard — superseded by CAPTURE_V2_AFTER_SLOTS in #176).
export const PHOTO_SLOTS: { slot: PhotoSlot; label: string; hint: string }[] = [
  { slot: "wide", label: "Wide shot", hint: "The whole tub area" },
  { slot: "waterline", label: "Waterline", hint: "Water clarity at the line" },
  { slot: "panel", label: "Control panel", hint: "Readout / chemistry" },
  { slot: "cover", label: "Cover & filter", hint: "Cover condition + filter" },
];

// Capture v2 guided AFTER set — water level → full frame → cover (ready to go).
export const CAPTURE_V2_AFTER_SLOTS: {
  slot: PhotoSlot;
  label: string;
  hint: string;
}[] = [
  { slot: "water_level", label: "Water level", hint: "Water at the correct fill line" },
  { slot: "full_frame", label: "Full frame", hint: "The whole tub area — guest-ready" },
  { slot: "cover", label: "Cover", hint: "Cover on, ready to go" },
];

// Capture v2 BEFORE shot — the money-shot pair anchor (slot = full_frame, phase = before).
export const CAPTURE_V2_BEFORE_SHOT: { slot: PhotoSlot; label: string; hint: string } =
  {
    slot: "full_frame",
    label: "Before — how you found it",
    hint: "One full-frame shot of the tub as you found it",
  };

// Legacy BEFORE shot (v1 — slot = wide, phase = before).
export const BEFORE_SHOT: { slot: PhotoSlot; label: string; hint: string } = {
  slot: "wide",
  label: "Before — how you found it",
  hint: "One quick shot of the tub as you found it",
};

export type IssueTag =
  | "water_cloudy"
  | "cover_damage"
  | "low_sanitizer"
  | "debris"
  | "panel_error";

export const ISSUE_TAGS: { tag: IssueTag; label: string }[] = [
  { tag: "water_cloudy", label: "Cloudy water" },
  { tag: "cover_damage", label: "Cover damage" },
  { tag: "low_sanitizer", label: "Low sanitizer" },
  { tag: "debris", label: "Debris" },
  { tag: "panel_error", label: "Panel error" },
];

export interface Photo {
  slot: PhotoSlot;
  /** null => render a generated placeholder (demo without real images) */
  dataUrl: string | null;
  capturedAt: string; // ISO
  /** Optional one-line caption (issue photos in capture v2) */
  caption?: string | null;
  /** AI mock: suggested, awaiting human confirmation (PRD §8.5) */
  suggestedTags: IssueTag[];
  /** Human-confirmed (the system of record) */
  confirmedTags: IssueTag[];
}

export interface ShareEvent {
  sharedAt: string; // ISO
  channel: string; // "Owner email", "Guest / Airbnb", "Link copied"
  opens: { at: string }[]; // recipient opened the proof link (wedge signal)
}

export interface Turnover {
  id: string;
  propertyId: string;
  submitterId: string;
  submittedAtServer: string | null; // null while draft
  status: "draft" | "locked";
  urgent: boolean;
  notes: string;
  /** Completed cleaning checklist step codes (capture v2) */
  cleaningSteps?: CleaningStepCode[];
  photos: Photo[];
  shareToken: string;
  shares: ShareEvent[];
}

export interface Property {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  geofenceRadiusM: number;
  tubNotes: string;
  ownerId: string;
  staffIds: string[];
  /** demo: count of guest stays since last turnover, drives bather-load reminder */
  staysSinceTurnover: number;
}

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface WaitlistIntent {
  at: string; // ISO
  propertyName: string;
  note: string;
}

export interface DB {
  orgName: string;
  users: User[];
  properties: Property[];
  turnovers: Turnover[];
  waitlist: WaitlistIntent[];
  currentUserId: string; // role switcher
}
