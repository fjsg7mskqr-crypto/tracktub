// Open items (Home status board, 2026-11-04 design): something left unfinished
// at one visit to settle at a later one. Stored on `task` (kind, note, …).
// Pure: the Bring list, the visit screen's re-check suggestion, chip copy.

import {
  READING_FIELDS,
  READING_TARGETS,
  inRange,
  type ReadingField,
} from "@/lib/readings";

export type OpenItemKind = "filter_soak" | "recheck" | "part" | "other";

/** The "Leave for next time" chips, in display order. */
export const OPEN_ITEM_KINDS: { kind: OpenItemKind; label: string }[] = [
  { kind: "filter_soak", label: "Filters soaking" },
  { kind: "recheck", label: "Re-check reading" },
  { kind: "part", label: "Part needed" },
  { kind: "other", label: "Other" },
];

export const isOpenItemKind = (v: unknown): v is OpenItemKind =>
  OPEN_ITEM_KINDS.some((k) => k.kind === v);

export type OpenItem = {
  id: string;
  tubId: string;
  /** Null for a task that wasn't left from a visit. */
  kind: OpenItemKind | null;
  title: string;
  note: string | null;
  /** ISO. */
  openedAt: string;
  openedVisitId: string | null;
};

/** Stored title: the typed text (Other, or a suggestion like "Re-check pH"),
 *  else the chip's label. */
export function openItemTitle(kind: OpenItemKind, text?: string): string {
  return text?.trim() || OPEN_ITEM_KINDS.find((k) => k.kind === kind)!.label;
}

const SINGLE: Record<OpenItemKind, string> = {
  filter_soak: "Filters soaking",
  recheck: "Re-check",
  part: "Waiting on part",
  other: "1 open",
};

/** A tile's chip for its open items: "Waiting on part", "2 open"; null if none. */
export function itemsChip(items: readonly OpenItem[]): string | null {
  if (items.length === 0) return null;
  if (items.length > 1) return `${items.length} open`;
  return SINGLE[items[0].kind ?? "other"];
}

export type Reading = Partial<Record<ReadingField, number | null>> | null;

/** What to bring for a reading out of range, by direction. */
const PRODUCT: Record<ReadingField, { high: string | null; low: string }> = {
  total_alkalinity: { high: "pH down", low: "Alkalinity up" },
  ph: { high: "pH down", low: "pH up" },
  calcium_hardness: { high: null, low: "Calcium increaser" },
  sanitizer_ppm: { high: null, low: "Chlorine" },
};

const STRIPS = "Test strips";

/**
 * The focus card's Bring list: products for the last reading's out-of-range
 * values (test order), test strips whenever something needs re-testing, then
 * parts waiting. Deduped, never more than the card can hold.
 */
export function bringList(
  items: readonly OpenItem[],
  reading: Reading
): string[] {
  const out: string[] = [];
  const add = (s: string | null) => {
    if (s && !out.includes(s)) out.push(s);
  };
  let retest = false;
  for (const f of READING_FIELDS) {
    const v = reading?.[f] ?? null;
    if (inRange(f, v) !== false) continue;
    retest = true;
    add(v! > READING_TARGETS[f].hi ? PRODUCT[f].high : PRODUCT[f].low);
  }
  if (retest || items.some((i) => i.kind === "recheck")) add(STRIPS);
  for (const i of items)
    if (i.kind === "part")
      add(i.note?.trim() ? `Part: ${i.note.trim()}` : "The part");
  return out;
}

export type RecheckSuggestion = {
  field: ReadingField;
  title: string;
  note: string;
};

/**
 * "Re-check <reading>" one-tap suggestions on the visit screen: one per as-left
 * value out of range that isn't already left open as a re-check. Suggestions
 * only; nothing is created until the operator taps.
 */
export function recheckSuggestions(
  left: Reading,
  items: readonly OpenItem[]
): RecheckSuggestion[] {
  const out: RecheckSuggestion[] = [];
  for (const field of READING_FIELDS) {
    const v = left?.[field] ?? null;
    if (inRange(field, v) !== false) continue;
    const t = READING_TARGETS[field];
    const title = `Re-check ${t.label}`;
    if (items.some((i) => i.kind === "recheck" && i.title === title)) continue;
    out.push({ field, title, note: `Left at ${v!.toFixed(t.decimals)}` });
  }
  return out;
}
