"use server";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";
import type { CleaningStepCode } from "@/lib/types";
import { CLEANING_STEPS } from "@/lib/types";
import { sendReadyEmail } from "@/lib/email";
import {
  REQUIRED_LOCK_PHOTOS,
  guidedPhotoStoragePath,
  issuePhotoStoragePath,
  photoKey,
} from "@/lib/capture-v2";
import { redirect } from "next/navigation";

export type DraftPhoto = {
  id: string;
  slot: Enums<"photo_slot">;
  phase: Enums<"capture_phase">;
  storagePath: string | null;
  caption: string | null;
  capturedAt: string | null;
};

export type DraftReading = {
  total_alkalinity: number | null;
  ph: number | null;
  calcium_hardness: number | null;
  sanitizer_ppm: number | null;
  temp_f: number | null;
  treatments: string[];
  treatment_note: string | null;
  balanced: boolean;
};

export type DraftSnapshot = {
  turnoverId: string;
  shareToken: string;
  photos: DraftPhoto[];
  reading: DraftReading | null;
  notes: string;
  urgent: boolean;
  cleaningSteps: CleaningStepCode[];
};

function parseNum(raw: FormDataEntryValue | null): number | null {
  const s = (raw as string | null)?.trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseStringArray(raw: FormDataEntryValue | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function parseCleaningSteps(raw: FormDataEntryValue | null): CleaningStepCode[] {
  const codes = parseStringArray(raw);
  const allowed = new Set(CLEANING_STEPS.map((s) => s.code));
  return codes.filter((c): c is CleaningStepCode =>
    allowed.has(c as CleaningStepCode)
  );
}

async function requireCapturer(propertyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: property, error: propErr } = await supabase
    .from("property")
    .select("id, org_id, name")
    .eq("id", propertyId)
    .single();
  if (propErr || !property)
    throw new Error("Property not found or access denied");

  const { data: canCapture } = await supabase.rpc("app_can_capture_property", {
    p_property: propertyId,
  });
  if (!canCapture) throw new Error("Not authorized to capture for this property");

  return { supabase, user, property };
}

async function loadDraftSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  turnoverId: string
): Promise<DraftSnapshot> {
  const { data: t, error } = await supabase
    .from("turnover")
    .select(
      `id, share_token, notes, urgent, cleaning_steps,
       photos:photo(id, slot, phase, storage_path, caption, captured_at),
       water:water_reading(total_alkalinity, ph, calcium_hardness, sanitizer_ppm, temp_f, treatments, treatment_note, balanced)`
    )
    .eq("id", turnoverId)
    .eq("status", "draft")
    .single();
  if (error || !t) throw new Error("Draft turnover not found");

  const reading = Array.isArray(t.water) ? t.water[0] : t.water;

  return {
    turnoverId: t.id,
    shareToken: t.share_token ?? "",
    photos: (t.photos ?? []).map((p) => ({
      id: p.id,
      slot: p.slot,
      phase: p.phase,
      storagePath: p.storage_path,
      caption: p.caption,
      capturedAt: p.captured_at,
    })),
    reading: reading
      ? {
          total_alkalinity: reading.total_alkalinity,
          ph: reading.ph,
          calcium_hardness: reading.calcium_hardness,
          sanitizer_ppm: reading.sanitizer_ppm,
          temp_f: reading.temp_f,
          treatments: reading.treatments ?? [],
          treatment_note: reading.treatment_note,
          balanced: reading.balanced ?? false,
        }
      : null,
    notes: t.notes ?? "",
    urgent: t.urgent ?? false,
    cleaningSteps: (t.cleaning_steps ?? []) as CleaningStepCode[],
  };
}

