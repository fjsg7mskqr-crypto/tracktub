// The tub's Log timeline (spec §5.3): one-line past visits, and the entries of
// an open visit plus what's still to log. Pure; times are formatted by the
// component. Unset (null) reading rows are skipped, never printed.

import {
  READING_FIELDS,
  READING_TARGETS,
  inRange,
  type ReadingField,
} from "@/lib/readings";
import { CLEANING_STEPS } from "@/lib/types";
import type { HistoryVisit } from "@/lib/tub-history";
import { READING_NAMES } from "@/components/tub/tub-status";

type Reading = Partial<Record<ReadingField, number | null>> | null;

export type LogPhoto = {
  phase: "before" | "after";
  slot: string;
  capturedAt: Date | null;
};

export type LogVisit = HistoryVisit & {
  id: string;
  status: "draft" | "submitted_locked";
  left: Reading;
  foundAt: Date | null;
  leftAt: Date | null;
  treatments: readonly string[];
  photos: readonly LogPhoto[];
};

export type Chip = { text: string; out: boolean };

export type DraftEntry = {
  at: Date | null;
  kind: "photo" | "reading" | "work";
  title: string;
  chips?: Chip[];
  text?: string;
};

/** The set (non-null) values of a reading, in buffer order. */
function setValues(r: Reading): { field: ReadingField; value: number }[] {
  if (!r) return [];
  return READING_FIELDS.flatMap((field) => {
    const value = r[field] ?? null;
    return value === null ? [] : [{ field, value }];
  });
}

export function formatReading(field: ReadingField, value: number): string {
  return `${READING_NAMES[field]} ${value.toFixed(READING_TARGETS[field].decimals)}`;
}

export function readingChips(r: Reading): Chip[] {
  return setValues(r).map(({ field, value }) => ({
    text: formatReading(field, value),
    out: inRange(field, value) === false,
  }));
}

function outOfRange(r: Reading): string[] {
  return readingChips(r)
    .filter((c) => c.out)
    .map((c) => c.text);
}

function workLabels(steps: readonly string[]): string[] {
  return CLEANING_STEPS.filter((s) => steps.includes(s.code)).map(
    (s) => s.label.charAt(0).toLowerCase() + s.label.slice(1)
  );
}

export function visitHeadline(v: LogVisit): string {
  const parts: string[] = [];

  const foundOut = outOfRange(v.found);
  if (foundOut.length > 0) parts.push(`Found ${foundOut.join(", ")}`);
  else if (setValues(v.found).length > 0) parts.push("Found in range");
  else parts.push("No reading");

  const leftOut = outOfRange(v.left);
  if (leftOut.length > 0) parts.push(`left ${leftOut.join(", ")}`);
  else if (setValues(v.left).length > 0) parts.push("left all in range");

  const work = workLabels(v.cleaningSteps);
  if (work.length > 0) parts.push(work.join(", "));
  if (v.treatments.length > 0) parts.push(v.treatments.join(", "));

  const n = v.photos.length;
  parts.push(n === 0 ? "no photos" : `${n} ${n === 1 ? "photo" : "photos"}`);
  return parts.join(" · ");
}

/** Spec §6: a visit missing a reading or a photo is partial. */
export function isPartial(v: LogVisit): boolean {
  return setValues(v.found).length === 0 || v.photos.length === 0;
}

/** The latest timestamped entry (photo, reading); null when none. */
export function visitEnd(v: LogVisit): Date | null {
  const times = [
    v.foundAt,
    v.leftAt,
    ...v.photos.map((p) => p.capturedAt),
  ].filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
  if (times.length === 0) return null;
  return new Date(Math.max(...times.map((d) => d.getTime())));
}

const hasPhoto = (v: LogVisit, phase: "before" | "after", slot?: string) =>
  v.photos.some((p) => p.phase === phase && (!slot || p.slot === slot));

/** What an open visit still lacks, in the order the visit page asks for it. */
export function stillToLog(v: LogVisit): string[] {
  const missing: string[] = [];
  if (!hasPhoto(v, "before")) missing.push("Before photo");
  if (setValues(v.found).length === 0) missing.push("Reading as found");
  if (v.cleaningSteps.length === 0 && v.treatments.length === 0)
    missing.push("Work");
  if (setValues(v.left).length === 0) missing.push("Reading as left");
  if (!hasPhoto(v, "after", "full_frame") || !hasPhoto(v, "after", "cover"))
    missing.push("After photos");
  return missing;
}

/** An open visit's logged entries, oldest first; untimed work goes last. */
export function draftEntries(v: LogVisit): DraftEntry[] {
  const timed: DraftEntry[] = v.photos.map((p) => ({
    at: p.capturedAt,
    kind: "photo",
    title: `Photo · ${p.phase}`,
  }));
  if (setValues(v.found).length > 0)
    timed.push({
      at: v.foundAt,
      kind: "reading",
      title: "Reading · as found",
      chips: readingChips(v.found),
    });
  if (setValues(v.left).length > 0)
    timed.push({
      at: v.leftAt,
      kind: "reading",
      title: "Reading · as left",
      chips: readingChips(v.left),
    });
  timed.sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));

  const work = [...workLabels(v.cleaningSteps), ...v.treatments];
  if (work.length > 0)
    timed.push({
      at: null,
      kind: "work",
      title: "Work",
      text: work.join(" · "),
    });
  return timed;
}
