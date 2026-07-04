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

// The demo password is supplied by tt-demo via env (generated, gitignored) so
// no credential is ever committed to the repo.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error("Missing DEMO_PASSWORD. Run via tt-demo (it generates one).");
  process.exit(1);
}
const HOST = { email: "demo-host@tracktub.test", password: DEMO_PASSWORD, name: "Ethan (demo host)" };
const CLEANER = { email: "demo-cleaner@tracktub.test", password: DEMO_PASSWORD, name: "Maria R. (demo cleaner)" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, "..", "public", "landing");
const SLOT_IMG = { wide: "full-frame.jpg", waterline: "water-level.jpg", panel: "control-panel.jpg", cover: "water-chemistry.jpg" };
// The single "as found" BEFORE shot (slot 'wide', phase 'before'), stored under a
// distinct `/before` path so it never collides with the after wide — mirrors the
// real capture flow in src/lib/actions/turnover.ts.
const BEFORE_IMG = "full-frame.jpg";

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

async function makeTurnover(client, { propertyId, orgId, actorId, notes, urgent = false, issue = null, share = false, opens = 0, notify = false, water = null }) {
  const shareToken = crypto.randomUUID();
  const { data: t, error } = await client
    .from("turnover")
    .insert({ property_id: propertyId, urgent, notes, status: "draft", share_token: shareToken })
    .select("id")
    .single();
  if (error) throw new Error(`turnover insert: ${error.message}`);

  // BEFORE — the single "as found" shot (slot 'wide', phase 'before') under a
  // distinct `/before` path so it never collides with the after wide.
  const beforeBuf = readFileSync(join(IMG_DIR, BEFORE_IMG));
  const beforePath = `${orgId}/${t.id}/before`;
  const { error: bUpErr } = await client.storage
    .from("photos")
    .upload(beforePath, beforeBuf, { contentType: "image/jpeg", upsert: false });
  if (bUpErr) throw new Error(`upload before: ${bUpErr.message}`);
  const { error: bErr } = await client
    .from("photo")
    .insert({ turnover_id: t.id, storage_path: beforePath, slot: "wide", phase: "before", captured_at: new Date().toISOString(), confirmed_tags: [] });
  if (bErr) throw new Error(`photo row before: ${bErr.message}`);

  // AFTER — the guided guest-ready set (4 slots, phase 'after').
  for (const [slot, file] of Object.entries(SLOT_IMG)) {
    const buf = readFileSync(join(IMG_DIR, file));
    const path = `${orgId}/${t.id}/${slot}`;
    const { error: upErr } = await client.storage
      .from("photos")
      .upload(path, buf, { contentType: "image/jpeg", upsert: false });
    if (upErr) throw new Error(`upload ${slot}: ${upErr.message}`);
    const { error: pErr } = await client
      .from("photo")
      .insert({ turnover_id: t.id, storage_path: path, slot, phase: "after", captured_at: new Date().toISOString(), confirmed_tags: [] });
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

  // Live water reading via the capturer client (RLS path: status still draft).
  // recorded_at defaults to now().
  if (water) {
    const { error: wrErr } = await client.from("water_reading").insert({
      turnover_id: t.id,
      property_id: propertyId,
      total_alkalinity: water.total_alkalinity ?? null,
      ph: water.ph ?? null,
      calcium_hardness: water.calcium_hardness ?? null,
      sanitizer_ppm: water.sanitizer_ppm ?? null,
    });
    if (wrErr) throw new Error(`water_reading: ${wrErr.message}`);
  }

  const { error: lockErr } = await client.from("turnover").update({ status: "submitted_locked" }).eq("id", t.id);
  if (lockErr) throw new Error(`lock: ${lockErr.message}`);

  if (share) {
    const { error: evErr } = await client
      .from("proof_event")
      .insert({ turnover_id: t.id, kind: "share_copied", actor_user_id: actorId });
    if (evErr) throw new Error(`proof_event: ${evErr.message}`);
  }
  // Recipient opens — recorded server-side via the share-token-gated RPC, just
  // like the public proof page does on render. Drives the Insights "opens" tile.
  for (let i = 0; i < opens; i++) {
    const { error: opErr } = await client.rpc("record_proof_open", { p_share_token: shareToken });
    if (opErr) throw new Error(`record_proof_open: ${opErr.message}`);
  }
  // Host "ready" fan-out — mirrors the submit action: notifies the property's
  // operators/owners (excluding the submitter) that the tub is guest-ready.
  if (notify) {
    const { error: nErr } = await client.rpc("notify_turnover_ready", { p_turnover_id: t.id });
    if (nErr) throw new Error(`notify_turnover_ready: ${nErr.message}`);
  }
  return t.id;
}

// Backdated, already-locked turnover for trend history. Inserted via the
// service-role admin client so we can set submitted_at_server explicitly
// (the BEFORE-INSERT server-fields trigger only overrides for JWT callers) and
// bypass the draft-only child-table RLS. Never UPDATE a locked turnover — the
// lock guard trigger raises on that — so we insert it locked in one shot.
async function histTurnover({ propertyId, submitterId, at, water = null, urgent = false, issue = null, notes = null }) {
  const { data: t, error } = await admin
    .from("turnover")
    .insert({
      property_id: propertyId,
      submitter_id: submitterId,
      submitted_at_server: at,
      status: "submitted_locked",
      urgent,
      notes,
    })
    .select("id")
    .single();
  if (error) throw new Error(`hist turnover insert: ${error.message}`);

  if (water) {
    const { error: wErr } = await admin.from("water_reading").insert({
      turnover_id: t.id,
      property_id: propertyId,
      total_alkalinity: water.total_alkalinity ?? null,
      ph: water.ph ?? null,
      calcium_hardness: water.calcium_hardness ?? null,
      sanitizer_ppm: water.sanitizer_ppm ?? null,
      recorded_at: at,
    });
    if (wErr) throw new Error(`hist water_reading: ${wErr.message}`);
  }
  if (issue) {
    const { error: iErr } = await admin.from("issue_tag").insert({
      turnover_id: t.id,
      tag: issue,
      source: "human",
      confirmed_at: at,
    });
    if (iErr) throw new Error(`hist issue_tag: ${iErr.message}`);
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

  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;
  const tNow = Date.now();
  const ago = (ms) => new Date(tNow - ms).toISOString();

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

  // ── Equipment per property (issue #224) — populates the Operations →
  // Equipment tab so it opens as a real registry, never an empty shell. One
  // heater (Ridgeline) is intentionally out-of-warranty to show the warn flag.
  const equipment = [
    // Ridgeline A-Frame
    { name: "Ridgeline A-Frame", type: "pump", make_model: "Balboa BP6013G1", installed_at: "2023-04-12", warranty_until: "2028-04-12" },
    { name: "Ridgeline A-Frame", type: "heater", make_model: "Balboa M7 Titanium", installed_at: "2021-10-05", warranty_until: "2025-11-01", notes: "Out of warranty — watch for element failure." },
    { name: "Ridgeline A-Frame", type: "cover", make_model: "Covana Legend", installed_at: "2024-06-20", warranty_until: "2029-06-20" },
    { name: "Ridgeline A-Frame", type: "filter", make_model: "Pleatco PWW50", installed_at: "2026-03-01" },
    // Lakeview Cabin 4
    { name: "Lakeview Cabin 4", type: "pump", make_model: "Waterway Executive 56", installed_at: "2022-08-15", warranty_until: "2027-08-15" },
    { name: "Lakeview Cabin 4", type: "heater", make_model: "Balboa M7", installed_at: "2022-08-15", warranty_until: "2027-08-15" },
    { name: "Lakeview Cabin 4", type: "cover", make_model: "ThermoFloat vinyl", installed_at: "2026-05-10", warranty_until: "2028-05-10", notes: "Replaced May 2026." },
    { name: "Lakeview Cabin 4", type: "filter", make_model: "Pleatco PWW50", installed_at: "2026-06-01" },
    // Pine Chalet
    { name: "Pine Chalet", type: "pump", make_model: "Gecko Aqua-Flo XP2", installed_at: "2023-01-20", warranty_until: "2028-01-20" },
    { name: "Pine Chalet", type: "heater", make_model: "Gecko In.YE-5", installed_at: "2023-01-20", warranty_until: "2028-01-20" },
    { name: "Pine Chalet", type: "cover", make_model: "Marquis hard cover", installed_at: "2025-02-14", warranty_until: "2030-02-14" },
    { name: "Pine Chalet", type: "filter", make_model: "Unicel C-4326", installed_at: "2026-06-10" },
  ].map(({ name, ...rest }) => ({ org_id: orgId, property_id: byName[name], ...rest }));
  const { error: eqErr } = await hc.from("equipment").insert(equipment);
  if (eqErr) throw new Error(`equipment insert: ${eqErr.message}`);

  // Org-wide shared note (vendor contacts / account numbers).
  const { error: noteErr } = await hc.from("org_note").upsert({
    org_id: orgId,
    body: "Pool supply account #CS-4471 (Big Bear Spa & Pool, 909-555-0142).\nCover vendor: Covana West — warranty claims 800-555-0199.\nAfter-hours heater tech: Dwayne, 909-555-0177.",
    updated_at: new Date().toISOString(),
  });
  if (noteErr) throw new Error(`org_note upsert: ${noteErr.message}`);

  // ── Supplies per property (issue #152) — populates the Operations →
  // Supplies tab as a real inventory. Each property has at least one item at or
  // below its reorder threshold so the "Low" flag + low-stock count show on
  // first load (never an empty tab). `last_restocked_at` is relative to today.
  const restocked = (days) => ago(days * DAY).slice(0, 10);
  const supplies = [
    // Ridgeline A-Frame — one low (chlorine at threshold).
    { name: "Ridgeline A-Frame", nm: "Chlorine granules", unit: "lb", quantity: 1, reorder_at: 1, last_restocked_at: restocked(24), notes: "Big Bear Spa & Pool acct #CS-4471." },
    { name: "Ridgeline A-Frame", nm: "pH Down", unit: "lb", quantity: 4, reorder_at: 1, last_restocked_at: restocked(24) },
    { name: "Ridgeline A-Frame", nm: "Filter cartridge", unit: "cartridge", quantity: 2, reorder_at: 1, last_restocked_at: restocked(60) },
    { name: "Ridgeline A-Frame", nm: "Test strips", unit: "strips", quantity: 50, reorder_at: 25, last_restocked_at: restocked(12) },
    // Lakeview Cabin 4 — two low (shock + cartridge out).
    { name: "Lakeview Cabin 4", nm: "Shock / oxidizer", unit: "lb", quantity: 0.5, reorder_at: 2, last_restocked_at: restocked(30), notes: "Burned through after a big group." },
    { name: "Lakeview Cabin 4", nm: "Filter cartridge", unit: "cartridge", quantity: 0, reorder_at: 1, last_restocked_at: restocked(45) },
    { name: "Lakeview Cabin 4", nm: "Bromine tablets", unit: "tabs", quantity: 30, reorder_at: 10, last_restocked_at: restocked(8) },
    { name: "Lakeview Cabin 4", nm: "Clarifier", unit: "bottle", quantity: 2, reorder_at: 1, last_restocked_at: restocked(20) },
    // Pine Chalet — all stocked (contrast; no low flag).
    { name: "Pine Chalet", nm: "Chlorine granules", unit: "lb", quantity: 5, reorder_at: 1, last_restocked_at: restocked(5) },
    { name: "Pine Chalet", nm: "pH Up", unit: "lb", quantity: 3, reorder_at: 1, last_restocked_at: restocked(5) },
    { name: "Pine Chalet", nm: "Cover cleaner", unit: "bottle", quantity: 2, reorder_at: 1, last_restocked_at: restocked(40) },
    { name: "Pine Chalet", nm: "Test strips", unit: "strips", quantity: 75, reorder_at: 25, last_restocked_at: restocked(15) },
  ].map(({ name, nm, ...rest }) => ({
    org_id: orgId,
    property_id: byName[name],
    name: nm,
    ...rest,
  }));
  const { error: supErr } = await hc.from("supply").insert(supplies);
  if (supErr) throw new Error(`supply insert: ${supErr.message}`);

  // ── Live turnovers (RLS capturer path) — these are each property's latest ──
  // Ridgeline: healthy contrast tub. Shared + opened a few times (Insights).
  await makeTurnover(hc, {
    propertyId: byName["Ridgeline A-Frame"], orgId, actorId: host.id, share: true, opens: 3,
    notes: "Filters rinsed, water clear, cover latched. Guest-ready.",
    water: { total_alkalinity: 100, ph: 7.4, calcium_hardness: 200, sanitizer_ppm: 4 },
  });
  // Lakeview: back-to-back stays, sanitizer crashed → shock due + low sanitizer.
  await makeTurnover(hc, {
    propertyId: byName["Lakeview Cabin 4"], orgId, actorId: host.id, urgent: true, issue: "water_cloudy",
    notes: "Cloudy after a big group — shocked the tub, will recheck before check-in.",
    water: { total_alkalinity: 130, ph: 7.9, calcium_hardness: 210, sanitizer_ppm: 2 },
  });
  // Pine Chalet: a single low-sanitizer dip (not back-to-back). Shared + opened.
  await makeTurnover(hc, {
    propertyId: byName["Pine Chalet"], orgId, actorId: host.id, share: true, opens: 2,
    notes: "Routine turnover — sanitizer reading came back low, re-dosing.",
    water: { total_alkalinity: 90, ph: 7.3, calcium_hardness: 180, sanitizer_ppm: 2 },
  });

  // A cleaner-captured turnover on their assigned property (scoped staff capture).
  // `notify: true` fires the ready fan-out as the cleaner → the host (operator)
  // gets the unread `turnover_ready` banner on first load.
  const cc = await authed(CLEANER);
  await makeTurnover(cc, {
    propertyId: byName["Ridgeline A-Frame"], orgId, actorId: cleaner.id, notify: true,
    notes: "Quick turn between guests — looks good.",
    water: { total_alkalinity: 105, ph: 7.5, calcium_hardness: 190, sanitizer_ppm: 4 },
  });

  // ── Historical readings (admin path, backdated) → real multi-point trends ──
  // Ridgeline: steady, in range.
  await histTurnover({ propertyId: byName["Ridgeline A-Frame"], submitterId: host.id, at: ago(21 * DAY), water: { total_alkalinity: 100, ph: 7.4, calcium_hardness: 200, sanitizer_ppm: 4 } });
  await histTurnover({ propertyId: byName["Ridgeline A-Frame"], submitterId: host.id, at: ago(14 * DAY), water: { total_alkalinity: 110, ph: 7.5, calcium_hardness: 200, sanitizer_ppm: 3.5 } });
  await histTurnover({ propertyId: byName["Ridgeline A-Frame"], submitterId: host.id, at: ago(7 * DAY), water: { total_alkalinity: 95, ph: 7.3, calcium_hardness: 185, sanitizer_ppm: 4.5 } });

  // Lakeview: sanitizer trending down; a 2nd turnover inside 48h drives bather-load.
  await histTurnover({ propertyId: byName["Lakeview Cabin 4"], submitterId: host.id, at: ago(10 * DAY), water: { total_alkalinity: 115, ph: 7.6, calcium_hardness: 220, sanitizer_ppm: 5 } });
  await histTurnover({ propertyId: byName["Lakeview Cabin 4"], submitterId: host.id, at: ago(4 * DAY), water: { total_alkalinity: 120, ph: 7.7, calcium_hardness: 230, sanitizer_ppm: 4 } });
  await histTurnover({ propertyId: byName["Lakeview Cabin 4"], submitterId: host.id, at: ago(18 * HOUR), urgent: true, water: { total_alkalinity: 125, ph: 7.8, calcium_hardness: 240, sanitizer_ppm: 3 } });

  // Pine Chalet: healthy history before today's dip.
  await histTurnover({ propertyId: byName["Pine Chalet"], submitterId: host.id, at: ago(16 * DAY), water: { total_alkalinity: 108, ph: 7.5, calcium_hardness: 205, sanitizer_ppm: 4 } });
  await histTurnover({ propertyId: byName["Pine Chalet"], submitterId: host.id, at: ago(9 * DAY), water: { total_alkalinity: 100, ph: 7.4, calcium_hardness: 195, sanitizer_ppm: 3.5 } });

  console.log("Seeded demo workspace 'Cascade Stays':");
  console.log(`  host:    ${HOST.email}  /  ${HOST.password}`);
  console.log(`  cleaner: ${CLEANER.email}  /  ${CLEANER.password}`);
  console.log("  3 properties; chemistry: Lakeview = shock due + low sanitizer,");
  console.log("  Pine Chalet = low sanitizer dip, Ridgeline = healthy (multi-point trends).");
  console.log("  before/after photo sets, shared proof links + recipient opens,");
  console.log("  equipment per property (Ridgeline heater out-of-warranty) + a shared note,");
  console.log("  supplies per property (Ridgeline 1 low, Lakeview 2 low, Pine all stocked),");
  console.log("  and an unread 'turnover ready' notification waiting for the host.");
}

main().catch((e) => {
  console.error("seed-demo failed:", e.message ?? e);
  process.exit(1);
});
