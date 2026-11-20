import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/lib/supabase/types";
import { createDraft } from "@/lib/visit-data";
import { signPhotoUrls } from "@/lib/supabase/storage";

// Issue #44 against a real Supabase (CI `rls` job, `npm run test:rls`): the
// `photos` bucket is private, so the only way to a photo is a signed link, and
// only for someone who can see that visit. Self-skips without the env.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ready = Boolean(url && anon && service);
if (!ready) console.warn("⚠ Private-photos suite SKIPPED — no Supabase env.");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
// Smallest thing that is recognisably a JPEG; storage doesn't decode it.
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0xff, 0xd9]);

describe.skipIf(!ready)("private photos bucket", () => {
  let admin!: SupabaseClient<Database>;
  let member!: SupabaseClient<Database>;
  let userId = "";
  const orgs: string[] = [];
  let mine = ""; // photo in the member's org
  let theirs = ""; // photo in another org

  async function seedPhoto(orgName: string, withMember: boolean) {
    const { data: org, error } = await admin
      .from("org")
      .insert({ name: orgName })
      .select("id")
      .single();
    if (error || !org) throw error ?? new Error("org insert failed");
    orgs.push(org.id);
    if (withMember) {
      const { error: mErr } = await admin
        .from("membership")
        .insert({ user_id: userId, org_id: org.id, role: "operator" });
      if (mErr) throw mErr;
    }
    const { data: tub, error: tErr } = await admin
      .from("property")
      .insert({ org_id: org.id, name: `${orgName} tub` })
      .select("id")
      .single();
    if (tErr || !tub) throw tErr ?? new Error("property insert failed");
    const visit = await createDraft(admin, tub.id, userId);
    const path = `${org.id}/${visit}/before/full_frame-${randomUUID()}.jpg`;
    const { error: uErr } = await admin.storage
      .from("photos")
      .upload(path, JPEG, { contentType: "image/jpeg" });
    if (uErr) throw uErr;
    return path;
  }

  beforeAll(async () => {
    admin = createClient<Database>(url!, service!, opts);
    await admin.from("org").delete().like("name", "Private Photos Org%");
    const email = `photos-${randomUUID()}@tracktub.test`;
    const password = `pw-${randomUUID()}`;
    const { data: u, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !u.user) throw error ?? new Error("createUser failed");
    userId = u.user.id;
    mine = await seedPhoto("Private Photos Org A", true);
    theirs = await seedPhoto("Private Photos Org B", false);
    member = createClient<Database>(url!, anon!, opts);
    const { error: sErr } = await member.auth.signInWithPassword({
      email,
      password,
    });
    if (sErr) throw sErr;
  }, 60_000);

  afterAll(async () => {
    for (const id of orgs) await admin.from("org").delete().eq("id", id);
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("the bucket is private", async () => {
    const { data } = await admin.storage.getBucket("photos");
    expect(data?.public).toBe(false);
  });

  it("the old public URL no longer serves a photo", async () => {
    const res = await fetch(`${url}/storage/v1/object/public/photos/${mine}`);
    expect(res.ok).toBe(false);
    expect([400, 403, 404]).toContain(res.status);
  });

  it("anon can't sign or list photos", async () => {
    const anonDb = createClient<Database>(url!, anon!, opts);
    const signed = await anonDb.storage
      .from("photos")
      .createSignedUrls([mine], 60);
    expect(signed.data?.[0]?.signedUrl ?? null).toBeNull();
    const listed = await anonDb.storage
      .from("photos")
      .list(mine.split("/").slice(0, 2).join("/"));
    expect(listed.data ?? []).toHaveLength(0);
  });

  it("a member signs their own team's photo and it opens", async () => {
    const urls = await signPhotoUrls(member, [mine]);
    const link = urls.get(mine);
    expect(link).toBeTruthy();
    const res = await fetch(link!);
    expect(res.status).toBe(200);
    expect((await res.arrayBuffer()).byteLength).toBe(JPEG.length);
  });

  it("a member can't sign another team's photo, even in a batch", async () => {
    const urls = await signPhotoUrls(member, [mine, theirs]);
    expect(urls.get(mine)).toBeTruthy();
    expect(urls.get(theirs)).toBeNull();
  });

  it("the service role signs a shared photo (public report path)", async () => {
    const urls = await signPhotoUrls(admin, [theirs]);
    const link = urls.get(theirs);
    expect(link).toBeTruthy();
    expect((await fetch(link!)).status).toBe(200);
  });
});
