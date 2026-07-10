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
import { fileURLToPath } from "node:url";
import { seedWorkspace } from "./seed-lib.mjs";

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
const CLEANER = { email: "demo-cleaner@tracktub.test", password: DEMO_PASSWORD, name: "Maria R. (demo cleaner)" };

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

  const { count } = await hc.from("property").select("id", { count: "exact", head: true }).eq("org_id", orgId);
  if ((count ?? 0) > 0 && !FORCE) {
    console.log("Demo data already present — skipping (use --force to re-seed a fresh DB).");
    return;
  }

  const cc = await authed(CLEANER);
  await seedWorkspace({
    admin,
    operatorClient: hc,
    orgId,
    operatorId: host.id,
    cleanerId: cleaner.id,
    cleanerClient: cc,
    propertyCount: 3,
    includeMaintenance: false,
  });

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

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error("seed-demo failed:", e.message ?? e);
    process.exit(1);
  });
}
