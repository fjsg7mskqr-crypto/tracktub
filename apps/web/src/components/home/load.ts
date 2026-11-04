import type { createClient } from "@/lib/supabase/server";
import { photoKindOf, type PhotoKind } from "@/lib/visit";
import { READING_FIELDS } from "@/lib/readings";
import type { HomeDraft, HomeVisit, ReportState } from "./home-model";
import { isOpenItemKind, type OpenItem, type Reading } from "./open-items";

// Rows for Home (status board). RLS scopes every query to the caller's org, so
// none waits for the tub ids: Home runs them all in one Promise.all.

type Supabase = Awaited<ReturnType<typeof createClient>>;

const FOUND = "total_alkalinity, ph, calcium_hardness, sanitizer_ppm";
const LEFT =
  "left_total_alkalinity, left_ph, left_calcium_hardness, left_sanitizer_ppm";

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

type WaterRow = Partial<Record<string, number | string[] | null>>;

function reading(w: WaterRow | null, prefix: "" | "left_"): Reading {
  if (!w) return null;
  const r: Record<string, number | null> = {};
  for (const f of READING_FIELDS) {
    const v = w[`${prefix}${f}`];
    r[f] = typeof v === "number" ? v : null;
  }
  return READING_FIELDS.some((f) => r[f] !== null) ? r : null;
}

/** Locked visits, every tub, with as-left reading, owner flag and report state. */
export async function loadHomeVisits(supabase: Supabase): Promise<HomeVisit[]> {
  const { data, error } = await supabase
    .from("turnover")
    .select(
      `id, property_id, submitted_at_server, cleaning_steps, share_token, owner_flag,
       water:water_reading(${FOUND}, ${LEFT}),
       shares:proof_event(kind),
       views:share_view(id)`
    )
    .eq("status", "submitted_locked");
  if (error) throw new Error(`Failed to load visits: ${error.message}`);
  return (data ?? []).map((t) => {
    const w = one(t.water) as WaterRow | null;
    const sent = (t.shares ?? []).some((s) => s.kind === "share_copied");
    const report: ReportState =
      (t.views ?? []).length > 0 ? "opened" : sent ? "sent" : "not_sent";
    return {
      id: t.id,
      tubId: t.property_id,
      at: new Date(t.submitted_at_server),
      cleaningSteps: t.cleaning_steps ?? [],
      found: reading(w, ""),
      left: reading(w, "left_"),
      sent: t.share_token !== null,
      ownerFlag: t.owner_flag,
      report,
    };
  });
}

/** Open (draft) visits with what each has so far, for Working on. */
export async function loadHomeDrafts(supabase: Supabase): Promise<HomeDraft[]> {
  const { data, error } = await supabase
    .from("turnover")
    .select(
      `id, property_id, created_at, cleaning_steps,
       photos:photo(phase, slot),
       water:water_reading(${FOUND}, ${LEFT}, treatments)`
    )
    .eq("status", "draft");
  if (error) throw new Error(`Failed to load open visits: ${error.message}`);
  return (data ?? []).map((t) => {
    const w = one(t.water) as WaterRow | null;
    const kinds = (t.photos ?? [])
      .map((p) => photoKindOf(p.phase, p.slot))
      .filter((k): k is PhotoKind => k !== null);
    const treatments = (w?.treatments as string[] | null | undefined) ?? [];
    return {
      id: t.id,
      tubId: t.property_id,
      openedAt: new Date(t.created_at),
      photoKinds: [...new Set(kinds)],
      foundLogged: reading(w, "") !== null,
      leftLogged: reading(w, "left_") !== null,
      workCount: (t.cleaning_steps ?? []).length + treatments.length,
    };
  });
}

/** Every open item, oldest first. */
export async function loadOpenItems(supabase: Supabase): Promise<OpenItem[]> {
  const { data, error } = await supabase
    .from("task")
    .select("id, property_id, kind, title, note, created_at, opened_visit_id")
    .eq("status", "open")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load open items: ${error.message}`);
  return (data ?? []).map((t) => ({
    id: t.id,
    tubId: t.property_id,
    kind: isOpenItemKind(t.kind) ? t.kind : null,
    title: t.title,
    note: t.note,
    openedAt: t.created_at,
    openedVisitId: t.opened_visit_id,
  }));
}

/** Tubs added to the route by hand for `day` (YYYY-MM-DD, app zone). */
export async function loadRouteStops(
  supabase: Supabase,
  day: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("route_stop")
    .select("property_id")
    .eq("day", day);
  if (error) throw new Error(`Failed to load today's route: ${error.message}`);
  return (data ?? []).map((r) => r.property_id);
}
