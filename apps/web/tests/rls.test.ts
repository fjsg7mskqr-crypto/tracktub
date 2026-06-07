import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

// This is the M1 security gate. It needs the service-role key to provision and
// tear down test data, so it skips cleanly when that key is absent (e.g. CI
// without secrets). The skip is made LOUD here (and CI annotates it) so a
// perpetually-skipped gate can't masquerade as a passing one.
const ready = Boolean(url && anon && service);
if (!ready) {
  console.warn(
    "⚠ RLS isolation suite SKIPPED — Supabase env not configured; the security gate is NOT enforced in this run.",
  );
}

describe.skipIf(!ready)("RLS isolation", () => {
  const admin = createClient<Database>(url!, service!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // One password for all ephemeral test users; emails are unique per run.
  const password = `pw-${randomUUID()}`;
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];

  type AuthedUser = { id: string; client: SupabaseClient<Database> };

  // Create a confirmed user and return a Supabase client authenticated AS them,
  // so its requests carry that user's JWT and RLS sees auth.uid() = their id.
  async function makeUser(label: string): Promise<AuthedUser> {
    const email = `rls-${label}-${randomUUID()}@tracktub.test`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw error ?? new Error("createUser returned no user");
    createdUserIds.push(data.user.id);

    const client = createClient<Database>(url!, anon!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    return { id: data.user.id, client };
  }

  let operatorA: AuthedUser;
  let staffA: AuthedUser;
  let orgA: string;
  let orgB: string;
  let propAssigned: string;
  let propUnassigned: string;
  let propB: string;

  beforeAll(async () => {
    // Recover from any data leaked by a previously-interrupted run (shared project).
    await admin.from("org").delete().like("name", "RLS Test Org%");
    const { data: stale } = await admin.auth.admin.listUsers();
    for (const u of stale?.users ?? []) {
      if (u.email?.startsWith("rls-") && u.email.endsWith("@tracktub.test")) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }

    operatorA = await makeUser("op-a");
    staffA = await makeUser("staff-a");

    const { data: oA, error: eA } = await admin
      .from("org")
      .insert({ name: "RLS Test Org A" })
      .select("id")
      .single();
    const { data: oB, error: eB } = await admin
      .from("org")
      .insert({ name: "RLS Test Org B" })
      .select("id")
      .single();
    if (eA || eB || !oA || !oB) throw eA ?? eB ?? new Error("org insert failed");
    orgA = oA.id;
    orgB = oB.id;
    createdOrgIds.push(orgA, orgB);

    const { error: mErr } = await admin.from("membership").insert([
      { user_id: operatorA.id, org_id: orgA, role: "operator" },
      { user_id: staffA.id, org_id: orgA, role: "staff" },
    ]);
    if (mErr) throw mErr;

    const ins = async (org_id: string, name: string) => {
      const { data, error } = await admin
        .from("property")
        .insert({ org_id, name })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("property insert failed");
      return data.id;
    };
    propAssigned = await ins(orgA, "Assigned");
    propUnassigned = await ins(orgA, "Unassigned");
    propB = await ins(orgB, "Other Org");

    const { error: saErr } = await admin
      .from("staff_assignment")
      .insert({ property_id: propAssigned, staff_user_id: staffA.id });
    if (saErr) throw saErr;
  }, 30_000);

  afterAll(async () => {
    // Orgs cascade to memberships/properties/turnovers/photos/issue_tags; deleting
    // the auth user cascades to its profile. Defensive: never let one failure
    // abort the rest, and surface any cleanup errors instead of leaking silently.
    const errors: string[] = [];
    for (const id of createdOrgIds) {
      const { error } = await admin.from("org").delete().eq("id", id);
      if (error) errors.push(`org ${id}: ${error.message}`);
    }
    for (const id of createdUserIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) errors.push(`user ${id}: ${error.message}`);
    }
    if (errors.length) console.warn("RLS test cleanup issues:", errors.join("; "));
  });

  it("operator sees every property in their org and none from another org", async () => {
    const { data, error } = await operatorA.client
      .from("property")
      .select("id, org_id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((p) => p.id);
    expect(ids).toContain(propAssigned);
    expect(ids).toContain(propUnassigned);
    expect(ids).not.toContain(propB);
    expect((data ?? []).every((p) => p.org_id === orgA)).toBe(true);
  });

  it("staff sees ONLY assigned properties, not other org-A properties", async () => {
    const { data, error } = await staffA.client.from("property").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((p) => p.id);
    // Anchor the negative assertions to a non-empty, correctly-scoped result:
    // exactly one visible property, and it is the assigned one.
    expect(ids).toHaveLength(1);
    expect(ids).toContain(propAssigned);
    expect(ids).not.toContain(propUnassigned);
    expect(ids).not.toContain(propB);
  });

  it("cross-org filter: operator A reads their own property but not org B's", async () => {
    // Positive control — proves the client can see SOMETHING (not a blind/empty
    // or no-JWT client), so the empty org-B result below is due to RLS.
    const { data: mine } = await operatorA.client
      .from("property")
      .select("id")
      .eq("id", propAssigned);
    expect((mine ?? []).map((p) => p.id)).toEqual([propAssigned]);

    const { data: theirs, error } = await operatorA.client
      .from("property")
      .select("id")
      .eq("id", propB);
    expect(error).toBeNull();
    expect(theirs ?? []).toHaveLength(0);
  });

  it("turnover children are immutable once the turnover is locked", async () => {
    // Draft turnover on an assigned property, submitted by operator A.
    const { data: to, error: toErr } = await admin
      .from("turnover")
      .insert({ property_id: propAssigned, submitter_id: operatorA.id, status: "draft" })
      .select("id")
      .single();
    if (toErr || !to) throw toErr ?? new Error("turnover insert failed");

    // While draft, the operator may add an issue tag (positive control).
    const { data: tag, error: tagErr } = await operatorA.client
      .from("issue_tag")
      .insert({ turnover_id: to.id, tag: "scale", source: "human" })
      .select("id")
      .single();
    expect(tagErr).toBeNull();
    expect(tag).not.toBeNull();

    // Lock it (draft -> submitted_locked is the one allowed transition).
    const { error: lockErr } = await admin
      .from("turnover")
      .update({ status: "submitted_locked" })
      .eq("id", to.id);
    expect(lockErr).toBeNull();

    // Now the operator must NOT be able to add new evidence to the locked turnover.
    const { error: lockedTagErr } = await operatorA.client
      .from("issue_tag")
      .insert({ turnover_id: to.id, tag: "tampered", source: "human" });
    expect(lockedTagErr).not.toBeNull();

    const { error: lockedPhotoErr } = await operatorA.client
      .from("photo")
      .insert({ turnover_id: to.id, slot: "wide" });
    expect(lockedPhotoErr).not.toBeNull();

    // ...nor delete an existing tag (USING denies -> 0 rows; the tag survives).
    await operatorA.client.from("issue_tag").delete().eq("id", tag!.id);
    const { count } = await admin
      .from("issue_tag")
      .select("id", { count: "exact", head: true })
      .eq("id", tag!.id);
    expect(count).toBe(1);
  }, 30_000);
});
