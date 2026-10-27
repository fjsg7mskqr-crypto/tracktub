import type { createClient } from "@/lib/supabase/server";
import type { HistoryVisit } from "@/lib/tub-history";
import type { LogVisit } from "@/components/tub/log";

// Row loaders for the Tubs screens. RLS scopes every query to the caller's org,
// so these never filter by org themselves.

type Supabase = Awaited<ReturnType<typeof createClient>>;

const FOUND_COLUMNS =
  "total_alkalinity, ph, calcium_hardness, sanitizer_ppm" as const;

export type TubRowData = {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  drainIntervalDays: number | null;
  filterIntervalDays: number | null;
};

function one<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function loadTubs(supabase: Supabase): Promise<TubRowData[]> {
  const { data, error } = await supabase
    .from("property")
    .select(
      "id, name, client_id, drain_interval_days, filter_interval_days, client(name)"
    );
  if (error) throw new Error(`Failed to load tubs: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.client_id,
    clientName: one(p.client)?.name ?? null,
    drainIntervalDays: p.drain_interval_days,
    filterIntervalDays: p.filter_interval_days,
  }));
}

/** Locked visits per tub, as history. */
export async function loadTubHistories(
  supabase: Supabase,
  propertyIds: string[]
): Promise<Map<string, HistoryVisit[]>> {
  const out = new Map<string, HistoryVisit[]>(
    propertyIds.map((id) => [id, []])
  );
  if (propertyIds.length === 0) return out;

  const { data, error } = await supabase
    .from("turnover")
    .select(
      `property_id, submitted_at_server, cleaning_steps,
       water:water_reading(${FOUND_COLUMNS})`
    )
    .in("property_id", propertyIds)
    .eq("status", "submitted_locked");
  if (error) throw new Error(`Failed to load visits: ${error.message}`);

  for (const t of data ?? []) {
    out.get(t.property_id)?.push({
      at: new Date(t.submitted_at_server),
      cleaningSteps: t.cleaning_steps ?? [],
      found: one(t.water),
    });
  }
  return out;
}

export type TubDetail = TubRowData & {
  address: string | null;
  volumeGallons: number | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One tub, or null when it doesn't exist or isn't the caller's (RLS). */
export async function loadTub(
  supabase: Supabase,
  id: string
): Promise<TubDetail | null> {
  if (!UUID.test(id)) return null;
  const { data: p, error } = await supabase
    .from("property")
    .select(
      "id, name, address, volume_gallons, client_id, drain_interval_days, filter_interval_days, client(name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load tub: ${error.message}`);
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    volumeGallons: p.volume_gallons,
    clientId: p.client_id,
    clientName: one(p.client)?.name ?? null,
    drainIntervalDays: p.drain_interval_days,
    filterIntervalDays: p.filter_interval_days,
  };
}

export type TubVisitRow = LogVisit & {
  shared: boolean;
  opened: boolean;
};

const date = (s: string | null) => (s ? new Date(s) : null);

/** Every visit of one tub (locked and draft), oldest first. */
export async function loadTubVisits(
  supabase: Supabase,
  propertyId: string
): Promise<TubVisitRow[]> {
  const { data, error } = await supabase
    .from("turnover")
    .select(
      `id, status, submitted_at_server, cleaning_steps, share_token,
       water:water_reading(${FOUND_COLUMNS}, left_total_alkalinity, left_ph,
         left_calcium_hardness, left_sanitizer_ppm, found_recorded_at,
         left_recorded_at, treatments),
       photos:photo(phase, slot, captured_at),
       views:share_view(id)`
    )
    .eq("property_id", propertyId)
    .order("submitted_at_server", { ascending: true });
  if (error) throw new Error(`Failed to load visits: ${error.message}`);

  return (data ?? []).map((t) => {
    const w = one(t.water);
    return {
      id: t.id,
      status: t.status,
      at: new Date(t.submitted_at_server),
      cleaningSteps: t.cleaning_steps ?? [],
      found: w
        ? {
            total_alkalinity: w.total_alkalinity,
            ph: w.ph,
            calcium_hardness: w.calcium_hardness,
            sanitizer_ppm: w.sanitizer_ppm,
          }
        : null,
      left: w
        ? {
            total_alkalinity: w.left_total_alkalinity,
            ph: w.left_ph,
            calcium_hardness: w.left_calcium_hardness,
            sanitizer_ppm: w.left_sanitizer_ppm,
          }
        : null,
      foundAt: date(w?.found_recorded_at ?? null),
      leftAt: date(w?.left_recorded_at ?? null),
      treatments: w?.treatments ?? [],
      photos: (t.photos ?? []).map((p) => ({
        phase: p.phase,
        slot: p.slot,
        capturedAt: date(p.captured_at),
      })),
      shared: t.share_token !== null,
      opened: (t.views ?? []).length > 0,
    };
  });
}
