"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateResult = { ok: true; id: string } | { ok: false; error: string };

interface SupplyInput {
  propertyId: string;
  orgId: string;
  name: string;
  unit: string | null;
  quantity: number | null;
  reorderAt: number | null;
  notes: string | null;
}

/** Parse a numeric form field: blank → null, non-numeric → error. */
function parseNumber(raw: string, field: string): number | null | { error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return { error: `${field} must be a number.` };
  return n;
}

function parseSupplyInput(formData: FormData): SupplyInput | { error: string } {
  const propertyId = (formData.get("property_id") as string) ?? "";
  const orgId = (formData.get("org_id") as string) ?? "";
  const name = ((formData.get("name") as string) ?? "").trim();
  const unit = ((formData.get("unit") as string) ?? "").trim() || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!propertyId || !orgId) return { error: "Missing property." };
  if (!name) return { error: "Name is required." };

  const quantity = parseNumber((formData.get("quantity") as string) ?? "", "Quantity");
  if (quantity !== null && typeof quantity === "object") return quantity;
  const reorderAt = parseNumber((formData.get("reorder_at") as string) ?? "", "Reorder point");
  if (reorderAt !== null && typeof reorderAt === "object") return reorderAt;

  return { propertyId, orgId, name, unit, quantity, reorderAt, notes };
}

function supplyRow(parsed: SupplyInput) {
  return {
    property_id: parsed.propertyId,
    org_id: parsed.orgId,
    name: parsed.name,
    unit: parsed.unit,
    quantity: parsed.quantity,
    reorder_at: parsed.reorderAt,
    notes: parsed.notes,
  };
}

function revalidate() {
  revalidatePath("/operations/supplies");
  revalidatePath("/operations");
}

export async function createSupplyAction(formData: FormData): Promise<CreateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseSupplyInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { data, error } = await supabase
    .from("supply")
    .insert(supplyRow(parsed))
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true, id: data.id };
}

export async function updateSupplyAction(
  supplyId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const parsed = parseSupplyInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { error } = await supabase
    .from("supply")
    .update({
      name: parsed.name,
      unit: parsed.unit,
      quantity: parsed.quantity,
      reorder_at: parsed.reorderAt,
      notes: parsed.notes,
    })
    .eq("id", supplyId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

/** One-tap restock: set the new on-hand quantity and stamp today's date. */
export async function restockSupplyAction(
  supplyId: string,
  quantity: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false, error: "Quantity must be a number." };
  }

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("supply")
    .update({ quantity, last_restocked_at: today })
    .eq("id", supplyId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function archiveSupplyAction(supplyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("supply")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", supplyId);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
