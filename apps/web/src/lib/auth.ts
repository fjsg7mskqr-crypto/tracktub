import { cache } from "react";
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
 * Who is signed in, from the session cookie. `getClaims()` verifies the access
 * token's signature: locally against the project's cached JWKS when it is
 * signed with an asymmetric key (prod: ES256, no network call), or with an auth
 * server round trip for a legacy HS256 token. `verifyWithAuthServer` always
 * asks the auth server (`getUser()`), which also catches a session revoked
 * since the token was issued — used before writes.
 */
async function sessionUser(
  verifyWithAuthServer: boolean
): Promise<{ id: string; email: string | null } | null> {
  const supabase = await createClient();
  if (verifyWithAuthServer) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  }
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: claims.email ?? null };
}

/** The signed-in user from the verified token claims, once per request. For
 *  reads that need only the user id (e.g. their own profile row). */
export const getSessionUser = cache(() => sessionUser(false));

// One resolution per request (React `cache`): a layout, a page and its loaders
// can all ask without repeating the round trips.
const loadMembership = cache(
  async (verifyWithAuthServer: boolean): Promise<CurrentMembership | null> => {
    const user = verifyWithAuthServer
      ? await sessionUser(true)
      : await getSessionUser();
    if (!user) return null;

    const supabase = await createClient();
    // Independent reads, run together. RLS scopes `property` to the caller's
    // orgs; resolveRole only looks at the operator orgs among them.
    const [{ data: memberships }, { data: props }] = await Promise.all([
      supabase.from("membership").select("org_id, role").eq("user_id", user.id),
      supabase.from("property").select("org_id"),
    ]);
    if (!memberships || memberships.length === 0) return null;

    const operatorOrgs = new Set(
      memberships.filter((m) => m.role === "operator").map((m) => m.org_id)
    );
    const operatorOrgsWithProperties = [
      ...new Set(
        (props ?? []).map((p) => p.org_id).filter((o) => operatorOrgs.has(o))
      ),
    ];

    const resolved = resolveRole(memberships, operatorOrgsWithProperties);
    if (!resolved) return null;
    return {
      userId: user.id,
      email: user.email,
      orgId: resolved.orgId,
      role: resolved.role,
    };
  }
);

/**
 * Resolve the acting user's primary membership + role server-side (for page-
 * level branching and route guards). Uses the same {@link resolveRole} priority
 * as the client Shell. Returns null when signed out or membership-less.
 * Identity comes from the verified token claims; for reads only — server
 * actions that write use {@link getVerifiedMembership}.
 */
export function getCurrentMembership(): Promise<CurrentMembership | null> {
  return loadMembership(false);
}

/** {@link getCurrentMembership}, with the user re-checked against the auth
 *  server (`getUser()`). Use in server actions that write. */
export function getVerifiedMembership(): Promise<CurrentMembership | null> {
  return loadMembership(true);
}

/** Redirect to `/` unless the acting user resolves to `operator`. */
export async function requireOperator(): Promise<CurrentMembership> {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role !== "operator") redirect("/");
  return membership;
}
