"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getVerifiedMembership } from "@/lib/auth";

export type CreateInviteResult =
  { ok: true; inviteId: string; token: string } | { ok: false; error: string };

/**
 * Admin-only: mint a one-time invite link for a new login (D29: a staff
 * membership that sees every property unless narrowed to `propertyIds`). The
 * `invite_operator_all` RLS policy is the real guard — a non-operator insert is
 * rejected even if this check is bypassed. Returns the token; the caller
 * composes `${origin}/invite/${token}`.
 */
export async function createInviteAction(input: {
  email: string | null;
  allProperties: boolean;
  propertyIds: string[];
}): Promise<CreateInviteResult> {
  const membership = await getVerifiedMembership();
  if (!membership) return { ok: false, error: "Not signed in." };
  if (membership.role !== "operator") {
    return { ok: false, error: "Only the admin can invite people." };
  }

  const email = (input.email ?? "").trim() || null;
  const token = randomUUID();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invite")
    .insert({
      org_id: membership.orgId,
      role: "staff",
      all_properties: input.allProperties,
      property_ids: input.allProperties ? [] : input.propertyIds,
      email,
      token,
      invited_by: membership.userId,
    })
    .select("id, token")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Could not create the invite.",
    };
  }
  return { ok: true, inviteId: data.id, token: data.token };
}

/**
 * Accept an invite as the signed-in user. Redirects to login (preserving the
 * return path) when signed out, then to `/` on success.
 */
export async function acceptInviteAction(
  token: string
): Promise<{ error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invite/${token}`);

  const { error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error) return { error: error.message };
  redirect("/");
}

/** Operator-only: revoke a pending invite by deleting its row. */
export async function revokeInviteAction(
  inviteId: string
): Promise<{ ok: boolean; error?: string }> {
  const membership = await getVerifiedMembership();
  if (membership?.role !== "operator") {
    return { ok: false, error: "Only the admin can cancel invites." };
  }
  const supabase = await createClient();
  // RLS (invite_operator_all) scopes the delete to the operator's own org.
  const { error } = await supabase.from("invite").delete().eq("id", inviteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/people");
  return { ok: true };
}
