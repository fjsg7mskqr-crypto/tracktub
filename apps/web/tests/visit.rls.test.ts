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
  saveFlag,
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
if (!ready)
  console.warn("⚠ Visit integration suite SKIPPED — no Supabase env.");

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
    const { error: sErr } = await db.auth.signInWithPassword({
      email,
      password,
    });
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
    new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], {
      type: "image/jpeg",
    });
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

    await saveFlag(db, id, "Cover strap torn");
    s = await reload();
    expect(s.flag).toBe("Cover strap torn");

    const left = {
      total_alkalinity: 100,
      ph: 7.5,
      calcium_hardness: 190,
      sanitizer_ppm: 2,
    };
    await logReading(db, id, "left", left);
    s = await reload();
    expect(s.left).toEqual(left);
    expect(s.leftAt).not.toBeNull();
    expect(s.found).toEqual(found);

    await savePhoto(db, id, "after", jpeg(), "2026-10-27T10:50:00.000Z");
    await savePhoto(db, id, "cover", jpeg(), "2026-10-27T10:52:00.000Z");
    s = await reload();
    expect(s.photos.map((p) => p.kind).sort()).toEqual([
      "after",
      "before",
      "cover",
    ]);
    expect(s.work).toEqual(["wiped", "filter_replaced"]);
    expect(s.added).toEqual([{ product: "pH down", amount: "2 oz" }]);
    expect(s.notes).toBe("Jets weak");
    expect(s.flag).toBe("Cover strap torn");
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
    const { data } = await admin
      .from("photo")
      .select("captured_at")
      .eq("turnover_id", id);
    expect(data).toHaveLength(1);
    expect(Date.parse(data![0].captured_at!)).toBe(
      Date.parse("2026-10-27T10:05:00.000Z")
    );
  });

  it("clearing the flag clears urgent", async () => {
    const tub = await newTub("Flag");
    const id = await createDraft(db, tub, userId);
    await saveFlag(db, id, "Leak by pump");
    let { data } = await admin
      .from("turnover")
      .select("urgent, owner_flag")
      .eq("id", id)
      .single();
    expect(data).toEqual({ urgent: true, owner_flag: "Leak by pump" });
    await saveFlag(db, id, "  ");
    ({ data } = await admin
      .from("turnover")
      .select("urgent, owner_flag")
      .eq("id", id)
      .single());
    expect(data).toEqual({ urgent: false, owner_flag: null });
  });

  it("finish sets a share token on a draft that has none", async () => {
    const tub = await newTub("No token");
    const { data: t } = await admin
      .from("turnover")
      .insert({ property_id: tub, submitter_id: userId, status: "draft" })
      .select("id, share_token")
      .single();
    expect(t?.share_token).toBeNull();
    await finishVisit(db, t!.id);
    const { data } = await admin
      .from("turnover")
      .select("status, share_token")
      .eq("id", t!.id)
      .single();
    expect(data?.status).toBe("submitted_locked");
    expect(data?.share_token).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("a retake deletes the old photo file", async () => {
    const tub = await newTub("Retake");
    const id = await createDraft(db, tub, userId);
    await savePhoto(db, id, "before", jpeg(), "2026-11-08T09:00:00.000Z");
    await savePhoto(db, id, "before", jpeg(), "2026-11-08T09:05:00.000Z");
    const { data: files } = await admin.storage
      .from("photos")
      .list(`${orgId}/${id}/before`);
    const { data: rows } = await admin
      .from("photo")
      .select("storage_path")
      .eq("turnover_id", id);
    expect(files).toHaveLength(1);
    expect(rows?.map((r) => r.storage_path)).toEqual([
      `${orgId}/${id}/before/${files![0].name}`,
    ]);
  });

  it("photo files are limited to people with access to the tub", async () => {
    const tub = await newTub("Storage scope");
    const id = await createDraft(db, tub, userId);
    await savePhoto(db, id, "before", jpeg(), "2026-11-08T09:00:00.000Z");
    const { data: row } = await admin
      .from("photo")
      .select("storage_path")
      .eq("turnover_id", id)
      .single();
    const path = row!.storage_path!;
    const folder = `${orgId}/${id}/before`;

    const email = `outsider-${randomUUID()}@tracktub.test`;
    const { data: u } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    const { data: otherOrg } = await admin
      .from("org")
      .insert({ name: "Visit Test Org (outsider)" })
      .select("id")
      .single();
    await admin
      .from("membership")
      .insert({ user_id: u!.user!.id, org_id: otherOrg!.id, role: "operator" });
    const outsider = createClient<Database>(url!, anon!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await outsider.auth.signInWithPassword({ email, password });
    const nobody = createClient<Database>(url!, anon!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      for (const client of [outsider, nobody]) {
        const up = await client.storage
          .from("photos")
          .upload(`${folder}/planted.jpg`, jpeg());
        expect(up.error).not.toBeNull();
        const { data: listed } = await client.storage
          .from("photos")
          .list(folder);
        expect(listed ?? []).toHaveLength(0);
        const { data: removed } = await client.storage
          .from("photos")
          .remove([path]);
        expect(removed ?? []).toHaveLength(0);
      }
      // Its own org's folder is fine, but only under a real visit.
      const stray = await outsider.storage
        .from("photos")
        .upload(`${otherOrg!.id}/${randomUUID()}/x.jpg`, jpeg());
      expect(stray.error).not.toBeNull();

      // The owner can list it, but once the visit is finished nobody
      // signed in can delete or replace its evidence.
      const { data: own } = await db.storage.from("photos").list(folder);
      expect(own).toHaveLength(1);
      await finishVisit(db, id);
      const { data: removed } = await db.storage.from("photos").remove([path]);
      expect(removed ?? []).toHaveLength(0);
      const late = await db.storage
        .from("photos")
        .upload(`${folder}/late.jpg`, jpeg());
      expect(late.error).not.toBeNull();
      const { data: still } = await admin.storage.from("photos").list(folder);
      expect(still).toHaveLength(1);
    } finally {
      await admin.from("org").delete().eq("id", otherOrg!.id);
      await admin.auth.admin.deleteUser(u!.user!.id);
    }
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
  describe("server times (#389)", () => {
    const LONG_AGO = "2020-01-01T00:00:00.000Z";
    const recent = (iso: string | null | undefined) =>
      Math.abs(Date.now() - Date.parse(iso ?? "")) < 60_000;

    it("a client cannot set photo.received_at", async () => {
      const tub = await newTub("Received forge");
      const id = await createDraft(db, tub, userId);
      const { data: row, error } = await db
        .from("photo")
        .insert({
          turnover_id: id,
          slot: "cover",
          phase: "after",
          storage_path: `${orgId}/${id}/after/forged.jpg`,
          received_at: LONG_AGO,
        })
        .select("id")
        .single();
      if (error || !row) throw error ?? new Error("photo insert failed");
      const read = async () =>
        (
          await admin
            .from("photo")
            .select("received_at")
            .eq("id", row.id)
            .single()
        ).data?.received_at;
      const stamped = await read();
      expect(recent(stamped)).toBe(true);

      const { error: uErr } = await db
        .from("photo")
        .update({ received_at: LONG_AGO })
        .eq("id", row.id);
      expect(uErr).toBeNull();
      expect(await read()).toBe(stamped);
    });

    it("a retake restamps photo.received_at", async () => {
      const tub = await newTub("Received retake");
      const id = await createDraft(db, tub, userId);
      const read = async () =>
        (
          await admin
            .from("photo")
            .select("received_at, created_at")
            .eq("turnover_id", id)
            .single()
        ).data!;
      await savePhoto(db, id, "cover", jpeg(), "2026-10-27T10:00:00.000Z");
      const first = await read();
      await new Promise((r) => setTimeout(r, 50));
      await savePhoto(db, id, "cover", jpeg(), "2026-10-27T10:05:00.000Z");
      const second = await read();
      expect(Date.parse(second.received_at)).toBeGreaterThan(
        Date.parse(first.received_at)
      );
      expect(second.created_at).toBe(first.created_at);
    });

    it("locking stamps turnover.locked_at; a client cannot set it", async () => {
      const tub = await newTub("Locked at");
      const id = await createDraft(db, tub, userId);
      const read = async () =>
        (await admin.from("turnover").select("locked_at").eq("id", id).single())
          .data?.locked_at;

      const { error } = await db
        .from("turnover")
        .update({ locked_at: LONG_AGO })
        .eq("id", id);
      expect(error).toBeNull();
      expect(await read()).toBeNull();

      await finishVisit(db, id);
      expect(recent(await read())).toBe(true);

      const { data: forged, error: fErr } = await db
        .from("turnover")
        .insert({
          property_id: tub,
          submitter_id: userId,
          status: "submitted_locked",
          locked_at: LONG_AGO,
        })
        .select("locked_at")
        .single();
      if (!fErr) expect(recent(forged?.locked_at)).toBe(true);
    });
  });
});
