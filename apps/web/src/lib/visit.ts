// The visit (app rebuild screen 6): one turnover worked as a draft and then
// locked. Pure types and helpers shared by the visit screen, the tub log
// (Lane 3) and the record (Lane 4). Data access lives in visit-data.ts.

import type { ReadingField } from "@/lib/readings";
import { READING_FIELDS } from "@/lib/readings";
import type { CleaningStepCode } from "@/lib/types";

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

export type VisitPhoto = {
  id: string;
  kind: PhotoKind;
  storagePath: string;
  capturedAt: string | null;
};

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
  notes: string;
  /** Text flagged for the owner; null when nothing is flagged. */
  flag: string | null;
  /** The tub's last locked visit, for suggestions and framing. */
  previous: {
    visitId: string;
    visitedOn: string;
    found: ReadingValues | null;
    photos: VisitPhoto[];
  } | null;
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
