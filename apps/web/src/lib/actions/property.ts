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
