// Seed a populated demo workspace into the LOCAL Supabase stack.
//
// Creates one demo host (operator), an org, properties, and
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
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BEFORE_IMG, IMG_DIR, seedWorkspace } from "./seed-lib.mjs";

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FORCE = process.argv.includes("--force");

if (!URL || !SERVICE || !ANON) {
  console.error("Missing SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY. Run via tt-demo.");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(URL)) {
  console.error(`Refusing to seed a non-local URL: ${URL}`);
  console.error("For production, use scripts/seed-prod.mjs with --prod-i-mean-it.");
  process.exit(1);
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error("Missing DEMO_PASSWORD. Run via tt-demo (it generates one).");
  process.exit(1);
}
const HOST = { email: "demo-host@tracktub.test", password: DEMO_PASSWORD, name: "Ethan (demo host)" };

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

async function main() {
  const host = await ensureUser(HOST);

  const hc = await authed(HOST);
  const { data: mem, error: memErr } = await hc
    .from("membership")
    .select("org_id")
    .eq("user_id", host.id)
    .eq("role", "operator")
    .single();
  if (memErr || !mem) throw new Error(`host org lookup: ${memErr?.message ?? "no operator membership"}`);
  const orgId = mem.org_id;

  const { count } = await hc.from("property").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if ((count ?? 0) > 0 && !FORCE) {
    console.log("Demo data already present — skipping the workspace (use --force to re-seed a fresh DB).");
    await seedHomeBoard({ orgId, operatorId: host.id });
    return;
  }

  await seedWorkspace({
    admin,
    operatorClient: hc,
    orgId,
    operatorId: host.id,
    propertyCount: 3,
    includeMaintenance: false,
  });

  console.log("Seeded demo workspace 'Cascade Stays':");
  console.log(`  host: ${HOST.email}`);
  console.log("  Sign in with the 'Sign in to demo' button on /login.");
  console.log("  3 properties; chemistry: Lakeview = shock due + low sanitizer,");
  console.log("  Pine Chalet = low sanitizer dip, Ridgeline = healthy (multi-point trends).");
  console.log("  before/after photo sets, shared proof links + recipient opens,");
  console.log("  equipment per property (Ridgeline heater out-of-warranty) + a shared note,");
  console.log("  supplies per property (Ridgeline 1 low, Lakeview 2 low, Pine all stocked),");
  console.log("  and a schedule calendar (upcoming turnovers + custom tasks).");
  await seedHomeBoard({ orgId, operatorId: host.id });
}

// ── Home status board (2026-11-04) ───────────────────────────────────────────
// Idempotent: safe to run on every start. Gives the local demo every Home
// state — a tub with a problem, open items (incl. "Filters soaking"), a stop
// added to today by hand, a visit in progress, a visit done today, calm tubs,
// and drain / filter history so the care rings fill. Each piece is added only
// when missing, so re-runs never duplicate (a settled item stays settled).
const BOARD_MARK = "Demo care history (home board)";

