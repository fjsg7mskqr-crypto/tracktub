"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
