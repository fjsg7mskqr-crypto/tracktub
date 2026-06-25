"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { asSanitizerType } from "@/lib/chemistry";

export type CreatePropertyResult =
  | { ok: true; propertyId: string }
  | { ok: false; wtp: true }
  | { ok: false; error: string };

export async function createPropertyAction(
  formData: FormData
): Promise<CreatePropertyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = ((formData.get("name") as string) ?? "").trim();
  const address =
    ((formData.get("address") as string) ?? "").trim() || null;
  const tubNotes =
    ((formData.get("tub_notes") as string) ?? "").trim() || null;
  const sanitizerType = asSanitizerType(formData.get("sanitizer_type"));

  if (!name) return { ok: false, error: "Property name is required." };

  const { data: membership } = await supabase
    .from("membership")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("role", "operator")
    .single();
  if (!membership)
    return { ok: false, error: "No operator workspace found." };

  const { count } = await supabase
    .from("property")
    .select("id", { count: "exact", head: true })
    .eq("org_id", membership.org_id);

  if ((count ?? 0) >= 1) {
    return { ok: false, wtp: true };
  }

  const { data: property, error } = await supabase
    .from("property")
    .insert({
      name,
      address,
      tub_notes: tubNotes,
      sanitizer_type: sanitizerType,
      org_id: membership.org_id,
    })
    .select("id")
    .single();

  if (error || !property)
    return {
      ok: false,
      error: error?.message ?? "Failed to create property.",
    };

  return { ok: true, propertyId: property.id };
}

// Per-property settings edit (#178). Currently the sanitizer type — RLS scopes
// the update to properties the caller can manage, so no extra ownership check is
// needed here. Returns the saved type so the client can reflect it.
export async function updatePropertySanitizerTypeAction(
  propertyId: string,
  rawType: unknown
): Promise<{ ok: true; sanitizerType: "chlorine" | "bromine" } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sanitizerType = asSanitizerType(rawType);

  const { error } = await supabase
    .from("property")
    .update({ sanitizer_type: sanitizerType })
    .eq("id", propertyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/p/${propertyId}`);
  return { ok: true, sanitizerType };
}

// WTP fake-door (PRD §12): logs paid intent when an operator hits the
// 2nd-property wall and opts into the paid waitlist. No charge, no card.
export async function joinPaidWaitlistAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false };
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: user.email, source: "wtp_fake_door" });
  // Unique-email conflict still counts as intent.
  if (!error || error.code === "23505") return { ok: true };
  console.error("Failed to join paid waitlist:", error);
  return { ok: false };
}
