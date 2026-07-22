"use server";

import { redirect } from "next/navigation";
import { ensureDraftTurnoverAction } from "@/lib/actions/turnover";

/**
 * Start (or resume) a turnover from the Today prep brief, then send the tech
 * straight into the camera-anchored capture flow. Reuses the existing,
 * access-checked `ensureDraftTurnoverAction`: with a draft id it resumes that
 * draft, otherwise it reuses an open draft or creates a fresh one.
 *
 * The `/field/turnover/<id>` route arrives in Task 3; until then a 404 there is
 * expected — the draft is still created and the URL is correct.
 */
export async function startFieldTurnoverAction(formData: FormData): Promise<void> {
  const propertyId = String(formData.get("propertyId") ?? "");
  const rawTurnoverId = formData.get("turnoverId");
  const turnoverId =
    typeof rawTurnoverId === "string" && rawTurnoverId.length > 0
      ? rawTurnoverId
      : null;

  if (!propertyId) throw new Error("Missing propertyId");

  const snapshot = await ensureDraftTurnoverAction(propertyId, turnoverId);
  redirect(`/field/turnover/${snapshot.turnoverId}`);
}
