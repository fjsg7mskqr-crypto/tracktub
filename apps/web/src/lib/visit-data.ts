// Visit data access (app rebuild screen 6). Every function takes the Supabase
// client so server actions and the integration test (tests/visit.rls.test.ts)
// run the same code. RLS does the access control; callers check the actor can
// capture for the property first (src/lib/actions/visit.ts).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  READING_FIELDS,
  readingColumn,
  type ReadingKind,
} from "@/lib/readings";
import { CLEANING_STEPS, type CleaningStepCode } from "@/lib/types";
import {
  PHOTO_KINDS,
  decodeAdded,
  encodeAdded,
  photoKindOf,
  type AddedProduct,
  type PhotoKind,
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
      capturedAt: r.captured_at ? new Date(r.captured_at).toISOString() : null,
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
      `id, property_id, status, created_at, notes, cleaning_steps, owner_flag,
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
          string | null)
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
    flag: t.owner_flag ?? null,
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

// --- Writes (draft only) ----------------------------------------------------

/** The draft's tub and org; throws "Visit is locked" once it is locked. */
async function requireDraft(
  db: Db,
  visitId: string
): Promise<{ propertyId: string; orgId: string }> {
  const { data, error } = await db
    .from("turnover")
    .select("status, property_id, property:property(org_id)")
    .eq("id", visitId)
    .maybeSingle();
  if (error || !data) throw new Error("Visit not found");
  if (data.status !== "draft") throw new Error("Visit is locked");
  const orgId = one(data.property)?.org_id;
  if (!orgId) throw new Error("Visit not found");
  return { propertyId: data.property_id, orgId };
}

function fail(what: string, error: { message: string } | null): void {
  if (error) throw new Error(`Failed to save ${what}: ${error.message}`);
}

/** Update the visit's single water_reading row, creating it on first write. */
async function upsertReading(
  db: Db,
  visitId: string,
  propertyId: string,
  patch: Database["public"]["Tables"]["water_reading"]["Update"],
  what: string
): Promise<void> {
  const { data: existing } = await db
    .from("water_reading")
    .select("id")
    .eq("turnover_id", visitId)
    .maybeSingle();
  if (existing) {
    const { error } = await db
      .from("water_reading")
      .update(patch)
      .eq("id", existing.id);
    fail(what, error);
  } else {
    const { error } = await db
      .from("water_reading")
      .insert({ ...patch, turnover_id: visitId, property_id: propertyId });
    fail(what, error);
  }
}

export async function saveWork(
  db: Db,
  visitId: string,
  work: CleaningStepCode[]
): Promise<void> {
  await requireDraft(db, visitId);
  const known = new Set<string>(CLEANING_STEPS.map((s) => s.code));
  const { error } = await db
    .from("turnover")
    .update({ cleaning_steps: [...new Set(work)].filter((c) => known.has(c)) })
    .eq("id", visitId);
  fail("work", error);
}

export async function saveAdded(
  db: Db,
  visitId: string,
  added: AddedProduct[]
): Promise<void> {
  const { propertyId } = await requireDraft(db, visitId);
  const treatments = added
    .filter((a) => a.product.trim() !== "")
    .map(encodeAdded);
  await upsertReading(db, visitId, propertyId, { treatments }, "products");
}

export async function saveNotes(
  db: Db,
  visitId: string,
  notes: string
): Promise<void> {
  await requireDraft(db, visitId);
  const { error } = await db
    .from("turnover")
    .update({ notes: notes.trim() || null })
    .eq("id", visitId);
  fail("notes", error);
}

/**
 * Log one reading. Writes exactly the four columns of this kind — a null value
 * stays null (never last visit's number) — and stamps when it was logged.
 */
export async function logReading(
  db: Db,
  visitId: string,
  kind: ReadingKind,
  values: ReadingValues
): Promise<void> {
  const { propertyId } = await requireDraft(db, visitId);
  const patch: Record<string, number | string | null> = {};
  for (const f of READING_FIELDS) {
    const v = values[f];
    patch[readingColumn(f, kind)] =
      typeof v === "number" && Number.isFinite(v) ? v : null;
  }
  patch[kind === "found" ? "found_recorded_at" : "left_recorded_at"] =
    new Date().toISOString();
  await upsertReading(db, visitId, propertyId, patch, "reading");
}

/** Store a camera photo for one kind, replacing an earlier shot of that kind. */
export async function savePhoto(
  db: Db,
  visitId: string,
  kind: PhotoKind,
  file: Blob,
  capturedAt: string
): Promise<void> {
  const { orgId } = await requireDraft(db, visitId);
  const { phase, slot } = PHOTO_KINDS[kind];
  // A fresh path per shot: the bucket is public, so reusing a path would let a
  // cached copy of the old shot show after a retake.
  const storagePath = `${orgId}/${visitId}/${phase}/${slot}-${crypto.randomUUID()}.jpg`;

  const { error: upErr } = await db.storage
    .from("photos")
    .upload(storagePath, file, { contentType: "image/jpeg" });
  if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);

  const { data: existing } = await db
    .from("photo")
    .select("id, storage_path")
    .eq("turnover_id", visitId)
    .eq("phase", phase)
    .eq("slot", slot);

  const [keep, ...extra] = existing ?? [];
  if (keep) {
    const { error } = await db
      .from("photo")
      .update({ storage_path: storagePath, captured_at: capturedAt })
      .eq("id", keep.id);
    fail("photo", error);
  } else {
    const { error } = await db.from("photo").insert({
      turnover_id: visitId,
      storage_path: storagePath,
      slot,
      phase,
      captured_at: capturedAt,
      confirmed_tags: [],
    });
    fail("photo", error);
  }
  if (extra.length) {
    await db
      .from("photo")
      .delete()
      .in(
        "id",
        extra.map((p) => p.id)
      );
  }
  const stale = (existing ?? [])
    .map((p) => p.storage_path)
    .filter((p): p is string => !!p && p !== storagePath);
  if (stale.length) await db.storage.from("photos").remove(stale);
}

/** Flag something for the owner (null clears it). Sets urgent to match. */
export async function saveFlag(
  db: Db,
  visitId: string,
  flag: string | null
): Promise<void> {
  await requireDraft(db, visitId);
  const text = flag?.trim() || null;
  const { error } = await db
    .from("turnover")
    .update({ owner_flag: text, urgent: text !== null })
    .eq("id", visitId);
  fail("flag", error);
}

/**
 * Lock the visit. Nothing is required; missing parts make it partial. The
 * share token is set in the same update, because turnover_lock_guard refuses
 * every change once the visit is locked (the record links depend on it).
 */
export async function finishVisit(db: Db, visitId: string): Promise<void> {
  await requireDraft(db, visitId);
  const { data } = await db
    .from("turnover")
    .select("share_token")
    .eq("id", visitId)
    .single();
  const { error } = await db
    .from("turnover")
    .update({
      status: "submitted_locked",
      share_token: data?.share_token ?? crypto.randomUUID(),
    })
    .eq("id", visitId);
  fail("visit", error);
}
