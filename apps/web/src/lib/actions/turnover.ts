"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";
import { sendReadyEmail } from "@/lib/email";
import { redirect } from "next/navigation";

export async function submitTurnoverAction(
  formData: FormData
): Promise<{ id: string; shareToken: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const propertyId = formData.get("propertyId") as string;
  const notes = ((formData.get("notes") as string) ?? "").trim();
  const urgent = formData.get("urgent") === "true";

  const { data: property, error: propErr } = await supabase
    .from("property")
    .select("id, org_id, name")
    .eq("id", propertyId)
    .single();
  if (propErr || !property)
    throw new Error("Property not found or access denied");

  const shareToken = crypto.randomUUID();
  const { data: turnover, error: tErr } = await supabase
    .from("turnover")
    .insert({
      property_id: propertyId,
      submitter_id: user.id,
      urgent,
      notes,
      status: "draft",
      share_token: shareToken,
    })
    .select("id")
    .single();
  if (tErr || !turnover)
    throw new Error(tErr?.message ?? "Failed to create turnover");

  const slots = ["wide", "waterline", "panel", "cover"] as const;
  const photoInserts: Array<{
    turnover_id: string;
    storage_path: string;
    slot: Enums<"photo_slot">;
    phase: Enums<"capture_phase">;
    captured_at: string;
    confirmed_tags: string[];
  }> = [];

  // BEFORE — the single "as found" shot (slot 'wide', phase 'before'). Stored
  // under a distinct `/before` path so it never collides with the after wide.
  const beforeFile = formData.get("photo_before") as File | null;
  if (beforeFile && beforeFile.size > 0) {
    const beforePath = `${property.org_id}/${turnover.id}/before`;
    const { error: beforeErr } = await supabase.storage
      .from("photos")
      .upload(beforePath, beforeFile, {
        contentType: beforeFile.type || "image/jpeg",
        upsert: false,
      });
    if (beforeErr)
      throw new Error(`Upload failed for before: ${beforeErr.message}`);
    photoInserts.push({
      turnover_id: turnover.id,
      storage_path: beforePath,
      slot: "wide",
      phase: "before",
      captured_at:
        (formData.get("capturedAt_before") as string | null) ??
        new Date().toISOString(),
      confirmed_tags: [],
    });
  }

  for (const slot of slots) {
    const file = formData.get(`photo_${slot}`) as File | null;
    if (!file || file.size === 0) continue;

    const capturedAt =
      (formData.get(`capturedAt_${slot}`) as string | null) ??
      new Date().toISOString();
    const tagsRaw = formData.get(`tags_${slot}`) as string | null;
    let confirmedTags: string[] = [];
    if (tagsRaw) {
      try {
        confirmedTags = JSON.parse(tagsRaw) as string[];
      } catch {
        // Malformed tags payload; proceed without tags
      }
    }

    const storagePath = `${property.org_id}/${turnover.id}/${slot}`;
    const { error: upErr } = await supabase.storage
      .from("photos")
      .upload(storagePath, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
    if (upErr) throw new Error(`Upload failed for ${slot}: ${upErr.message}`);

    photoInserts.push({
      turnover_id: turnover.id,
      storage_path: storagePath,
      slot,
      phase: "after",
      captured_at: capturedAt,
      confirmed_tags: confirmedTags,
    });
  }

  if (photoInserts.length > 0) {
    const { error: photoErr } = await supabase
      .from("photo")
      .insert(photoInserts);
    if (photoErr)
      throw new Error(`Failed to save photo records: ${photoErr.message}`);
  }

  // Water check (issue #99) — must land while the turnover is still `draft`
  // (RLS requires it). All three fields are optional; skip the row entirely if
  // none were entered. A blank/non-numeric field becomes null.
  const num = (key: string): number | null => {
    const raw = (formData.get(key) as string | null)?.trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const ph = num("ph");
  const sanitizerPpm = num("sanitizer_ppm");
  const tempF = num("temp_f");
  // What the tech added (as-found reading + treatments — the pro-standard record).
  let treatments: string[] = [];
  const treatmentsRaw = formData.get("treatments") as string | null;
  if (treatmentsRaw) {
    try {
      const parsed = JSON.parse(treatmentsRaw);
      if (Array.isArray(parsed))
        treatments = parsed.filter((t): t is string => typeof t === "string");
    } catch {
      // Malformed treatments payload; proceed without them.
    }
  }
  const treatmentNote =
    ((formData.get("treatment_note") as string) ?? "").trim() || null;
  const balanced = formData.get("balanced") === "true";

  if (
    ph !== null ||
    sanitizerPpm !== null ||
    tempF !== null ||
    treatments.length > 0 ||
    treatmentNote !== null ||
    balanced
  ) {
    const { error: readingErr } = await supabase.from("water_reading").insert({
      turnover_id: turnover.id,
      property_id: propertyId,
      ph,
      sanitizer_ppm: sanitizerPpm,
      temp_f: tempF,
      treatments,
      treatment_note: treatmentNote,
      balanced,
    });
    if (readingErr)
      throw new Error(`Failed to save water reading: ${readingErr.message}`);
  }

  const { error: lockErr } = await supabase
    .from("turnover")
    .update({ status: "submitted_locked" })
    .eq("id", turnover.id);
  if (lockErr) throw new Error(`Failed to lock turnover: ${lockErr.message}`);

  // Notify the property's host(s): fan out a "turnover ready" notification to
  // every operator/owner of the org (minus the submitter) and fire the email
  // stub per recipient. Best-effort — the turnover is already locked, so a
  // notification hiccup must never fail the submit (issue #117).
  try {
    const { data: recipients } = await supabase.rpc("notify_turnover_ready", {
      p_turnover_id: turnover.id,
    });
    for (const r of recipients ?? []) {
      await sendReadyEmail(r.email, property.name);
    }
  } catch {
    // Swallow: the evidence is captured and locked regardless of notification.
  }

  // Auto-fulfill a matching scheduled turnover (issue #157): link this capture
  // to the nearest planned turnover and flip it to done. Best-effort — the
  // turnover is already locked, so a no-match or hiccup must never fail submit.
  try {
    await supabase.rpc("fulfill_scheduled_turnover", {
      p_turnover_id: turnover.id,
    });
  } catch {
    // Swallow: an unfulfilled plan is fine; the evidence is captured regardless.
  }

  return { id: turnover.id, shareToken };
}
