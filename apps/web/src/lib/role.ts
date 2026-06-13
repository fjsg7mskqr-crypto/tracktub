export type MemberRole = "operator" | "staff" | "owner";

export interface MembershipRow {
  org_id: string;
  role: MemberRole;
}

export interface ResolvedMembership {
  orgId: string;
  role: MemberRole;
}

/**
 * Pure role-resolution shared by the server (getCurrentMembership) and the
 * client Shell, so both agree without making the root layout read cookies
 * (which would force every route — including the static /landing — dynamic).
 *
 * Every user gets an auto-provisioned operator workspace on signup, so an
 * invited cleaner/viewer holds an `operator` membership in their own empty org
 * AND a `staff`/`owner` membership in the host's org. Priority:
 *   1. operator of an org that has properties        → operator (active host)
 *   2. a `staff` membership                          → staff (cleaner)
 *   3. an `owner` membership                         → owner (viewer)
 *   4. operator of their own (still empty) workspace → operator (new host)
 *
 * `operatorOrgsWithProperties` is the subset of the user's operator org ids
 * that own at least one property (the caller supplies it from a scoped query).
 */
export function resolveRole(
  memberships: MembershipRow[],
  operatorOrgsWithProperties: string[]
): ResolvedMembership | null {
  if (memberships.length === 0) return null;

  const operatorOrgs = memberships
    .filter((m) => m.role === "operator")
    .map((m) => m.org_id);

  const activeOrg = operatorOrgs.find((o) =>
    operatorOrgsWithProperties.includes(o)
  );
  if (activeOrg) return { orgId: activeOrg, role: "operator" };

  const staff = memberships.find((m) => m.role === "staff");
  if (staff) return { orgId: staff.org_id, role: "staff" };
  const owner = memberships.find((m) => m.role === "owner");
  if (owner) return { orgId: owner.org_id, role: "owner" };

  if (operatorOrgs.length > 0) {
    return { orgId: operatorOrgs[0], role: "operator" };
  }
  return { orgId: memberships[0].org_id, role: memberships[0].role };
}
