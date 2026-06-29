"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EQUIPMENT_TYPES, type EquipmentType } from "@/lib/equipment";

export type ActionResult = { ok: true } | { ok: false; error: string };

const VALID_TYPES = new Set<string>(EQUIPMENT_TYPES.map((t) => t.value));

interface EquipmentInput {
  propertyId: string;
  orgId: string;
  type: EquipmentType;
  makeModel: string | null;
  installedAt: string | null;
  warrantyUntil: string | null;
  notes: string | null;
}

function parseEquipmentInput(formData: FormData): EquipmentInput | { error: string } {
  const propertyId = (formData.get("property_id") as string) ?? "";
  const orgId = (formData.get("org_id") as string) ?? "";
  const type = (formData.get("type") as string) ?? "";
  const makeModel = ((formData.get("make_model") as string) ?? "").trim() || null;
  const installedAt = ((formData.get("installed_at") as string) ?? "").trim() || null;
  const warrantyUntil = ((formData.get("warranty_until") as string) ?? "").trim() || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!propertyId || !orgId) return { error: "Missing property." };
  if (!VALID_TYPES.has(type)) return { error: "Pick an equipment type." };

  return {
    propertyId,
    orgId,
    type: type as EquipmentType,
    makeModel,
    installedAt,
    warrantyUntil,
    notes,
  };
}

function equipmentRow(parsed: EquipmentInput) {
  return {
    property_id: parsed.propertyId,
    org_id: parsed.orgId,
    type: parsed.type,
    make_model: parsed.makeModel,
    installed_at: parsed.installedAt,
    warranty_until: parsed.warrantyUntil,
    notes: parsed.notes,
  };
}

export async function createEquipmentAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseEquipmentInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { error } = await supabase.from("equipment").insert(equipmentRow(parsed));
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/equipment");
  return { ok: true };
}

export async function updateEquipmentAction(
  equipmentId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const parsed = parseEquipmentInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { error } = await supabase
    .from("equipment")
    .update({
      type: parsed.type,
      make_model: parsed.makeModel,
      installed_at: parsed.installedAt,
      warranty_until: parsed.warrantyUntil,
      notes: parsed.notes,
    })
    .eq("id", equipmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/equipment");
  return { ok: true };
}

export async function archiveEquipmentAction(equipmentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("equipment")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", equipmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/equipment");
  return { ok: true };
}

export async function saveOrgNoteAction(orgId: string, body: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("org_note").upsert({
    org_id: orgId,
    body: body.trim() || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/equipment");
  return { ok: true };
}
