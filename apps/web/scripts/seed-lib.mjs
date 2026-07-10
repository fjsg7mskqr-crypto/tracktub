// Shared demo seed logic for local (seed-demo.mjs) and prod (seed-prod.mjs).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const IMG_DIR = join(__dirname, "..", "public", "landing");
export const SLOT_IMG = {
  wide: "full-frame.jpg",
  waterline: "water-level.jpg",
  panel: "control-panel.jpg",
  cover: "water-chemistry.jpg",
};
export const BEFORE_IMG = "full-frame.jpg";

export const PROPERTIES = [
  { name: "Ridgeline A-Frame", address: "Big Bear, CA", tub_notes: "6-person Jacuzzi, saltwater." },
  { name: "Lakeview Cabin 4", address: "Big Bear Lake, CA", tub_notes: "Bromine, cover replaced 2026-05." },
  { name: "Pine Chalet", address: "Big Bear City, CA", tub_notes: "Chlorine, high turnover weekends." },
  { name: "Summit View Lodge", address: "Moonridge, CA", tub_notes: "8-person spa, heavy winter use." },
];

export async function uploadTurnoverPhotos(client, { orgId, turnoverId }) {
  const beforeBuf = readFileSync(join(IMG_DIR, BEFORE_IMG));
  const beforePath = `${orgId}/${turnoverId}/before`;
  const { error: bUpErr } = await client.storage
    .from("photos")
    .upload(beforePath, beforeBuf, { contentType: "image/jpeg", upsert: false });
  if (bUpErr) throw new Error(`upload before: ${bUpErr.message}`);
  const { error: bErr } = await client
    .from("photo")
    .insert({
      turnover_id: turnoverId,
      storage_path: beforePath,
      slot: "wide",
      phase: "before",
      captured_at: new Date().toISOString(),
      confirmed_tags: [],
    });
  if (bErr) throw new Error(`photo row before: ${bErr.message}`);

  for (const [slot, file] of Object.entries(SLOT_IMG)) {
    const buf = readFileSync(join(IMG_DIR, file));
    const path = `${orgId}/${turnoverId}/${slot}`;
    const { error: upErr } = await client.storage
      .from("photos")
      .upload(path, buf, { contentType: "image/jpeg", upsert: false });
    if (upErr) throw new Error(`upload ${slot}: ${upErr.message}`);
    const { error: pErr } = await client
      .from("photo")
      .insert({
        turnover_id: turnoverId,
        storage_path: path,
        slot,
        phase: "after",
        captured_at: new Date().toISOString(),
        confirmed_tags: [],
      });
    if (pErr) throw new Error(`photo row ${slot}: ${pErr.message}`);
  }
}

function waterRow(propertyId, turnoverId, water, recordedAt = null) {
  return {
    turnover_id: turnoverId,
    property_id: propertyId,
    total_alkalinity: water.total_alkalinity ?? null,
    ph: water.ph ?? null,
    calcium_hardness: water.calcium_hardness ?? null,
    sanitizer_ppm: water.sanitizer_ppm ?? null,
    temp_f: water.temp_f ?? null,
    treatments: water.treatments ?? [],
    treatment_note: water.treatment_note ?? null,
    balanced: water.balanced ?? false,
    ...(recordedAt ? { recorded_at: recordedAt } : {}),
  };
}

