import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolveRole, type MemberRole } from "@/lib/role";

export type { MemberRole } from "@/lib/role";

export interface CurrentMembership {
  userId: string;
  email: string | null;
  orgId: string;
  role: MemberRole;
}

/**
 * Resolve the acting user's primary membership + role server-side (for page-
 * level branching and route guards). Uses the same {@link resolveRole} priority
 * as the client Shell. Returns null when signed out or membership-less.
 */
export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("membership")
    .select("org_id, role")
    .eq("user_id", user.id);
  if (!memberships || memberships.length === 0) return null;

  const operatorOrgs = memberships
    .filter((m) => m.role === "operator")
    .map((m) => m.org_id);
  let operatorOrgsWithProperties: string[] = [];
  if (operatorOrgs.length > 0) {
    const { data: props } = await supabase
      .from("property")
      .select("org_id")
      .in("org_id", operatorOrgs);
    operatorOrgsWithProperties = [
      ...new Set((props ?? []).map((p) => p.org_id)),
    ];
  }

  const resolved = resolveRole(memberships, operatorOrgsWithProperties);
  if (!resolved) return null;
  return {
    userId: user.id,
    email: user.email ?? null,
    orgId: resolved.orgId,
    role: resolved.role,
  };
}

/** Redirect to `/` unless the acting user resolves to `operator`. */
export async function requireOperator(): Promise<CurrentMembership> {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role !== "operator") redirect("/");
  return membership;
}
