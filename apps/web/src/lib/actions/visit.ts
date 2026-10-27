"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDraft,
  findOpenDraft,
  finishVisit as finishVisitData,
  loadVisitSnapshot,
  logReading as logReadingData,
  saveAdded as saveAddedData,
  saveFlag as saveFlagData,
  saveNotes as saveNotesData,
  savePhoto as savePhotoData,
  saveWork as saveWorkData,
  type Db,
} from "@/lib/visit-data";
import type { ReadingKind } from "@/lib/readings";
import type { CleaningStepCode } from "@/lib/types";
import {
  PHOTO_KINDS,
  type AddedProduct,
  type PhotoKind,
  type ReadingValues,
  type VisitSnapshot,
} from "@/lib/visit";

/** Signed-in user who may capture for this tub, or a thrown error. */
async function requireCapturer(
  propertyId: string
): Promise<{ db: Db; userId: string }> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const { data: canCapture } = await db.rpc("app_can_capture_property", {
    p_property: propertyId,
  });
  if (!canCapture) throw new Error("You can't log visits for this tub");
  return { db, userId: user.id };
}

/**
 * Start (or resume) a visit on a tub. The only way a draft is created — no
 * page creates one while rendering. A second tap returns the same open draft.
 */
export async function startVisit(
  propertyId: string
): Promise<{ visitId: string }> {
  const { db, userId } = await requireCapturer(propertyId);
  const visitId =
    (await findOpenDraft(db, propertyId, userId)) ??
    (await createDraft(db, propertyId, userId));
  return { visitId };
}

/** Fresh snapshot of a visit the signed-in user can see. */
export async function getVisitSnapshot(
  visitId: string
): Promise<VisitSnapshot> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  return loadVisitSnapshot(db, visitId);
}

/** Capture rights on the visit's tub, checked before every write. */
async function requireVisitCapturer(visitId: string): Promise<Db> {
  const db = await createClient();
  const { data } = await db
    .from("turnover")
    .select("property_id")
    .eq("id", visitId)
    .maybeSingle();
  if (!data) throw new Error("Visit not found");
  return (await requireCapturer(data.property_id)).db;
}

/** Run one write, then hand back the fresh snapshot the screen renders. */
async function write(
  visitId: string,
  fn: (db: Db) => Promise<void>
): Promise<VisitSnapshot> {
  const db = await requireVisitCapturer(visitId);
  await fn(db);
  return loadVisitSnapshot(db, visitId);
}

export async function saveWork(
  visitId: string,
  work: CleaningStepCode[]
): Promise<VisitSnapshot> {
  return write(visitId, (db) => saveWorkData(db, visitId, work));
}

export async function saveAdded(
  visitId: string,
  added: AddedProduct[]
): Promise<VisitSnapshot> {
  return write(visitId, (db) => saveAddedData(db, visitId, added));
}

export async function saveNotes(
  visitId: string,
  notes: string
): Promise<VisitSnapshot> {
  return write(visitId, (db) => saveNotesData(db, visitId, notes));
}

export async function logReading(
  visitId: string,
  kind: ReadingKind,
  values: ReadingValues
): Promise<VisitSnapshot> {
  if (kind !== "found" && kind !== "left") throw new Error("Unknown reading");
  return write(visitId, (db) => logReadingData(db, visitId, kind, values));
}

export async function saveFlag(
  visitId: string,
  flag: string | null
): Promise<VisitSnapshot> {
  return write(visitId, (db) => saveFlagData(db, visitId, flag));
}

/** FormData: visitId, kind (before | after | cover), file, capturedAt (ISO). */
export async function savePhoto(formData: FormData): Promise<VisitSnapshot> {
  const visitId = String(formData.get("visitId") ?? "");
  const kind = String(formData.get("kind") ?? "") as PhotoKind;
  const file = formData.get("file");
  const capturedRaw = String(formData.get("capturedAt") ?? "");
  if (!Object.hasOwn(PHOTO_KINDS, kind)) throw new Error("Unknown photo");
  if (!(file instanceof Blob) || file.size === 0)
    throw new Error("No photo received");
  const capturedAt = Number.isNaN(Date.parse(capturedRaw))
    ? new Date().toISOString()
    : capturedRaw;
  return write(visitId, (db) =>
    savePhotoData(db, visitId, kind, file, capturedAt)
  );
}

/** Lock the visit as it stands. Nothing blocks this. */
export async function finishVisit(
  visitId: string
): Promise<{ visitId: string }> {
  const db = await requireVisitCapturer(visitId);
  await finishVisitData(db, visitId);
  return { visitId };
}
