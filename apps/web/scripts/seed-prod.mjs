// One-time prod demo seed for tracktub.com (issue #169).
//
// Populates the founder's existing operator org with a realistic "Cascade Stays"
// workspace for marketing content + prospect demos. DATA only — no schema changes.
//
// Requires explicit safety flags so it can never run by accident:
//   --prod-i-mean-it          required
//   CONFIRM_PROD=yes          env var required
//
// Env (founder provides at run time — never commit):
//   SUPABASE_URL              prod project URL (slkxwpiiludisrnwnxlg)
//   SERVICE_ROLE_KEY          prod service-role key
//   ANON_KEY                  prod anon key (for RPC calls if needed)
//   FOUNDER_EMAIL             optional; defaults to ethan@nhs-llc.com
//   STAFF_DEMO_PASSWORD       optional; random if unset (staff login not needed)
//
// Usage:
//   SUPABASE_URL=... SERVICE_ROLE_KEY=... ANON_KEY=... CONFIRM_PROD=yes \
//     node scripts/seed-prod.mjs --prod-i-mean-it
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { seedWorkspace } from "./seed-lib.mjs";

const PROD_FLAG = process.argv.includes("--prod-i-mean-it");
const FORCE = process.argv.includes("--force");
const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const FOUNDER_EMAIL = (process.env.FOUNDER_EMAIL || "ethan@nhs-llc.com").trim().toLowerCase();
const STAFF = {
  email: "maria-cleaner@tracktub.live",
  password: process.env.STAFF_DEMO_PASSWORD || `seed-${randomBytes(16).toString("hex")}`,
  name: "Maria R. (demo cleaner)",
};

if (!PROD_FLAG) {
  console.error("Refusing to run without --prod-i-mean-it.");
  console.error("For local dev, use tt-demo / scripts/seed-demo.mjs instead.");
  process.exit(1);
}
if (process.env.CONFIRM_PROD !== "yes") {
  console.error("Set CONFIRM_PROD=yes to confirm you intend to write demo data to prod.");
  process.exit(1);
}
if (!URL || !SERVICE || !ANON) {
  console.error("Missing SUPABASE_URL / SERVICE_ROLE_KEY / ANON_KEY.");
  process.exit(1);
}
if (/127\.0\.0\.1|localhost/.test(URL)) {
  console.error(`Refusing prod seed against a local URL: ${URL}`);
  console.error("Use scripts/seed-demo.mjs for the local stack.");
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

async function findUserByEmail(email) {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listUsers: ${error.message}`);
  const user = data?.users?.find((u) => u.email?.toLowerCase() === email);
  if (!user) throw new Error(`No auth user found for ${email}. Sign in to prod once first.`);
  return user;
}

async function ensureStaffUser() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = data?.users?.find((u) => u.email === STAFF.email);
  if (existing) return existing;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: STAFF.email,
    password: STAFF.password,
    email_confirm: true,
    user_metadata: { full_name: STAFF.name },
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
  console.log("");
  console.log("⚠  PROD DEMO SEED — writing demo data to:");
  console.log(`   ${URL}`);
  console.log(`   founder: ${FOUNDER_EMAIL}`);
  console.log("");

  const founder = await findUserByEmail(FOUNDER_EMAIL);

  const { data: mem, error: memErr } = await admin
    .from("membership")
    .select("org_id, role")
    .eq("user_id", founder.id)
    .in("role", ["operator", "owner"])
    .order("role")
    .limit(1)
    .maybeSingle();
  if (memErr || !mem) {
    throw new Error(`founder org lookup: ${memErr?.message ?? "no operator/owner membership"}`);
  }
  const orgId = mem.org_id;

  const { data: org, error: orgErr } = await admin.from("org").select("id, name").eq("id", orgId).single();
  if (orgErr || !org) throw new Error(`org lookup: ${orgErr?.message ?? "not found"}`);
  console.log(`   org:     ${org.name} (${org.id})`);
  console.log("");

  const { count } = await admin
    .from("property")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  if ((count ?? 0) > 0 && !FORCE) {
    console.log("Properties already present in the founder org — skipping.");
    console.log("Re-run with --force only if you intend to ADD another batch (not idempotent).");
    return;
  }

  const staff = await ensureStaffUser();
  const staffClient = await authed(STAFF);

  await seedWorkspace({
    admin,
    operatorClient: admin,
    orgId,
    operatorId: founder.id,
    cleanerId: staff.id,
    cleanerClient: staffClient,
    propertyCount: 4,
    includeMaintenance: true,
  });

  console.log("");
  console.log("✓ Seeded prod demo workspace 'Cascade Stays' into the founder org.");
  console.log(`  operator: ${FOUNDER_EMAIL} (your Google login — unchanged)`);
  console.log(`  staff:    ${STAFF.email} (demo team member — login not required)`);
  console.log("  4 properties; chemistry story + maintenance due/overdue + schedule calendar populated.");
  console.log("  Verify at https://tracktub.com — dashboard, /chemistry, /operations/*, Team, proof links.");
  console.log("");
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e) => {
    console.error("seed-prod failed:", e.message ?? e);
    process.exit(1);
  });
}