export async function makeTurnover(
  client,
  {
    propertyId,
    orgId,
    actorId,
    notes,
    urgent = false,
    issue = null,
    share = false,
    opens = 0,
    notify = false,
    water = null,
  }
) {
  const shareToken = crypto.randomUUID();
  const { data: t, error } = await client
    .from("turnover")
    .insert({ property_id: propertyId, urgent, notes, status: "draft", share_token: shareToken })
    .select("id")
    .single();
  if (error) throw new Error(`turnover insert: ${error.message}`);

  await uploadTurnoverPhotos(client, { orgId, turnoverId: t.id });

  if (issue) {
    const { error: iErr } = await client.from("issue_tag").insert({
      turnover_id: t.id,
      tag: issue,
      source: "human",
      confirmed_at: new Date().toISOString(),
    });
    if (iErr) throw new Error(`issue_tag: ${iErr.message}`);
  }

  if (water) {
    const { error: wrErr } = await client.from("water_reading").insert(waterRow(propertyId, t.id, water));
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
  for (let i = 0; i < opens; i++) {
    const { error: opErr } = await client.rpc("record_proof_open", { p_share_token: shareToken });
    if (opErr) throw new Error(`record_proof_open: ${opErr.message}`);
  }
  if (notify) {
    const { error: nErr } = await client.rpc("notify_turnover_ready", { p_turnover_id: t.id });
    if (nErr) throw new Error(`notify_turnover_ready: ${nErr.message}`);
  }
  return t.id;
}

export async function histTurnover(
  admin,
  {
    propertyId,
    orgId,
    submitterId,
    at,
    water = null,
    urgent = false,
    issue = null,
    notes = null,
    photos = false,
  }
) {
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

  if (photos) {
    await uploadTurnoverPhotos(admin, { orgId, turnoverId: t.id });
  }

  if (water) {
    const { error: wErr } = await admin.from("water_reading").insert(waterRow(propertyId, t.id, water, at));
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

export async function seedWorkspace({
  admin,
  operatorClient,
  orgId,
  operatorId,
  cleanerId = null,
  cleanerClient = null,
  propertyCount = 3,
  includeMaintenance = false,
}) {
  const client = operatorClient;
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;
  const tNow = Date.now();
  const ago = (ms) => new Date(tNow - ms).toISOString();

  await client.from("org").update({ name: "Cascade Stays" }).eq("id", orgId);

  const propsToInsert = PROPERTIES.slice(0, propertyCount);
  const { data: props, error: propErr } = await client
    .from("property")
    .insert(propsToInsert.map((p) => ({ org_id: orgId, ...p })))
    .select("id, name");
  if (propErr || !props) throw new Error(`property insert: ${propErr?.message}`);
  const byName = Object.fromEntries(props.map((p) => [p.name, p.id]));

  if (cleanerId) {
    const { error: cmErr } = await admin
      .from("membership")
      .insert({ user_id: cleanerId, org_id: orgId, role: "staff" });
    if (cmErr && cmErr.code !== "23505") throw new Error(`cleaner membership: ${cmErr.message}`);
    const { error: saErr } = await admin
      .from("staff_assignment")
      .insert({ property_id: byName["Ridgeline A-Frame"], staff_user_id: cleanerId });
    if (saErr && saErr.code !== "23505") throw new Error(`staff_assignment: ${saErr.message}`);
  }

  const equipment = [
    { name: "Ridgeline A-Frame", type: "pump", make_model: "Balboa BP6013G1", installed_at: "2023-04-12", warranty_until: "2028-04-12" },
    { name: "Ridgeline A-Frame", type: "heater", make_model: "Balboa M7 Titanium", installed_at: "2021-10-05", warranty_until: "2025-11-01", notes: "Out of warranty — watch for element failure." },
    { name: "Ridgeline A-Frame", type: "cover", make_model: "Covana Legend", installed_at: "2024-06-20", warranty_until: "2029-06-20" },
    { name: "Ridgeline A-Frame", type: "filter", make_model: "Pleatco PWW50", installed_at: "2026-03-01" },
    { name: "Lakeview Cabin 4", type: "pump", make_model: "Waterway Executive 56", installed_at: "2022-08-15", warranty_until: "2027-08-15" },
    { name: "Lakeview Cabin 4", type: "heater", make_model: "Balboa M7", installed_at: "2022-08-15", warranty_until: "2027-08-15" },
    { name: "Lakeview Cabin 4", type: "cover", make_model: "ThermoFloat vinyl", installed_at: "2026-05-10", warranty_until: "2028-05-10", notes: "Replaced May 2026." },
    { name: "Lakeview Cabin 4", type: "filter", make_model: "Pleatco PWW50", installed_at: "2026-06-01" },
    { name: "Pine Chalet", type: "pump", make_model: "Gecko Aqua-Flo XP2", installed_at: "2023-01-20", warranty_until: "2028-01-20" },
    { name: "Pine Chalet", type: "heater", make_model: "Gecko In.YE-5", installed_at: "2023-01-20", warranty_until: "2028-01-20" },
    { name: "Pine Chalet", type: "cover", make_model: "Marquis hard cover", installed_at: "2025-02-14", warranty_until: "2030-02-14" },
    { name: "Pine Chalet", type: "filter", make_model: "Unicel C-4326", installed_at: "2026-06-10" },
  ]
    .filter(({ name }) => byName[name])
    .map(({ name, ...rest }) => ({ org_id: orgId, property_id: byName[name], ...rest }));
  const { error: eqErr } = await client.from("equipment").insert(equipment);
  if (eqErr) throw new Error(`equipment insert: ${eqErr.message}`);

  const { error: noteErr } = await client.from("org_note").upsert({
    org_id: orgId,
    body: "Pool supply account #CS-4471 (Big Bear Spa & Pool, 909-555-0142).\nCover vendor: Covana West — warranty claims 800-555-0199.\nAfter-hours heater tech: Dwayne, 909-555-0177.",
    updated_at: new Date().toISOString(),
  });
  if (noteErr) throw new Error(`org_note upsert: ${noteErr.message}`);

  const restocked = (days) => ago(days * DAY).slice(0, 10);
  const supplies = [
    { name: "Ridgeline A-Frame", nm: "Chlorine granules", unit: "lb", quantity: 1, reorder_at: 1, last_restocked_at: restocked(24), notes: "Big Bear Spa & Pool acct #CS-4471." },
    { name: "Ridgeline A-Frame", nm: "pH Down", unit: "lb", quantity: 4, reorder_at: 1, last_restocked_at: restocked(24) },
    { name: "Ridgeline A-Frame", nm: "Filter cartridge", unit: "cartridge", quantity: 2, reorder_at: 1, last_restocked_at: restocked(60) },
    { name: "Ridgeline A-Frame", nm: "Test strips", unit: "strips", quantity: 50, reorder_at: 25, last_restocked_at: restocked(12) },
    { name: "Lakeview Cabin 4", nm: "Shock / oxidizer", unit: "lb", quantity: 0.5, reorder_at: 2, last_restocked_at: restocked(30), notes: "Burned through after a big group." },
    { name: "Lakeview Cabin 4", nm: "Filter cartridge", unit: "cartridge", quantity: 0, reorder_at: 1, last_restocked_at: restocked(45) },
    { name: "Lakeview Cabin 4", nm: "Bromine tablets", unit: "tabs", quantity: 30, reorder_at: 10, last_restocked_at: restocked(8) },
    { name: "Lakeview Cabin 4", nm: "Clarifier", unit: "bottle", quantity: 2, reorder_at: 1, last_restocked_at: restocked(20) },
    { name: "Pine Chalet", nm: "Chlorine granules", unit: "lb", quantity: 5, reorder_at: 1, last_restocked_at: restocked(5) },
    { name: "Pine Chalet", nm: "pH Up", unit: "lb", quantity: 3, reorder_at: 1, last_restocked_at: restocked(5) },
    { name: "Pine Chalet", nm: "Cover cleaner", unit: "bottle", quantity: 2, reorder_at: 1, last_restocked_at: restocked(40) },
    { name: "Pine Chalet", nm: "Test strips", unit: "strips", quantity: 75, reorder_at: 25, last_restocked_at: restocked(15) },
  ]
    .filter(({ name }) => byName[name])
    .map(({ name, nm, ...rest }) => ({
      org_id: orgId,
      property_id: byName[name],
      name: nm,
      ...rest,
    }));
  const { error: supErr } = await client.from("supply").insert(supplies);
  if (supErr) throw new Error(`supply insert: ${supErr.message}`);

  const healthyWater = {
    total_alkalinity: 100,
    ph: 7.4,
    calcium_hardness: 200,
    sanitizer_ppm: 4,
    temp_f: 101,
    treatments: ["sanitizer"],
    balanced: true,
  };
  const lakeviewWater = {
    total_alkalinity: 130,
    ph: 7.9,
    calcium_hardness: 210,
    sanitizer_ppm: 2,
    temp_f: 104,
    treatments: ["shock", "clarifier"],
    treatment_note: "Non-chlorine shock + clarifier after a big group.",
    balanced: false,
  };
  const pineWater = {
    total_alkalinity: 90,
    ph: 7.3,
    calcium_hardness: 180,
    sanitizer_ppm: 2,
    temp_f: 100,
    treatments: ["sanitizer", "ph_up"],
    balanced: false,
  };

  await makeTurnover(client, {
    propertyId: byName["Ridgeline A-Frame"],
    orgId,
    actorId: operatorId,
    share: true,
    opens: 3,
    notes: "Filters rinsed, water clear, cover latched. Guest-ready.",
    water: healthyWater,
  });
  await makeTurnover(client, {
    propertyId: byName["Lakeview Cabin 4"],
    orgId,
    actorId: operatorId,
    urgent: true,
    issue: "water_cloudy",
    notes: "Cloudy after a big group — shocked the tub, will recheck before check-in.",
    water: lakeviewWater,
  });
  await makeTurnover(client, {
    propertyId: byName["Pine Chalet"],
    orgId,
    actorId: operatorId,
    share: true,
    opens: 2,
    notes: "Routine turnover — sanitizer reading came back low, re-dosing.",
    water: pineWater,
  });

  if (byName["Summit View Lodge"]) {
    await makeTurnover(client, {
      propertyId: byName["Summit View Lodge"],
      orgId,
      actorId: operatorId,
      share: true,
      opens: 1,
      notes: "Post-storm check — water balanced, cover secure.",
      water: {
        total_alkalinity: 105,
        ph: 7.5,
        calcium_hardness: 195,
        sanitizer_ppm: 3.5,
        temp_f: 102,
        treatments: ["sanitizer"],
        balanced: true,
      },
    });
  }

  if (cleanerClient && cleanerId) {
    await makeTurnover(cleanerClient, {
      propertyId: byName["Ridgeline A-Frame"],
      orgId,
      actorId: cleanerId,
      notify: true,
      notes: "Quick turn between guests — looks good.",
      water: {
        total_alkalinity: 105,
        ph: 7.5,
        calcium_hardness: 190,
        sanitizer_ppm: 4,
        temp_f: 100,
        treatments: ["sanitizer"],
        balanced: true,
      },
    });
  }

  await histTurnover(admin, {
    propertyId: byName["Ridgeline A-Frame"],
    orgId,
    submitterId: operatorId,
    at: ago(21 * DAY),
    photos: true,
    water: { total_alkalinity: 100, ph: 7.4, calcium_hardness: 200, sanitizer_ppm: 4, temp_f: 101, treatments: ["sanitizer"], balanced: true },
  });
  await histTurnover(admin, {
    propertyId: byName["Ridgeline A-Frame"],
    orgId,
    submitterId: operatorId,
    at: ago(14 * DAY),
    water: { total_alkalinity: 110, ph: 7.5, calcium_hardness: 200, sanitizer_ppm: 3.5, temp_f: 100, balanced: true },
  });
  await histTurnover(admin, {
    propertyId: byName["Ridgeline A-Frame"],
    orgId,
    submitterId: operatorId,
    at: ago(7 * DAY),
    water: { total_alkalinity: 95, ph: 7.3, calcium_hardness: 185, sanitizer_ppm: 4.5, temp_f: 102, balanced: true },
  });

  await histTurnover(admin, {
    propertyId: byName["Lakeview Cabin 4"],
    orgId,
    submitterId: operatorId,
    at: ago(10 * DAY),
    photos: true,
    water: { total_alkalinity: 115, ph: 7.6, calcium_hardness: 220, sanitizer_ppm: 5, temp_f: 102, balanced: true },
  });
  await histTurnover(admin, {
    propertyId: byName["Lakeview Cabin 4"],
    orgId,
    submitterId: operatorId,
    at: ago(4 * DAY),
    water: { total_alkalinity: 120, ph: 7.7, calcium_hardness: 230, sanitizer_ppm: 4, temp_f: 103, balanced: true },
  });
  await histTurnover(admin, {
    propertyId: byName["Lakeview Cabin 4"],
    orgId,
    submitterId: operatorId,
    at: ago(18 * HOUR),
    urgent: true,
    water: { total_alkalinity: 125, ph: 7.8, calcium_hardness: 240, sanitizer_ppm: 3, temp_f: 103, treatments: ["shock"], balanced: false },
  });

  await histTurnover(admin, {
    propertyId: byName["Pine Chalet"],
    orgId,
    submitterId: operatorId,
    at: ago(16 * DAY),
    photos: true,
    water: { total_alkalinity: 108, ph: 7.5, calcium_hardness: 205, sanitizer_ppm: 4, temp_f: 101, balanced: true },
  });
  await histTurnover(admin, {
    propertyId: byName["Pine Chalet"],
    orgId,
    submitterId: operatorId,
    at: ago(9 * DAY),
    water: { total_alkalinity: 100, ph: 7.4, calcium_hardness: 195, sanitizer_ppm: 3.5, temp_f: 100, balanced: true },
  });

  if (includeMaintenance) {
    const maintenanceDefs = [
      {
        name: "Lakeview Cabin 4",
        title: "Drain & refill",
        recurrence_kind: "time",
        recurrence_value: 90,
        recurrence_unit: "day",
        last_done_at: ago(100 * DAY),
      },
      {
        name: "Ridgeline A-Frame",
        title: "Cover inspection",
        recurrence_kind: "time",
        recurrence_value: 30,
        recurrence_unit: "day",
        last_done_at: ago(27 * DAY),
      },
      {
        name: "Pine Chalet",
        title: "Filter clean",
        recurrence_kind: "turnover",
        recurrence_value: 3,
        recurrence_unit: null,
        last_done_at: null,
      },
      {
        name: "Summit View Lodge",
        title: "Filter cartridge rinse",
        recurrence_kind: "time",
        recurrence_value: 14,
        recurrence_unit: "day",
        last_done_at: ago(5 * DAY),
      },
    ].filter(({ name }) => byName[name]);

    const maintenance = maintenanceDefs.map(({ name, ...rest }) => ({
      org_id: orgId,
      property_id: byName[name],
      ...rest,
    }));
    const { data: insertedTasks, error: mtErr } = await client
      .from("maintenance_task")
      .insert(maintenance)
      .select("id, property_id, last_done_at");
    if (mtErr) throw new Error(`maintenance_task insert: ${mtErr.message}`);

    const logs = (insertedTasks ?? [])
      .filter((t) => t.last_done_at)
      .map((t) => ({
        task_id: t.id,
        property_id: t.property_id,
        done_by: operatorId,
        done_at: t.last_done_at,
        note: "Routine completion (seeded history).",
      }));
    if (logs.length > 0) {
      const { error: mlErr } = await client.from("maintenance_log").insert(logs);
      if (mlErr) throw new Error(`maintenance_log insert: ${mlErr.message}`);
    }
  }

  const fromToday = (dayOffset) => {
    const d = new Date(tNow);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    return d.toISOString().slice(0, 10);
  };

  const scheduledDefs = [
    { name: "Pine Chalet", kind: "turnover", title: "Turnover", scheduled_for: fromToday(0), status: "scheduled" },
    {
      name: "Ridgeline A-Frame",
      kind: "turnover",
      title: "Turnover",
      scheduled_for: fromToday(1),
      status: "scheduled",
      assignee: "cleaner",
    },
    {
      name: "Lakeview Cabin 4",
      kind: "turnover",
      title: "Turnover",
      scheduled_for: fromToday(2),
      status: "scheduled",
      assignee: "cleaner",
      notes: "Before Saturday check-in — recheck sanitizer after shock.",
    },
    {
      name: "Summit View Lodge",
      kind: "turnover",
      title: "Turnover",
      scheduled_for: fromToday(5),
      status: "scheduled",
      assignee: "cleaner",
    },
    {
      name: "Lakeview Cabin 4",
      kind: "custom",
      title: "Replace filter cartridge",
      scheduled_for: fromToday(3),
      status: "scheduled",
      assignee: "cleaner",
      notes: "Pleatco PWW50 — reorder from Big Bear Spa & Pool.",
    },
    {
      name: "Ridgeline A-Frame",
      kind: "custom",
      title: "Cover inspection",
      scheduled_for: fromToday(7),
      status: "scheduled",
    },
    {
      name: "Summit View Lodge",
      kind: "custom",
      title: "Post-storm cover check",
      scheduled_for: fromToday(12),
      status: "scheduled",
    },
    {
      name: "Lakeview Cabin 4",
      kind: "turnover",
      title: "Turnover",
      scheduled_for: fromToday(14),
      status: "scheduled",
      assignee: "cleaner",
    },
    {
      name: "Pine Chalet",
      kind: "turnover",
      title: "Turnover",
      scheduled_for: fromToday(-2),
      status: "done",
      done_at: ago(2 * DAY),
      assignee: "cleaner",
    },
    {
      name: "Ridgeline A-Frame",
      kind: "custom",
      title: "Restock test strips",
      scheduled_for: fromToday(-4),
      status: "done",
      done_at: ago(4 * DAY),
      assignee: "operator",
    },
    {
      name: "Summit View Lodge",
      kind: "turnover",
      title: "Turnover",
      scheduled_for: fromToday(-6),
      status: "done",
      done_at: ago(6 * DAY),
    },
  ]
    .filter(({ name }) => byName[name])
    .map(({ name, assignee, done_at, ...rest }) => ({
      org_id: orgId,
      property_id: byName[name],
      source: "manual",
      assignee_user_id:
        assignee === "cleaner" ? cleanerId : assignee === "operator" ? operatorId : null,
      ...(done_at ? { done_at } : {}),
      ...rest,
    }));

  const { error: siErr } = await client.from("scheduled_item").insert(scheduledDefs);
  if (siErr) throw new Error(`scheduled_item insert: ${siErr.message}`);

  return { byName, ago, DAY };
}
