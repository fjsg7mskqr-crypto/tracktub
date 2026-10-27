// Visit data access (app rebuild screen 6). Every function takes the Supabase
// client so server actions and the integration test (tests/visit.rls.test.ts)
// run the same code. RLS does the access control; callers check the actor can
// capture for the property first (src/lib/actions/visit.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { READING_FIELDS, readingColumn, type ReadingKind } from "@/lib/readings";
import { CLEANING_STEPS, type CleaningStepCode } from "@/lib/types";
import {
  decodeAdded,
  photoKindOf,
  type ReadingValues,
  type VisitPhoto,
  type VisitSnapshot,
} from "@/lib/visit";

export type Db = SupabaseClient<Database>;

type ReadingRow = Partial<Record<string, number | string | null>>;

const READING_SELECT =
  "total_alkalinity, ph, calcium_hardness, sanitizer_ppm, left_total_alkalinity, left_ph, left_calcium_hardness, left_sanitizer_ppm, found_recorded_at, left_recorded_at, recorded_at, treatments";

/** The newest open draft this user has on this tub, if any. */
export async function findOpenDraft(
  db: Db,
  propertyId: string,
  userId: string
): Promise<string | null> {
  const { data, error } = await db
    .from("turnover")
    .select("id")
    .eq("property_id", propertyId)
    .eq("submitter_id", userId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to look up open visit: ${error.message}`);
  return data?.id ?? null;
}

/** Insert a new draft turnover for this tub and return its id. */
export async function createDraft(
  db: Db,
  propertyId: string,
  userId: string
): Promise<string> {
  const { data, error } = await db
    .from("turnover")
    .insert({
      property_id: propertyId,
      submitter_id: userId,
      status: "draft",
      share_token: crypto.randomUUID(),
      cleaning_steps: [],
    })
    .select("id")
    .single();
  if (error || !data)
    throw new Error(`Failed to start visit: ${error?.message ?? "no row"}`);
  return data.id;
}

function readingFrom(
  row: ReadingRow | null | undefined,
  kind: ReadingKind
): ReadingValues | null {
  if (!row) return null;
  const values = {} as ReadingValues;
  for (const f of READING_FIELDS) {
    const v = row[readingColumn(f, kind)];
    values[f] = v === null || v === undefined ? null : Number(v);
  }
  return READING_FIELDS.some((f) => values[f] !== null) ? values : null;
}

type PhotoRow = {
  id: string;
  phase: string;
  slot: string;
  storage_path: string | null;
  captured_at: string | null;
  created_at: string;
};

/** One photo per kind; the newest row wins if a retake left two. */
function visitPhotos(rows: PhotoRow[] | null | undefined): VisitPhoto[] {
  const byKind = new Map<string, VisitPhoto & { createdAt: string }>();
  for (const r of rows ?? []) {
    const kind = photoKindOf(r.phase, r.slot);
    if (!kind || !r.storage_path) continue;
    const prev = byKind.get(kind);
    if (prev && prev.createdAt > r.created_at) continue;
    byKind.set(kind, {
      id: r.id,
      kind,
      storagePath: r.storage_path,
      capturedAt: r.captured_at,
      createdAt: r.created_at,
    });
  }
  return [...byKind.values()].map(({ createdAt: _, ...p }) => p);
}

const one = <T>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

/** Everything the visit screen needs, read fresh from the database. */
export async function loadVisitSnapshot(
  db: Db,
  visitId: string
): Promise<VisitSnapshot> {
  const { data: t, error } = await db
    .from("turnover")
    .select(
      `id, property_id, status, created_at, notes, cleaning_steps,
       property:property(name),
       photos:photo(id, phase, slot, storage_path, captured_at, created_at),
       water:water_reading(${READING_SELECT})`
    )
    .eq("id", visitId)
    .maybeSingle();
  if (error || !t) throw new Error("Visit not found");

  const water = one(t.water) as ReadingRow | null;
  const known = new Set<string>(CLEANING_STEPS.map((s) => s.code));
  const found = readingFrom(water, "found");
  const left = readingFrom(water, "left");

  return {
    visitId: t.id,
    propertyId: t.property_id,
    propertyName: one(t.property)?.name ?? "Tub",
    status: t.status,
    openedAt: t.created_at,
    photos: visitPhotos(t.photos),
    found,
    foundAt: found
      ? ((water?.found_recorded_at ?? water?.recorded_at ?? null) as
          | string
          | null)
      : null,
    left,
    leftAt: left ? ((water?.left_recorded_at ?? null) as string | null) : null,
    work: (t.cleaning_steps ?? []).filter((c): c is CleaningStepCode =>
      known.has(c)
    ),
    added: (((water?.treatments as unknown) ?? []) as string[]).map(
      decodeAdded
    ),
    notes: t.notes ?? "",
    flag: null,
    previous: await loadPrevious(db, t.property_id, t.id, t.created_at),
  };
}

/** The tub's last locked visit before this one. */
async function loadPrevious(
  db: Db,
  propertyId: string,
  visitId: string,
  before: string
): Promise<VisitSnapshot["previous"]> {
  const { data: p } = await db
    .from("turnover")
    .select(
      `id, created_at,
       photos:photo(id, phase, slot, storage_path, captured_at, created_at),
       water:water_reading(${READING_SELECT})`
    )
    .eq("property_id", propertyId)
    .eq("status", "submitted_locked")
    .neq("id", visitId)
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!p) return null;
  return {
    visitId: p.id,
    visitedOn: p.created_at,
    found: readingFrom(one(p.water) as ReadingRow | null, "found"),
    photos: visitPhotos(p.photos),
  };
}
