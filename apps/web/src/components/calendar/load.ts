import type { createClient } from "@/lib/supabase/server";
import { loadTubs } from "@/app/tubs/load";
import type {
  CareTub,
  LoggedVisit,
} from "@/components/calendar/calendar-model";

// Rows for Home and Calendar. RLS scopes every query to the caller's org.

type Supabase = Awaited<ReturnType<typeof createClient>>;

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export type CareData = {
  tubs: CareTub[];
  /** Locked visits, every tub. */
  visits: LoggedVisit[];
  /** Open draft per tub: tub id → visit id. */
  drafts: Map<string, string>;
};

export async function loadCareData(supabase: Supabase): Promise<CareData> {
  // Both RLS-scoped to the caller's org, so the visits needn't wait for the
  // tub ids; the id filter below keeps the result the same.
  const [tubs, { data, error }] = await Promise.all([
    loadTubs(supabase),
    supabase.from("turnover").select(
      `id, property_id, status, submitted_at_server, cleaning_steps, share_token,
       water:water_reading(total_alkalinity, ph, calcium_hardness, sanitizer_ppm)`
    ),
  ]);
  if (error) throw new Error(`Failed to load visits: ${error.message}`);
  if (tubs.length === 0) return { tubs: [], visits: [], drafts: new Map() };
  const tubIds = new Set(tubs.map((t) => t.id));

  const visits: LoggedVisit[] = [];
  const drafts = new Map<string, string>();
  for (const t of data ?? []) {
    if (!tubIds.has(t.property_id)) continue;
    if (t.status === "draft") {
      drafts.set(t.property_id, t.id);
      continue;
    }
    visits.push({
      id: t.id,
      tubId: t.property_id,
      at: new Date(t.submitted_at_server),
      cleaningSteps: t.cleaning_steps ?? [],
      found: one(t.water),
      sent: t.share_token !== null,
    });
  }
  return { tubs, visits, drafts };
}

/** Share and open events since `sinceIso`, for This week. */
export async function loadShareActivity(
  supabase: Supabase,
  sinceIso: string
): Promise<{
  sent: { turnover_id: string; occurred_at: string }[];
  opened: { turnover_id: string; opened_at: string }[];
}> {
  const [{ data: sent }, { data: opened }] = await Promise.all([
    supabase
      .from("proof_event")
      .select("turnover_id, occurred_at")
      .eq("kind", "share_copied")
      .gte("occurred_at", sinceIso),
    supabase
      .from("share_view")
      .select("turnover_id, opened_at")
      .gte("opened_at", sinceIso),
  ]);
  return { sent: sent ?? [], opened: opened ?? [] };
}
