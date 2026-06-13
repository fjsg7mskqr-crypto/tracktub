// Seed a populated demo workspace into the LOCAL Supabase stack.
//
// Creates a demo host (operator) + cleaner (staff), an org, properties, and
// several completed (submitted_locked) turnovers with real sample photos,
// an urgent flag, an open issue, and shared proof links — so the app opens
// into a fully walkable cockpit.
//
// Run via `tt-demo` (which exports the local stack's creds first). Refuses to
// run against anything that isn't a local Supabase URL.
//
// Env: SUPABASE_URL, SERVICE_ROLE_KEY, ANON_KEY (from `supabase status -o env`).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FORCE = process.argv.includes("--force");

if (!URL || !SERVICE || !ANON) {
  console.error("Missing SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY. Run via tt-demo.");
  process.exit(1);
}
// Safety: never seed a remote/prod project.
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error(`Refusing to seed a non-local URL: ${URL}`);
  process.exit(1);
}

const HOST = { email: "demo-host@tracktub.test", password: "demo-pass-1234", name: "Ethan (demo host)" };
const CLEANER = { email: "demo-cleaner@tracktub.test", password: "demo-pass-1234", name: "Maria R. (demo cleaner)" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, "..", "public", "landing");
const SLOT_IMG = { wide: "full-frame.jpg", waterline: "water-level.jpg", panel: "control-panel.jpg", cover: "water-chemistry.jpg" };

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

async function ensureUser({ email, password, name }) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = data?.users?.find((u) => u.email === email);
  if (existing) return existing;
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  return created.user;
}

async function authed({ email, password }) {
  const c = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return c;
}

async function makeTurnover(client, { propertyId, orgId, actorId, notes, urgent = false, issue = null, share = false }) {
  const shareToken = crypto.randomUUID();
  const { data: t, error } = await client
    .from("turnover")
    .insert({ property_id: propertyId, urgent, notes, status: "draft", share_token: shareToken })
    .select("id")
    .single();
  if (error) throw new Error(`turnover insert: ${error.message}`);

  for (const [slot, file] of Object.entries(SLOT_IMG)) {
    const buf = readFileSync(join(IMG_DIR, file));
    const path = `${orgId}/${t.id}/${slot}`;
    const { error: upErr } = await client.storage
      .from("photos")
      .upload(path, buf, { contentType: "image/jpeg", upsert: false });
    if (upErr) throw new Error(`upload ${slot}: ${upErr.message}`);
    const { error: pErr } = await client
      .from("photo")
      .insert({ turnover_id: t.id, storage_path: path, slot, captured_at: new Date().toISOString(), confirmed_tags: [] });
    if (pErr) throw new Error(`photo row ${slot}: ${pErr.message}`);
  }

  if (issue) {
    const { error: iErr } = await client.from("issue_tag").insert({
      turnover_id: t.id,
      tag: issue,
      source: "human",
      confirmed_at: new Date().toISOString(),
    });
    if (iErr) throw new Error(`issue_tag: ${iErr.message}`);
  }

  const { error: lockErr } = await client.from("turnover").update({ status: "submitted_locked" }).eq("id", t.id);
  if (lockErr) throw new Error(`lock: ${lockErr.message}`);

  if (share) {
    const { error: evErr } = await client
      .from("proof_event")
      .insert({ turnover_id: t.id, kind: "share_copied", actor_user_id: actorId });
    if (evErr) throw new Error(`proof_event: ${evErr.message}`);
  }
  return t.id;
}

async function main() {
  const host = await ensureUser(HOST);
  const cleaner = await ensureUser(CLEANER);

  const hc = await authed(HOST);
  const { data: mem, error: memErr } = await hc
    .from("membership")
    .select("org_id")
    .eq("user_id", host.id)
    .eq("role", "operator")
    .single();
  if (memErr || !mem) throw new Error(`host org lookup: ${memErr?.message ?? "no operator membership"}`);
  const orgId = mem.org_id;

  await hc.from("org").update({ name: "Cascade Stays" }).eq("id", orgId);

  const { count } = await hc.from("property").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if ((count ?? 0) > 0 && !FORCE) {
    console.log("Demo data already present — skipping (use --force to re-seed a fresh DB).");
    return;
  }

  const { data: props, error: propErr } = await hc
    .from("property")
    .insert([
      { org_id: orgId, name: "Ridgeline A-Frame", address: "Big Bear, CA", tub_notes: "6-person Jacuzzi, saltwater." },
      { org_id: orgId, name: "Lakeview Cabin 4", address: "Big Bear Lake, CA", tub_notes: "Bromine, cover replaced 2026-05." },
      { org_id: orgId, name: "Pine Chalet", address: "Big Bear City, CA", tub_notes: "Chlorine, high turnover weekends." },
    ])
    .select("id, name");
  if (propErr || !props) throw new Error(`property insert: ${propErr?.message}`);
  const byName = Object.fromEntries(props.map((p) => [p.name, p.id]));

  // Cleaner joins the host's org as staff, scoped to one property.
  const { error: cmErr } = await admin
    .from("membership")
    .insert({ user_id: cleaner.id, org_id: orgId, role: "staff" });
  if (cmErr && cmErr.code !== "23505") throw new Error(`cleaner membership: ${cmErr.message}`);
  const { error: saErr } = await admin
    .from("staff_assignment")
    .insert({ property_id: byName["Ridgeline A-Frame"], staff_user_id: cleaner.id });
  if (saErr && saErr.code !== "23505") throw new Error(`staff_assignment: ${saErr.message}`);

  // Host-captured turnovers.
  await makeTurnover(hc, { propertyId: byName["Ridgeline A-Frame"], orgId, actorId: host.id, notes: "Filters rinsed, water clear, cover latched. Guest-ready.", share: true });
  await makeTurnover(hc, { propertyId: byName["Lakeview Cabin 4"], orgId, actorId: host.id, urgent: true, issue: "water_cloudy", notes: "Cloudy after a big group — shocked the tub, will recheck before check-in." });
  await makeTurnover(hc, { propertyId: byName["Pine Chalet"], orgId, actorId: host.id, notes: "Routine turnover, chemistry in range.", share: true });

  // A cleaner-captured turnover on their assigned property (shows scoped staff capture + activity).
  const cc = await authed(CLEANER);
  await makeTurnover(cc, { propertyId: byName["Ridgeline A-Frame"], orgId, actorId: cleaner.id, notes: "Quick turn between guests — looks good." });

  console.log("Seeded demo workspace 'Cascade Stays':");
  console.log(`  host:    ${HOST.email}  /  ${HOST.password}`);
  console.log(`  cleaner: ${CLEANER.email}  /  ${CLEANER.password}`);
  console.log("  3 properties, 4 completed turnovers (1 urgent + issue, 2 shared).");
}

main().catch((e) => {
  console.error("seed-demo failed:", e.message ?? e);
  process.exit(1);
});
