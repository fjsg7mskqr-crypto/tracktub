// The record (spec §9) as data: one turnover row in, everything RecordView
// prints out. All formatting, ranges and partial status are decided here so the
// operator view, the owner view and the history report agree.

import {
  READING_FIELDS,
  READING_TARGETS,
  inRange,
  readingColumn,
  type ReadingField,
  type ReadingKind,
} from "@/lib/readings";
import { CLEANING_STEPS, PHOTO_SLOT_LABELS, type PhotoSlot } from "@/lib/types";
import { treatmentLabel } from "@/lib/chemistry";
import { photoPublicUrl } from "@/lib/supabase/storage";
import { formatDate, formatTime } from "@/lib/time";

type ReadingValues = Record<ReadingField, number | null> & {
  left_total_alkalinity: number | null;
  left_ph: number | null;
  left_calcium_hardness: number | null;
  left_sanitizer_ppm: number | null;
};

export type WaterRow = ReadingValues & {
  recorded_at: string;
  found_recorded_at: string | null;
  left_recorded_at: string | null;
  treatments: string[] | null;
  treatment_note: string | null;
};

/** One turnover with its embeds, already normalised (embedded arrays → first). */
export type RecordRow = {
  id: string;
  status: string;
  created_at: string;
  submitted_at_server: string | null;
  share_token: string | null;
  notes: string | null;
  cleaning_steps: string[] | null;
  owner_flag?: string | null;
  property: {
    id: string;
    name: string;
    address: string | null;
    client: { name: string } | null;
  } | null;
  submitter: { full_name: string | null; email: string } | null;
  photos: {
    slot: string;
    phase: string;
    storage_path: string | null;
    captured_at: string | null;
    created_at: string;
  }[];
  water: WaterRow | null;
};

export type WaterLine = {
  field: ReadingField;
  label: string;
  found: string;
  left: string;
  target: string;
  foundInRange: boolean | null;
  leftInRange: boolean | null;
};

export type RecordModel = {
  id: string;
  recordId: string;
  tub: string;
  propertyId: string | null;
  client: string | null;
  address: string | null;
  date: string;
  operator: string;
  span: string;
  locked: boolean;
  lockedAt: string | null;
  water: {
    foundAt: string | null;
    leftAt: string | null;
    lines: WaterLine[];
    any: boolean;
  };
  photos: { label: string; time: string; url: string }[];
  added: string[];
  work: { label: string; done: boolean }[];
  ownerFlag: string | null;
  notes: string | null;
  /** Missing items, in display order; empty when the visit is complete. */
  partial: string[];
  shareToken: string | null;
};

const LINE_LABELS: Record<ReadingField, string> = {
  total_alkalinity: "Alk",
  ph: "pH",
  calcium_hardness: "Hard",
  sanitizer_ppm: "Cl",
};

/** Owner-facing labels for the visit's work chips, in chip order (spec §6).
 *  Other codes keep their CLEANING_STEPS label and follow these. */
export const WORK_LABELS: Record<string, string> = {
  filters_cleaned: "Cleaned filter",
  wiped: "Wiped down",
  filter_replaced: "Replaced filter",
  drained_refilled: "Drained & refilled",
  water_topped: "Topped off",
  cover_cleaned: "Cleaned cover",
};

type PhotoKind = "before" | "after" | "cover" | "other";

function photoKind(p: RecordRow["photos"][number]): PhotoKind {
  if (p.slot === "full_frame") return p.phase === "before" ? "before" : "after";
  if (p.slot === "cover" && p.phase === "after") return "cover";
  return "other";
}

const PHOTO_ORDER: PhotoKind[] = ["before", "after", "cover", "other"];
const PHOTO_LABEL: Record<Exclude<PhotoKind, "other">, string> = {
  before: "Before",
  after: "After",
  cover: "Cover on",
};

function value(field: ReadingField, v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return v.toFixed(READING_TARGETS[field].decimals);
}

function readingOf(
  water: WaterRow | null,
  field: ReadingField,
  kind: ReadingKind
): number | null {
  if (!water) return null;
  const v = water[readingColumn(field, kind) as keyof ReadingValues];
  return typeof v === "number" ? v : null;
}

