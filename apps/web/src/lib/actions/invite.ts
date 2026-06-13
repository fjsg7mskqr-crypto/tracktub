"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";

export type InviteRole = "staff" | "owner";

export type CreateInviteResult =
  | { ok: true; inviteId: string; token: string }
  | { ok: false; error: string };

/**
 * Operator-only: mint a one-time invite link for a helper (cleaner/viewer),
 * scoped to specific properties. The `invite_operator_all` RLS policy is the
 * real guard — a non-operator insert is rejected even if this check is bypassed.
 * Returns the token; the caller composes `${origin}/invite/${token}`.
 */
export async function createInviteAction(input: {
  role: InviteRole;
  propertyIds: string[];
  email?: string | null;
}): Promise<CreateInviteResult> {
  const membership = await getCurrentMembership();
  if (!membership) return { ok: false, error: "Not signed in." };
  if (membership.role !== "operator") {
    return { ok: false, error: "Only the host can invite people." };
  }

  const role: InviteRole = input.role === "owner" ? "owner" : "staff";
  const email = (input.email ?? "").trim() || null;
  const token = randomUUID();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invite")
    .insert({
      org_id: membership.orgId,
      role,
      property_ids: input.propertyIds,
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
  const membership = await getCurrentMembership();
  if (membership?.role !== "operator") {
    return { ok: false, error: "Only the host can revoke invites." };
  }
  const supabase = await createClient();
  // RLS (invite_operator_all) scopes the delete to the operator's own org.
  const { error } = await supabase.from("invite").delete().eq("id", inviteId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type ResendInviteResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/** Operator-only: regenerate a pending invite's token + bump its expiry. */
export async function resendInviteAction(
  inviteId: string
): Promise<ResendInviteResult> {
  const membership = await getCurrentMembership();
  if (membership?.role !== "operator") {
    return { ok: false, error: "Only the host can resend invites." };
  }
  const supabase = await createClient();
  const token = randomUUID();
  const expiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data, error } = await supabase
    .from("invite")
    .update({ token, expires_at: expiresAt, accepted_at: null })
    .eq("id", inviteId)
    .select("token")
    .single();
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Could not resend the invite.",
    };
  }
  return { ok: true, token: data.token };
}
