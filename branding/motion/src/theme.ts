// TrackTub brand tokens — minimal/sharp, dark-first.
// Source of truth: brand/brand-notes.md + brand/tokens.css (2026-06-07 refresh).
// Two-color system: BLUE #3B82F6 = brand / hot-tub water; GREEN #34D399 = verified ONLY.

export const COLORS = {
  black: "#08090A", // app background / ink
  surface: "#131417",
  surface2: "#191B20",
  border: "rgba(255,255,255,0.09)",
  textHi: "#EDEDEF", // primary text + the check on dark
  textLo: "#8A8F98",
  brand: "#3B82F6", // blue — the water / brand accent
  verified: "#34D399", // green — verified/success ONLY (the ✓ VERIFIED tag)
  pending: "#E8A33D",
  urgent: "#EF4444",
} as const;

// The mark: a white/ink verified check RESTING ABOVE a blue waterline (with a
// clear gap — no piercing). Path data is copied verbatim from the canonical
// asset branding/logo/mark/tracktub-mark-color-dark.svg (origin/main, 64x64).
export const MARK = {
  viewBox: 64,
  check: {
    strokeWidth: 5.5,
    short: "M16 24 L26 34", // drawn first
    long: "M26 34 L48 10", // drawn second
  },
  water: {
    front: { d: "M10 42 q5.5 -3.5 11 0 t11 0 t11 0 t11 0", width: 2, opacity: 1 },
    back: { d: "M14 48 q5 -2.2 10 0 t10 0 t10 0 t10 0", width: 1.2, opacity: 0.55 },
  },
} as const;

export const COPY = {
  wordmarkTrack: "Track", // ink/white
  wordmarkTub: "Tub", // blue (the water)
  oneLiner: "Guest-ready hot tub proof for every turnover.",
  category: "Dispute-grade evidence for short-term-rental hot-tub turnovers.",
  metadata: "2026-06-09 14:22 UTC · submitter ✓ · geofence ✓",
} as const;
