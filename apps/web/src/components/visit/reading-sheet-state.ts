// Reading sheet state (spec §7). Never record a number nobody read: every row
// starts unset with a greyed suggestion, and only − / + or tapping the value
// sets it. Unset rows log as null.

import {
  READING_FIELDS,
  READING_TARGETS,
  type ReadingField,
} from "@/lib/readings";
import type { ReadingValues } from "@/lib/visit";

export type RowState = {
  value: number | null;
  set: boolean;
  suggestion: number | null;
};
export type SheetState = Record<ReadingField, RowState>;

const round = (f: ReadingField, v: number) => {
  const { step, decimals } = READING_TARGETS[f];
  const stepped = Math.round(v / step) * step;
  return Number(Math.max(0, stepped).toFixed(decimals));
};

/** Already-logged values start set; the rest start unset at the suggestion. */
export function initSheet(
  logged: ReadingValues | null,
  suggestion: ReadingValues | null
): SheetState {
  const s = {} as SheetState;
  for (const f of READING_FIELDS) {
    const v = logged?.[f] ?? null;
    s[f] = { value: v, set: v !== null, suggestion: suggestion?.[f] ?? null };
  }
  return s;
}

/** One step up or down from what's shown; sets the row. */
export function bump(s: SheetState, f: ReadingField, dir: 1 | -1): SheetState {
  const { lo, hi, step } = READING_TARGETS[f];
  const row = s[f];
  const from = row.set
    ? (row.value ?? 0)
    : (row.suggestion ?? round(f, (lo + hi) / 2));
  return {
    ...s,
    [f]: { ...row, value: round(f, from + dir * step), set: true },
  };
}

/** Take the shown suggestion as read. No-op when there is none. */
export function accept(s: SheetState, f: ReadingField): SheetState {
  const row = s[f];
  if (row.set || row.suggestion === null) return s;
  return { ...s, [f]: { ...row, value: row.suggestion, set: true } };
}

export function toValues(s: SheetState): ReadingValues {
  const v = {} as ReadingValues;
  for (const f of READING_FIELDS) v[f] = s[f].set ? s[f].value : null;
  return v;
}