function hasReading(water: WaterRow | null, kind: ReadingKind): boolean {
  return READING_FIELDS.some((f) => readingOf(water, f, kind) !== null);
}

function operatorName(s: RecordRow["submitter"]): string {
  const full = s?.full_name?.trim();
  if (full) {
    const [first, ...rest] = full.split(/\s+/);
    const last = rest.at(-1);
    return last ? `${first} ${last[0].toUpperCase()}.` : first;
  }
  return s?.email || "—";
}

/** "9:42 – 10:58 AM" in one period, "9:42 AM – 1:05 PM" across noon. */
function timeSpan(start: string, end: string | null): string {
  const a = formatTime(start);
  if (!end) return `${a} – …`;
  const b = formatTime(end);
  const [aTime, aPeriod] = a.split(" ");
  const bPeriod = b.split(" ")[1];
  if (aPeriod && aPeriod === bPeriod) return `${aTime} – ${b}`;
  return `${a} – ${b}`;
}

export function buildRecord(row: RecordRow): RecordModel {
  const water = row.water;
  const locked = row.status === "submitted_locked";
  const steps = new Set(row.cleaning_steps ?? []);

  const lines: WaterLine[] = READING_FIELDS.map((field) => {
    const found = readingOf(water, field, "found");
    const left = readingOf(water, field, "left");
    const { lo, hi } = READING_TARGETS[field];
    return {
      field,
      label: LINE_LABELS[field],
      found: value(field, found),
      left: value(field, left),
      target: `${lo}–${hi}`,
      foundInRange: inRange(field, found),
      leftInRange: inRange(field, left),
    };
  });
  const foundLogged = hasReading(water, "found");
  const leftLogged = hasReading(water, "left");

  const stored = row.photos.filter((p) => p.storage_path);
  const photos = PHOTO_ORDER.flatMap((kind) =>
    stored
      .filter((p) => photoKind(p) === kind)
      .map((p) => ({
        label:
          kind === "other"
            ? (PHOTO_SLOT_LABELS[p.slot as PhotoSlot] ?? p.slot)
            : PHOTO_LABEL[kind],
        time: formatTime(p.captured_at ?? p.created_at),
        url: photoPublicUrl(p.storage_path as string),
      }))
  );
  const kinds = new Set(stored.map(photoKind));

  const work = [
    ...Object.entries(WORK_LABELS).filter(([code]) => steps.has(code)),
    ...CLEANING_STEPS.filter(
      (s) => steps.has(s.code) && !(s.code in WORK_LABELS)
    ).map((s) => [s.code, s.label] as const),
  ].map(([, label]) => ({ label, done: true }));
  if (!steps.has("drained_refilled"))
    work.push({ label: "Not drained", done: false });

  const added = [
    ...(water?.treatments ?? []).map(treatmentLabel),
    ...(water?.treatment_note ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  ];

  const partial = [
    !foundLogged && "Reading as found",
    !leftLogged && "Reading as left",
    !kinds.has("before") && "Before photo",
    !kinds.has("after") && "After photo",
    !kinds.has("cover") && "Cover photo",
  ].filter((m): m is string => Boolean(m));

  return {
    id: row.id,
    recordId: `TT-${row.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    tub: row.property?.name ?? "—",
    propertyId: row.property?.id ?? null,
    client: row.property?.client?.name ?? null,
    address: row.property?.address ?? null,
    date: formatDate(row.created_at),
    operator: operatorName(row.submitter),
    span: timeSpan(row.created_at, locked ? row.submitted_at_server : null),
    locked,
    lockedAt: locked ? formatTime(row.submitted_at_server) : null,
    water: {
      foundAt: foundLogged
        ? formatTime(water?.found_recorded_at ?? water?.recorded_at ?? null)
        : null,
      leftAt: leftLogged ? formatTime(water?.left_recorded_at ?? null) : null,
      lines,
      any: foundLogged || leftLogged,
    },
    photos,
    added,
    work,
    ownerFlag: row.owner_flag?.trim() || null,
    notes: row.notes?.trim() || null,
    partial,
    shareToken: row.share_token,
  };
}
