"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDraft,
  findOpenDraft,
  loadVisitSnapshot,
  type Db,
} from "@/lib/visit-data";
import type { VisitSnapshot } from "@/lib/visit";

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
