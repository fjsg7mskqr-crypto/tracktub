import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/supabase/types";
import {
  createDraft,
  findOpenDraft,
  loadVisitSnapshot,
} from "@/lib/visit-data";

// Visit data layer against a real Supabase (run by the CI `rls` job via
// `npm run test:rls`). Self-skips without the service-role env, like
// tests/rls.test.ts.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ready = Boolean(url && anon && service);
if (!ready) console.warn("⚠ Visit integration suite SKIPPED — no Supabase env.");

describe.skipIf(!ready)("visit data", () => {
  let admin!: SupabaseClient<Database>;
  let db!: SupabaseClient<Database>;
  let userId = "";
  let orgId = "";
  const password = `pw-${randomUUID()}`;

  async function newTub(name: string): Promise<string> {
    const { data, error } = await admin
      .from("property")
      .insert({ org_id: orgId, name })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("property insert failed");
    return data.id;
  }

  beforeAll(async () => {
    admin = createClient<Database>(url!, service!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin.from("org").delete().like("name", "Visit Test Org%");

    const email = `visit-${randomUUID()}@tracktub.test`;
    const { data: u, error: uErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (uErr || !u.user) throw uErr ?? new Error("createUser failed");
    userId = u.user.id;

    const { data: org, error: oErr } = await admin
      .from("org")
      .insert({ name: "Visit Test Org" })
      .select("id")
      .single();
    if (oErr || !org) throw oErr ?? new Error("org insert failed");
    orgId = org.id;
    const { error: mErr } = await admin
      .from("membership")
      .insert({ user_id: userId, org_id: orgId, role: "operator" });
    if (mErr) throw mErr;

    db = createClient<Database>(url!, anon!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: sErr } = await db.auth.signInWithPassword({ email, password });
    if (sErr) throw sErr;
  }, 30_000);

  afterAll(async () => {
    if (orgId) await admin.from("org").delete().eq("id", orgId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("startVisit is idempotent per tub", async () => {
    const tub = await newTub("Idempotent");
    const first =
      (await findOpenDraft(db, tub, userId)) ??
      (await createDraft(db, tub, userId));
    const second =
      (await findOpenDraft(db, tub, userId)) ??
      (await createDraft(db, tub, userId));
    expect(second).toBe(first);
    const { data } = await admin
      .from("turnover")
      .select("id")
      .eq("property_id", tub)
      .eq("status", "draft");
    expect(data).toHaveLength(1);
  });

  it("fresh draft snapshot is empty", async () => {
    const tub = await newTub("Fresh");
    const id = await createDraft(db, tub, userId);
    const s = await loadVisitSnapshot(db, id);
    expect(s).toMatchObject({
      visitId: id,
      propertyId: tub,
      propertyName: "Fresh",
      status: "draft",
      photos: [],
      found: null,
      foundAt: null,
      left: null,
      leftAt: null,
      work: [],
      added: [],
      notes: "",
      flag: null,
      previous: null,
    });
    expect(Number.isNaN(Date.parse(s.openedAt))).toBe(false);
  });

  it("previous is the last locked visit", async () => {
    const tub = await newTub("With history");
    const { data: old, error } = await admin
      .from("turnover")
      .insert({
        property_id: tub,
        submitter_id: userId,
        status: "draft",
        created_at: new Date(Date.now() - 7 * 864e5).toISOString(),
      })
      .select("id")
      .single();
    if (error || !old) throw error ?? new Error("seed failed");
    await admin
      .from("water_reading")
      .insert({ turnover_id: old.id, property_id: tub, ph: 8.0 });
    await admin
      .from("turnover")
      .update({ status: "submitted_locked" })
      .eq("id", old.id);

    const id = await createDraft(db, tub, userId);
    const s = await loadVisitSnapshot(db, id);
    expect(s.previous?.visitId).toBe(old.id);
    expect(s.previous?.found).toEqual({
      total_alkalinity: null,
      ph: 8,
      calcium_hardness: null,
      sanitizer_ppm: null,
    });
  });

  it("an unknown visit id throws Visit not found", async () => {
    await expect(loadVisitSnapshot(db, randomUUID())).rejects.toThrow(
      "Visit not found"
    );
  });
});
