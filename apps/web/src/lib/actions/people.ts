"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createInviteAction } from "@/lib/actions/invite";
import { parseAccess } from "@/lib/people";
import { getURL } from "@/lib/url";

export type AddPersonState = { error: string | null; link: string | null };
export type ActionState = { error: string | null; done: boolean };

// Only the admin (operator) manages logins (D29). RLS is the real guard —
// invite and membership writes are operator-only — these checks give a clear
// message instead of a silent no-op.

/** Admin: create an invite link for a new login. */
export async function addPersonAction(
  _prev: AddPersonState,
  fd: FormData
): Promise<AddPersonState> {
  const membership = await getVerifiedMembership();
  if (membership?.role !== "operator")
    return { error: "Only the admin can add people.", link: null };

  const raw = fd.get("email");
  const email = typeof raw === "string" ? raw.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Enter their email.", link: null };

  const access = parseAccess(fd);
  if (!access.ok) return { error: access.error, link: null };

  const res = await createInviteAction({
    email,
    allProperties: access.allProperties,
    propertyIds: access.propertyIds,
  });
  if (!res.ok)
    return { error: "Couldn't create the invite. Try again.", link: null };

  revalidatePath("/people");
  return { error: null, link: `${getURL()}/invite/${res.token}` };
}

/** The org's property ids, to keep assignment writes inside the org. */
async function orgPropertyIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("property")
    .select("id")
    .eq("org_id", orgId);
  if (error) return null;
  return (data ?? []).map((p) => p.id);
}

/** True when `userId` is a (non-admin) staff login of the org. */
async function isStaffOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("membership")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role === "staff";
}

/** Admin: set which properties a login sees. */
export async function updateAccessAction(
  userId: string,
  _prev: ActionState,
  fd: FormData
): Promise<ActionState> {
  const membership = await getVerifiedMembership();
  if (membership?.role !== "operator")
    return { error: "Only the admin can change access.", done: false };

  const access = parseAccess(fd);
  if (!access.ok) return { error: access.error, done: false };

  const supabase = await createClient();
  if (!(await isStaffOf(supabase, membership.orgId, userId)))
    return { error: "That person isn't on this account.", done: false };
  const orgProps = await orgPropertyIds(supabase, membership.orgId);
  if (!orgProps) return { error: "Couldn't save. Try again.", done: false };

  const { error: mErr } = await supabase
    .from("membership")
    .update({ all_properties: access.allProperties })
    .eq("org_id", membership.orgId)
    .eq("user_id", userId);
  if (mErr) return { error: "Couldn't save. Try again.", done: false };

  // Assignments only matter when narrowed; clear them either way so a later
  // narrowing starts from the admin's picks, not stale ones.
  if (orgProps.length > 0) {
    const { error } = await supabase
      .from("staff_assignment")
      .delete()
      .eq("staff_user_id", userId)
      .in("property_id", orgProps);
    if (error) return { error: "Couldn't save. Try again.", done: false };
  }
  const picks = access.propertyIds.filter((id) => orgProps.includes(id));
  if (!access.allProperties && picks.length > 0) {
    const { error } = await supabase
      .from("staff_assignment")
      .insert(
        picks.map((property_id) => ({ property_id, staff_user_id: userId }))
      );
    if (error) return { error: "Couldn't save. Try again.", done: false };
  }

  revalidatePath("/people");
  return { error: null, done: true };
}

/** Admin: remove a login from the account. The admin can't remove themselves. */
export async function removePersonAction(
  userId: string
): Promise<{ error: string | null }> {
  const membership = await getVerifiedMembership();
  if (membership?.role !== "operator")
    return { error: "Only the admin can remove people." };
  if (userId === membership.userId)
    return { error: "You can't remove yourself." };

  const supabase = await createClient();
  if (!(await isStaffOf(supabase, membership.orgId, userId)))
    return { error: "That person isn't on this account." };

  const orgProps = await orgPropertyIds(supabase, membership.orgId);
  if (!orgProps) return { error: "Couldn't remove them. Try again." };
  if (orgProps.length > 0) {
    const { error } = await supabase
      .from("staff_assignment")
      .delete()
      .eq("staff_user_id", userId)
      .in("property_id", orgProps);
    if (error) return { error: "Couldn't remove them. Try again." };
  }
  const { error } = await supabase
    .from("membership")
    .delete()
    .eq("org_id", membership.orgId)
    .eq("user_id", userId);
  if (error) return { error: "Couldn't remove them. Try again." };

  revalidatePath("/people");
  return { error: null };
}
