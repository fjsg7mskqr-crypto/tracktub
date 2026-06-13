// Domain types — client mirror of PRD §10 (docs/PRD.md). No backend in the demo.

export type Role = "operator" | "staff" | "owner";

export type PhotoSlot = "wide" | "waterline" | "panel" | "cover";

/** before = single "as found" shot; after = guest-ready guided set */
export type CapturePhase = "before" | "after";

// The guided AFTER set — the dispute-grade, guest-ready evidence.
export const PHOTO_SLOTS: { slot: PhotoSlot; label: string; hint: string }[] = [
  { slot: "wide", label: "Wide shot", hint: "The whole tub area" },
  { slot: "waterline", label: "Waterline", hint: "Water clarity at the line" },
  { slot: "panel", label: "Control panel", hint: "Readout / chemistry" },
  { slot: "cover", label: "Cover & filter", hint: "Cover condition + filter" },
];

// The single BEFORE shot — proves the starting state. Stored as one photo row
// with slot = "wide", phase = "before".
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
