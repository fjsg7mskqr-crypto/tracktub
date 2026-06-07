import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/supabase/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

// This is the M1 security gate. It needs the service-role key to provision and
// tear down test data, so it skips cleanly when that key is absent (e.g. CI
// without secrets) — run it locally (and wire CI secrets later) to enforce it.
const ready = Boolean(url && anon && service);

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
    // Orgs cascade to memberships/properties/staff_assignment; deleting the auth
    // user cascades to its profile. Best-effort — never let cleanup mask results.
    for (const id of createdOrgIds) await admin.from("org").delete().eq("id", id);
    for (const id of createdUserIds) await admin.auth.admin.deleteUser(id);
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

  it("staff sees only assigned properties, not other org-A properties", async () => {
    const { data, error } = await staffA.client.from("property").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((p) => p.id);
    expect(ids).toContain(propAssigned);
    expect(ids).not.toContain(propUnassigned);
    expect(ids).not.toContain(propB);
  });

  it("operator A cannot read org B's property even when filtering by its id", async () => {
    const { data, error } = await operatorA.client
      .from("property")
      .select("id")
      .eq("id", propB);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);
  });
});
