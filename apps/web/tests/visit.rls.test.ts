import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/supabase/types";
import {
  createDraft,
  findOpenDraft,
  finishVisit,
  loadVisitSnapshot,
  logReading,
  saveAdded,
  saveNotes,
  savePhoto,
  saveWork,
} from "@/lib/visit-data";
import { isPartial, type ReadingValues } from "@/lib/visit";

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
  const jpeg = () =>
    new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
  const blank: ReadingValues = {
    total_alkalinity: null,
    ph: null,
    calcium_hardness: null,
    sanitizer_ppm: null,
  };

  it("reload restores every entry type", async () => {
    const tub = await newTub("Reload");
    const id = await createDraft(db, tub, userId);
    const reload = () => loadVisitSnapshot(db, id);

    await savePhoto(db, id, "before", jpeg(), "2026-10-27T09:43:00.000Z");
    let s = await reload();
    expect(s.photos.map((p) => [p.kind, p.capturedAt])).toEqual([
      ["before", "2026-10-27T09:43:00.000Z"],
    ]);

    const found = { ...blank, ph: 8, sanitizer_ppm: 0.5 };
    await logReading(db, id, "found", found);
    s = await reload();
    expect(s.found).toEqual(found);
    expect(s.foundAt).not.toBeNull();
    expect(s.left).toBeNull();

    await saveWork(db, id, ["wiped", "filter_replaced"]);
    s = await reload();
    expect(s.work).toEqual(["wiped", "filter_replaced"]);

    await saveAdded(db, id, [{ product: "pH down", amount: "2 oz" }]);
    s = await reload();
    expect(s.added).toEqual([{ product: "pH down", amount: "2 oz" }]);
    expect(s.found).toEqual(found);

    await saveNotes(db, id, "Jets weak");
    s = await reload();
    expect(s.notes).toBe("Jets weak");

    const left = { total_alkalinity: 100, ph: 7.5, calcium_hardness: 190, sanitizer_ppm: 2 };
    await logReading(db, id, "left", left);
    s = await reload();
    expect(s.left).toEqual(left);
    expect(s.leftAt).not.toBeNull();
    expect(s.found).toEqual(found);

    await savePhoto(db, id, "after", jpeg(), "2026-10-27T10:50:00.000Z");
    await savePhoto(db, id, "cover", jpeg(), "2026-10-27T10:52:00.000Z");
    s = await reload();
    expect(s.photos.map((p) => p.kind).sort()).toEqual(["after", "before", "cover"]);
    expect(s.work).toEqual(["wiped", "filter_replaced"]);
    expect(s.added).toEqual([{ product: "pH down", amount: "2 oz" }]);
    expect(s.notes).toBe("Jets weak");
    expect(isPartial(s)).toBe(false);
  });

  it("logReading stores null for unset rows", async () => {
    const tub = await newTub("Nulls");
    const id = await createDraft(db, tub, userId);
    await logReading(db, id, "found", { ...blank, total_alkalinity: 90 });
    await logReading(db, id, "left", { ...blank, ph: 7.5 });
    const { data } = await admin
      .from("water_reading")
      .select("*")
      .eq("turnover_id", id)
      .single();
    expect(data).toMatchObject({
      total_alkalinity: 90,
      ph: null,
      calcium_hardness: null,
      sanitizer_ppm: null,
      left_total_alkalinity: null,
      left_ph: 7.5,
      left_calcium_hardness: null,
      left_sanitizer_ppm: null,
    });
    expect(data?.left_recorded_at).not.toBeNull();
  });

  it("retaking a photo keeps one row per kind", async () => {
    const tub = await newTub("Retake");
    const id = await createDraft(db, tub, userId);
    await savePhoto(db, id, "cover", jpeg(), "2026-10-27T10:00:00.000Z");
    await savePhoto(db, id, "cover", jpeg(), "2026-10-27T10:05:00.000Z");
    const { data } = await admin.from("photo").select("captured_at").eq("turnover_id", id);
    expect(data).toHaveLength(1);
    expect(Date.parse(data![0].captured_at!)).toBe(Date.parse("2026-10-27T10:05:00.000Z"));
  });

  it("finish locks an empty visit as partial", async () => {
    const tub = await newTub("Empty finish");
    const id = await createDraft(db, tub, userId);
    await finishVisit(db, id);
    const s = await loadVisitSnapshot(db, id);
    expect(s.status).toBe("submitted_locked");
    expect(isPartial(s)).toBe(true);
    await expect(saveNotes(db, id, "late")).rejects.toThrow("Visit is locked");
  });
});