/** Create or resume the property's in-progress draft for the current capturer. */
export async function ensureDraftTurnoverAction(
  propertyId: string,
  turnoverId?: string | null
): Promise<DraftSnapshot> {
  const { supabase, user, property } = await requireCapturer(propertyId);

  if (turnoverId) {
    const { data: existing } = await supabase
      .from("turnover")
      .select("id, property_id, submitter_id, status")
      .eq("id", turnoverId)
      .single();
    if (
      !existing ||
      existing.status !== "draft" ||
      existing.property_id !== propertyId ||
      existing.submitter_id !== user.id
    ) {
      throw new Error("Draft not found or access denied");
    }
    return loadDraftSnapshot(supabase, existing.id);
  }

  const { data: openDraft } = await supabase
    .from("turnover")
    .select("id")
    .eq("property_id", propertyId)
    .eq("submitter_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openDraft) return loadDraftSnapshot(supabase, openDraft.id);

  const shareToken = crypto.randomUUID();
  const { data: created, error } = await supabase
    .from("turnover")
    .insert({
      property_id: propertyId,
      submitter_id: user.id,
      status: "draft",
      share_token: shareToken,
      cleaning_steps: CLEANING_STEPS.map((s) => s.code),
    })
    .select("id")
    .single();
  if (error || !created)
    throw new Error(error?.message ?? "Failed to start turnover draft");

  void property; // org_id used by upload helpers
  return loadDraftSnapshot(supabase, created.id);
}

/** Persist a guided before/after photo while the turnover is still draft. */
export async function saveGuidedPhotoAction(
  formData: FormData
): Promise<DraftSnapshot> {
  const propertyId = formData.get("propertyId") as string;
  const turnoverId = formData.get("turnoverId") as string;
  const slot = formData.get("slot") as Enums<"photo_slot">;
  const phase = formData.get("phase") as Enums<"capture_phase">;
  const file = formData.get("file") as File | null;
  const capturedAt =
    (formData.get("capturedAt") as string | null) ?? new Date().toISOString();

  if (!file || file.size === 0) throw new Error("No photo provided");

  const { supabase, user, property } = await requireCapturer(propertyId);

  const { data: draft } = await supabase
    .from("turnover")
    .select("id, property_id, submitter_id, status")
    .eq("id", turnoverId)
    .single();
  if (
    !draft ||
    draft.status !== "draft" ||
    draft.property_id !== propertyId ||
    draft.submitter_id !== user.id
  ) {
    throw new Error("Draft not found or access denied");
  }

  const storagePath = guidedPhotoStoragePath(
    property.org_id,
    turnoverId,
    slot,
    phase
  );

  const { data: existing } = await supabase
    .from("photo")
    .select("id")
    .eq("turnover_id", turnoverId)
    .eq("slot", slot)
    .eq("phase", phase)
    .maybeSingle();

  const { error: upErr } = await supabase.storage
    .from("photos")
    .upload(storagePath, file, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  if (existing) {
    const { error: updErr } = await supabase
      .from("photo")
      .update({
        storage_path: storagePath,
        captured_at: capturedAt,
        caption: null,
      })
      .eq("id", existing.id);
    if (updErr) throw new Error(`Failed to update photo: ${updErr.message}`);
  } else {
    const { error: insErr } = await supabase.from("photo").insert({
      turnover_id: turnoverId,
      storage_path: storagePath,
      slot,
      phase,
      captured_at: capturedAt,
      confirmed_tags: [],
    });
    if (insErr) throw new Error(`Failed to save photo: ${insErr.message}`);
  }

  return loadDraftSnapshot(supabase, turnoverId);
}

/** Add an optional issue photo (before phase) with optional caption. */
export async function addIssuePhotoAction(
  formData: FormData
): Promise<DraftSnapshot> {
  const propertyId = formData.get("propertyId") as string;
  const turnoverId = formData.get("turnoverId") as string;
  const file = formData.get("file") as File | null;
  const caption = ((formData.get("caption") as string) ?? "").trim() || null;
  const capturedAt =
    (formData.get("capturedAt") as string | null) ?? new Date().toISOString();

  if (!file || file.size === 0) throw new Error("No photo provided");

  const { supabase, user, property } = await requireCapturer(propertyId);

  const { data: draft } = await supabase
    .from("turnover")
    .select("id, property_id, submitter_id, status")
    .eq("id", turnoverId)
    .single();
  if (
    !draft ||
    draft.status !== "draft" ||
    draft.property_id !== propertyId ||
    draft.submitter_id !== user.id
  ) {
    throw new Error("Draft not found or access denied");
  }

  const photoId = crypto.randomUUID();
  const storagePath = issuePhotoStoragePath(
    property.org_id,
    turnoverId,
    photoId
  );

  const { error: upErr } = await supabase.storage
    .from("photos")
    .upload(storagePath, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  const { error: insErr } = await supabase.from("photo").insert({
    id: photoId,
    turnover_id: turnoverId,
    storage_path: storagePath,
    slot: "issue",
    phase: "before",
    captured_at: capturedAt,
    caption,
    confirmed_tags: [],
  });
  if (insErr) throw new Error(`Failed to save issue photo: ${insErr.message}`);

  return loadDraftSnapshot(supabase, turnoverId);
}

export async function updateIssueCaptionAction(
  photoId: string,
  turnoverId: string,
  propertyId: string,
  caption: string
): Promise<DraftSnapshot> {
  const { supabase, user } = await requireCapturer(propertyId);

  const { data: draft } = await supabase
    .from("turnover")
    .select("id, property_id, submitter_id, status")
    .eq("id", turnoverId)
    .single();
  if (
    !draft ||
    draft.status !== "draft" ||
    draft.property_id !== propertyId ||
    draft.submitter_id !== user.id
  ) {
    throw new Error("Draft not found or access denied");
  }

  const { error } = await supabase
    .from("photo")
    .update({ caption: caption.trim() || null })
    .eq("id", photoId)
    .eq("turnover_id", turnoverId)
    .eq("slot", "issue");
  if (error) throw new Error(`Failed to update caption: ${error.message}`);

  return loadDraftSnapshot(supabase, turnoverId);
}

export async function removeIssuePhotoAction(
  photoId: string,
  turnoverId: string,
  propertyId: string
): Promise<DraftSnapshot> {
  const { supabase, user } = await requireCapturer(propertyId);

  const { data: draft } = await supabase
    .from("turnover")
    .select("id, property_id, submitter_id, status")
    .eq("id", turnoverId)
    .single();
  if (
    !draft ||
    draft.status !== "draft" ||
    draft.property_id !== propertyId ||
    draft.submitter_id !== user.id
  ) {
    throw new Error("Draft not found or access denied");
  }

  const { data: photo } = await supabase
    .from("photo")
    .select("storage_path")
    .eq("id", photoId)
    .eq("turnover_id", turnoverId)
    .eq("slot", "issue")
    .maybeSingle();

  const { error: delErr } = await supabase
    .from("photo")
    .delete()
    .eq("id", photoId)
    .eq("turnover_id", turnoverId)
    .eq("slot", "issue");
  if (delErr) throw new Error(`Failed to remove photo: ${delErr.message}`);

  if (photo?.storage_path) {
    await supabase.storage.from("photos").remove([photo.storage_path]);
  }

  return loadDraftSnapshot(supabase, turnoverId);
}

/** Upsert water reading while draft (all fields optional). */
export async function saveDraftReadingAction(
  formData: FormData
): Promise<DraftSnapshot> {
  const propertyId = formData.get("propertyId") as string;
  const turnoverId = formData.get("turnoverId") as string;

  const { supabase, user } = await requireCapturer(propertyId);

  const { data: draft } = await supabase
    .from("turnover")
    .select("id, property_id, submitter_id, status")
    .eq("id", turnoverId)
    .single();
  if (
    !draft ||
    draft.status !== "draft" ||
    draft.property_id !== propertyId ||
    draft.submitter_id !== user.id
  ) {
    throw new Error("Draft not found or access denied");
  }

  const payload = {
    turnover_id: turnoverId,
    property_id: propertyId,
    total_alkalinity: parseNum(formData.get("total_alkalinity")),
    ph: parseNum(formData.get("ph")),
    calcium_hardness: parseNum(formData.get("calcium_hardness")),
    sanitizer_ppm: parseNum(formData.get("sanitizer_ppm")),
    temp_f: parseNum(formData.get("temp_f")),
    treatments: parseStringArray(formData.get("treatments")),
    treatment_note:
      ((formData.get("treatment_note") as string) ?? "").trim() || null,
    balanced: formData.get("balanced") === "true",
  };

  const hasContent =
    payload.total_alkalinity !== null ||
    payload.ph !== null ||
    payload.calcium_hardness !== null ||
    payload.sanitizer_ppm !== null ||
    payload.temp_f !== null ||
    payload.treatments.length > 0 ||
    payload.treatment_note !== null ||
    payload.balanced;

  const { data: existing } = await supabase
    .from("water_reading")
    .select("id")
    .eq("turnover_id", turnoverId)
    .maybeSingle();

  if (!hasContent) {
    if (existing) {
      await supabase.from("water_reading").delete().eq("id", existing.id);
    }
  } else if (existing) {
    const { error } = await supabase
      .from("water_reading")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(`Failed to save reading: ${error.message}`);
  } else {
    const { error } = await supabase.from("water_reading").insert(payload);
    if (error) throw new Error(`Failed to save reading: ${error.message}`);
  }

  return loadDraftSnapshot(supabase, turnoverId);
}

export async function saveDraftMetaAction(
  formData: FormData
): Promise<DraftSnapshot> {
  const propertyId = formData.get("propertyId") as string;
  const turnoverId = formData.get("turnoverId") as string;
  const notes = ((formData.get("notes") as string) ?? "").trim();
  const urgent = formData.get("urgent") === "true";
  const cleaningSteps = parseCleaningSteps(formData.get("cleaning_steps"));

  const { supabase, user } = await requireCapturer(propertyId);

  const { data: draft } = await supabase
    .from("turnover")
    .select("id, property_id, submitter_id, status")
    .eq("id", turnoverId)
    .single();
  if (
    !draft ||
    draft.status !== "draft" ||
    draft.property_id !== propertyId ||
    draft.submitter_id !== user.id
  ) {
    throw new Error("Draft not found or access denied");
  }

  const { error } = await supabase
    .from("turnover")
    .update({ notes, urgent, cleaning_steps: cleaningSteps })
    .eq("id", turnoverId);
  if (error) throw new Error(`Failed to save: ${error.message}`);

  return loadDraftSnapshot(supabase, turnoverId);
}

function hasRequiredPhotos(photos: DraftPhoto[]): boolean {
  const keys = new Set(
    photos
      .filter((p) => p.storagePath)
      .map((p) => photoKey(p.slot, p.phase))
  );
  return REQUIRED_LOCK_PHOTOS.every(({ slot, phase }) =>
    keys.has(photoKey(slot, phase))
  );
}

/** Final submit — lock the draft after validating required guided photos. */
export async function lockTurnoverAction(
  formData: FormData
): Promise<{ id: string; shareToken: string }> {
  const propertyId = formData.get("propertyId") as string;
  const turnoverId = formData.get("turnoverId") as string;

  const { supabase, user, property } = await requireCapturer(propertyId);

  await saveDraftReadingAction(formData);
  await saveDraftMetaAction(formData);

  const snapshot = await loadDraftSnapshot(supabase, turnoverId);
  if (
    !hasRequiredPhotos(snapshot.photos)
  ) {
    throw new Error(
      "Required photos missing — capture before full-frame, after water-level, after full-frame, and cover before submitting."
    );
  }

  const { data: draft } = await supabase
    .from("turnover")
    .select("id, property_id, submitter_id, status, share_token")
    .eq("id", turnoverId)
    .single();
  if (
    !draft ||
    draft.status !== "draft" ||
    draft.property_id !== propertyId ||
    draft.submitter_id !== user.id
  ) {
    throw new Error("Draft not found or access denied");
  }

  const { error: lockErr } = await supabase
    .from("turnover")
    .update({ status: "submitted_locked" })
    .eq("id", turnoverId);
  if (lockErr) throw new Error(`Failed to lock turnover: ${lockErr.message}`);

  try {
    const { data: recipients } = await supabase.rpc("notify_turnover_ready", {
      p_turnover_id: turnoverId,
    });
    for (const r of recipients ?? []) {
      await sendReadyEmail(r.email, property.name);
    }
  } catch {
    /* best-effort */
  }

  try {
    await supabase.rpc("fulfill_scheduled_turnover", {
      p_turnover_id: turnoverId,
    });
  } catch {
    /* best-effort */
  }

  return { id: turnoverId, shareToken: draft.share_token ?? "" };
}

/** @deprecated Use lockTurnoverAction after incremental draft saves. */
export async function submitTurnoverAction(
  formData: FormData
): Promise<{ id: string; shareToken: string }> {
  return lockTurnoverAction(formData);
}
