// The visit (app rebuild screen 6): one turnover worked as a draft and then
// locked. Pure types and helpers shared by the visit screen, the tub log
// (Lane 3) and the record (Lane 4). Data access lives in visit-data.ts.

import type { ReadingField } from "@/lib/readings";
import { READING_FIELDS } from "@/lib/readings";
import type { CleaningStepCode } from "@/lib/types";
import { treatmentLabel } from "@/lib/chemistry";
import type { OpenItem } from "@/components/home/open-items";

/** The three photos a visit asks for (spec §8). Extras are never prompted. */
export type PhotoKind = "before" | "after" | "cover";

export const PHOTO_KINDS: Record<
  PhotoKind,
  { phase: "before" | "after"; slot: "full_frame" | "cover"; label: string }
> = {
  before: { phase: "before", slot: "full_frame", label: "Before" },
  after: { phase: "after", slot: "full_frame", label: "After · full tub" },
  cover: { phase: "after", slot: "cover", label: "Cover on" },
};

/** The kind a stored photo row represents, or null for any other slot. */
export function photoKindOf(phase: string, slot: string): PhotoKind | null {
  const kinds = Object.keys(PHOTO_KINDS) as PhotoKind[];
  return (
    kinds.find(
      (k) => PHOTO_KINDS[k].phase === phase && PHOTO_KINDS[k].slot === slot
    ) ?? null
  );
}

export type ReadingValues = Record<ReadingField, number | null>;

export type AddedProduct = { product: string; amount: string };

export type ProductHistory = { property_id: string; treatments: string[] };

const DEFAULT_PRODUCTS = [
  "Chlorine granules",
  "Alkalinity up",
  "pH down",
  "pH up",
  "Calcium up",
  "Defoamer",
  "Non-chlorine shock",
  "Clarifier",
  "Filter cleaner",
];

/** History arrives newest first. A tub's last amount wins over the org's. */
export function buildProductSuggestions(
  propertyId: string,
  history: ProductHistory[]
): AddedProduct[] {
  const tubHistory = history.filter((row) => row.property_id === propertyId);
  const otherHistory = history.filter((row) => row.property_id !== propertyId);
  const hasDifferentChlorineProduct = tubHistory.some((row) =>
    row.treatments.some((treatment) => {
      const product = decodeAdded(treatment).product.toLocaleLowerCase();
      return (
        product.includes("chlorine") &&
        !product.includes("non-chlorine") &&
        product !== "chlorine granules"
      );
    })
  );
  const seen = new Set<string>();
  const suggestions: AddedProduct[] = [];
  const add = (entry: AddedProduct) => {
    const raw = entry.product.trim();
    const product =
      raw === "sanitizer" && !hasDifferentChlorineProduct
        ? "Chlorine granules"
        : treatmentLabel(raw);
    const key = product.toLocaleLowerCase();
    if (!product || seen.has(key)) return;
    seen.add(key);
    suggestions.push({ product, amount: entry.amount.trim() });
  };
  for (const row of tubHistory)
    for (const treatment of row.treatments) add(decodeAdded(treatment));
  for (const row of otherHistory)
    for (const treatment of row.treatments) add(decodeAdded(treatment));
  for (const product of DEFAULT_PRODUCTS) add({ product, amount: "" });
  return suggestions;
}

export type VisitPhoto = {
  id: string;
  kind: PhotoKind;
  storagePath: string;
  capturedAt: string | null;
};

/** An open item on the visit screen: still open, or settled at this visit. */
export type VisitOpenItem = OpenItem & { status: "open" | "settled" };

export type VisitSnapshot = {
  visitId: string;
  propertyId: string;
  propertyName: string;
  status: "draft" | "submitted_locked";
  openedAt: string;
  /** At most one per kind. */
  photos: VisitPhoto[];
  found: ReadingValues | null;
  foundAt: string | null;
  left: ReadingValues | null;
  leftAt: string | null;
  work: CleaningStepCode[];
  added: AddedProduct[];
  productSuggestions: AddedProduct[];
  notes: string;
  /** Text flagged for the owner; null when nothing is flagged. */
  flag: string | null;
  /** The tub's open items, plus any settled at this visit (oldest first). */
  openItems: VisitOpenItem[];
  /** The tub's last locked visit, for suggestions and framing. */
  previous: {
    visitId: string;
    visitedOn: string;
    found: ReadingValues | null;
    photos: VisitPhoto[];
    /** The note written at that visit (trimmed; "" when none). */
    notes: string;
  } | null;
  /** The re-check scheduled from this visit's finish step (pending). */
  nextVisit: { dueOn: string; reason: string } | null;
  /** A scheduled re-check this visit answers, for the brief at the top. */
  scheduledHere: { dueOn: string; reason: string } | null;
};

/** Work chips in the mockup's order, with its field labels. */
export const WORK_CHIPS: { code: CleaningStepCode; label: string }[] = [
  { code: "filters_cleaned", label: "Cleaned filter" },
  { code: "wiped", label: "Wiped down" },
  { code: "filter_replaced", label: "Replaced filter" },
  { code: "drained_refilled", label: "Drained & refilled" },
  { code: "water_topped", label: "Topped off" },
  { code: "cover_cleaned", label: "Cleaned cover" },
];

const ADDED_SEP = " · ";

/** One "What you added" row as stored in water_reading.treatments. */
export function encodeAdded(a: AddedProduct): string {
  const product = a.product.trim();
  const amount = a.amount.trim();
  return amount ? `${product}${ADDED_SEP}${amount}` : product;
}

/** Inverse of encodeAdded. Legacy treatment codes come back as a bare product. */
export function decodeAdded(s: string): AddedProduct {
  const at = s.lastIndexOf(ADDED_SEP);
  if (at === -1) return { product: s, amount: "" };
  return { product: s.slice(0, at), amount: s.slice(at + ADDED_SEP.length) };
}

/** True when any of the four values was logged. */
export function readingLogged(r: ReadingValues | null): r is ReadingValues {
  return r !== null && READING_FIELDS.some((f) => r[f] !== null);
}

export type MissingPart =
  | "before photo"
  | "reading as found"
  | "reading as left"
  | "after photo"
  | "cover photo";

/** What the visit still lacks, in page order. Any → the record is partial. */
export function missingParts(
  s: Pick<VisitSnapshot, "photos" | "found" | "left">
): MissingPart[] {
  const has = (k: PhotoKind) => s.photos.some((p) => p.kind === k);
  const out: MissingPart[] = [];
  if (!has("before")) out.push("before photo");
  if (!readingLogged(s.found)) out.push("reading as found");
  if (!readingLogged(s.left)) out.push("reading as left");
  if (!has("after")) out.push("after photo");
  if (!has("cover")) out.push("cover photo");
  return out;
}

export const isPartial = (
  s: Pick<VisitSnapshot, "photos" | "found" | "left">
): boolean => missingParts(s).length > 0;
