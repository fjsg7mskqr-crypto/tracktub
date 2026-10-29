import type { createClient } from "@/lib/supabase/server";
import type { PendingInvite, Person } from "@/lib/people";

type Db = Awaited<ReturnType<typeof createClient>>;

export type PeopleData = {
  people: Person[];
  invites: PendingInvite[];
  properties: { id: string; name: string }[];
};

/**
 * Everyone with a login on the org (D29: the admin plus staff logins; owners
 * have no login and aren't listed), their property access, and — for the
 * admin — invite links not yet used. Admin first, then by name.
 */
export async function loadPeople(
  supabase: Db,
  orgId: string,
  isAdmin: boolean,
  now: Date = new Date()
): Promise<PeopleData> {
  const [members, properties] = await Promise.all([
    supabase
      .from("membership")
      .select("user_id, role, all_properties")
      .eq("org_id", orgId),
    supabase
      .from("property")
      .select("id, name")
      .eq("org_id", orgId)
      .order("name"),
  ]);
  if (members.error)
    throw new Error(`Failed to load people: ${members.error.message}`);
  if (properties.error)
    throw new Error(`Failed to load properties: ${properties.error.message}`);

  const logins = (members.data ?? []).filter((m) => m.role !== "owner");
  const userIds = logins.map((m) => m.user_id);
  const propIds = (properties.data ?? []).map((p) => p.id);

  const [profiles, assignments, invites] = await Promise.all([
    supabase.from("profile").select("id, full_name, email").in("id", userIds),
    propIds.length
      ? supabase
          .from("staff_assignment")
          .select("property_id, staff_user_id")
          .in("property_id", propIds)
      : Promise.resolve({ data: [], error: null }),
    isAdmin
      ? supabase
          .from("invite")
          .select(
            "id, email, token, all_properties, property_ids, accepted_at, expires_at"
          )
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profiles.error)
    throw new Error(`Failed to load people: ${profiles.error.message}`);

  const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const people: Person[] = logins.map((m) => {
    const pr = byId.get(m.user_id);
    const email = pr?.email ?? "";
    return {
      userId: m.user_id,
      name: pr?.full_name?.trim() || email || "Someone",
      email,
      isAdmin: m.role === "operator",
      allProperties: m.role === "operator" || m.all_properties,
      propertyIds: (assignments.data ?? [])
        .filter((a) => a.staff_user_id === m.user_id)
        .map((a) => a.property_id),
    };
  });
  people.sort(
    (a, b) =>
      Number(b.isAdmin) - Number(a.isAdmin) || a.name.localeCompare(b.name)
  );

  const pending: PendingInvite[] = (invites.data ?? [])
    .filter(
      (i) => i.accepted_at === null && Date.parse(i.expires_at) > now.getTime()
    )
    .map((i) => ({
      id: i.id,
      email: i.email,
      token: i.token,
      allProperties: i.all_properties,
      propertyIds: i.property_ids,
    }));

  return { people, invites: pending, properties: properties.data ?? [] };
}