async function seedHomeBoard({ orgId, operatorId }) {
  const TZ = process.env.TRACKTUB_TIME_ZONE ?? "America/Detroit";
  const dayOf = (d) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const today = dayOf(new Date());
  const DAY = 86_400_000;
  const ago = (days) => new Date(Date.now() - days * DAY).toISOString();
  const must = (what, { error }) => {
    if (error) throw new Error(`home board ${what}: ${error.message}`);
  };
  const reading = (r, at, left = null) => ({
    total_alkalinity: r[0],
    ph: r[1],
    calcium_hardness: r[2],
    sanitizer_ppm: r[3],
    found_recorded_at: at,
    recorded_at: at,
    ...(left
      ? {
          left_total_alkalinity: left[0],
          left_ph: left[1],
          left_calcium_hardness: left[2],
          left_sanitizer_ppm: left[3],
          left_recorded_at: at,
        }
      : {}),
  });

  // Two calm tubs alongside the seeded three.
  const { data: clients } = await admin.from("client").select("id, name").eq("org_id", orgId);
  const clientId = (name) => clients?.find((c) => c.name === name)?.id ?? clients?.[0]?.id ?? null;
  let { data: props } = await admin.from("property").select("id, name").eq("org_id", orgId);
  for (const t of [
    { name: "Summit View Lodge", address: "Moonridge, CA", client: "Pine & Ridge Stays" },
    { name: "Aspen Hollow", address: "Fawnskin, CA", client: "Lakeview Rentals" },
  ]) {
    if (props.some((p) => p.name === t.name)) continue;
    must(
      `tub ${t.name}`,
      await admin.from("property").insert({
        org_id: orgId,
        name: t.name,
        address: t.address,
        client_id: clientId(t.client),
        volume_gallons: 400,
      })
    );
  }
  ({ data: props } = await admin.from("property").select("id, name").eq("org_id", orgId));
  const tub = Object.fromEntries(props.map((p) => [p.name, p.id]));

  const locked = async (propertyId, at, { steps = [], water = null, notes = null } = {}) => {
    const { data, error } = await admin
      .from("turnover")
      .insert({
        property_id: propertyId,
        submitter_id: operatorId,
        submitted_at_server: at,
        created_at: at,
        status: "submitted_locked",
        share_token: crypto.randomUUID(),
        cleaning_steps: steps,
        notes,
      })
      .select("id")
      .single();
    if (error) throw new Error(`home board visit: ${error.message}`);
    if (water)
      must("reading", await admin.from("water_reading").insert({ turnover_id: data.id, property_id: propertyId, ...water }));
    return data.id;
  };

  // Drain / filter history (older than every seeded visit, so the last reading
  // is unchanged). Lakeview's drain is overdue (red ring), Aspen's is close
  // (amber), the rest are comfortable (blue).
  const ok = [100, 7.4, 200, 2];
  const care = {
    "Lakeview Cabin 4": [92, 40],
    "Pine Chalet": [30, 50],
    "Ridgeline A-Frame": [60, 20],
    "Summit View Lodge": [20, 20],
    "Aspen Hollow": [84, 30],
  };
  for (const [name, [drain, filter]] of Object.entries(care)) {
    if (!tub[name]) continue;
    const { count: has } = await admin
      .from("turnover")
      .select("id", { count: "exact", head: true })
      .eq("property_id", tub[name])
      .eq("notes", BOARD_MARK);
    if (has) continue;
    await locked(tub[name], ago(drain), { steps: ["drained_refilled"], water: reading(ok, ago(drain), ok), notes: BOARD_MARK });
    await locked(tub[name], ago(filter), { steps: ["filter_replaced", "filters_cleaned"], water: reading(ok, ago(filter), ok), notes: BOARD_MARK });
  }

  // Calm tubs: Aspen balanced three days ago; Summit visited today (a done
  // stop) and its report opened by the host.
  const lastVisit = async (id) =>
    (
      await admin
        .from("turnover")
        .select("id, submitted_at_server")
        .eq("property_id", id)
        .eq("status", "submitted_locked")
        .order("submitted_at_server", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data;
  const aspenLast = await lastVisit(tub["Aspen Hollow"]);
  if (!aspenLast || aspenLast.submitted_at_server < ago(10))
    await locked(tub["Aspen Hollow"], ago(3), { steps: ["filters_cleaned", "wiped"], water: reading([110, 7.5, 210, 2.5], ago(3), [110, 7.5, 210, 2.5]) });
  const summitLast = await lastVisit(tub["Summit View Lodge"]);
  if (!summitLast || dayOf(new Date(summitLast.submitted_at_server)) !== today) {
    const at = new Date(Date.now() - 2 * 3600_000).toISOString();
    const id = await locked(tub["Summit View Lodge"], at, {
      steps: ["filters_cleaned", "wiped", "cover_cleaned"],
      water: reading([105, 7.6, 190, 1.5], at, [100, 7.4, 190, 2.5]),
    });
    must("share", await admin.from("proof_event").insert({ turnover_id: id, kind: "share_copied", actor_user_id: operatorId }));
    must("open", await admin.from("share_view").insert({ turnover_id: id }));
  }

  // Open items, left at each tub's last visit.
  const items = [
    ["Lakeview Cabin 4", "filter_soak", "Filters soaking", "Swap back in"],
    ["Lakeview Cabin 4", "recheck", "Re-check Alkalinity", "Left at 130"],
    ["Pine Chalet", "part", "Part needed", "Jet cover cracked"],
  ];
  for (const [name, kind, title, note] of items) {
    if (!tub[name]) continue;
    const { count: has } = await admin
      .from("task")
      .select("id", { count: "exact", head: true })
      .eq("property_id", tub[name])
      .eq("title", title);
    if (has) continue;
    const last = await lastVisit(tub[name]);
    must(
      `item ${title}`,
      await admin.from("task").insert({
        property_id: tub[name],
        kind,
        title,
        note,
        status: "open",
        opened_visit_id: last?.id ?? null,
        created_by: operatorId,
        created_at: last?.submitted_at_server ?? ago(2),
      })
    );
  }

  // Ridgeline added to today's route by hand.
  if (tub["Ridgeline A-Frame"])
    must(
      "route stop",
      await admin
        .from("route_stop")
        .upsert(
          { org_id: orgId, property_id: tub["Ridgeline A-Frame"], day: today, created_by: operatorId },
          { onConflict: "property_id,day", ignoreDuplicates: true }
        )
    );

  // A visit in progress at Pine Chalet: before photo + reading as found.
  const pine = tub["Pine Chalet"];
  const { count: drafts } = await admin
    .from("turnover")
    .select("id", { count: "exact", head: true })
    .eq("property_id", pine)
    .eq("status", "draft");
  if (pine && !drafts) {
    const opened = new Date(Date.now() - 40 * 60_000).toISOString();
    const { data: d, error } = await admin
      .from("turnover")
      .insert({
        property_id: pine,
        submitter_id: operatorId,
        status: "draft",
        created_at: opened,
        share_token: crypto.randomUUID(),
        cleaning_steps: [],
      })
      .select("id")
      .single();
    if (error) throw new Error(`home board draft: ${error.message}`);
    const path = `${orgId}/${d.id}/before/full_frame-${crypto.randomUUID()}.jpg`;
    must(
      "draft photo upload",
      await admin.storage.from("photos").upload(path, readFileSync(join(IMG_DIR, BEFORE_IMG)), { contentType: "image/jpeg" })
    );
    must(
      "draft photo",
      await admin.from("photo").insert({
        turnover_id: d.id,
        storage_path: path,
        phase: "before",
        slot: "full_frame",
        captured_at: opened,
        confirmed_tags: [],
      })
    );
    must("draft reading", await admin.from("water_reading").insert({ turnover_id: d.id, property_id: pine, ...reading([95, 7.6, 180, 1.0], opened) }));
  }
  console.log("Home board demo: problem tub, open items, a stop added to today, a visit in progress, calm tubs.");
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error("seed-demo failed:", e.message ?? e);
    process.exit(1);
  });
}
