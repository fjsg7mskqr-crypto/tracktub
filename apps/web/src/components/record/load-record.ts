import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  careFromVisits,
  nextDueLine,
  type RecordRow,
  type WaterRow,
} from "./record-model";

type Client = SupabaseClient<Database>;

/** Everything the record prints, for one turnover. Works for anon on a locked,
 *  shared turnover (the *_public_proof policies); the client embed stays null
 *  for anon — /proof/[token] fills it via the proof_client_name() function. */
export const RECORD_SELECT = `id, status, created_at, submitted_at_server, share_token, notes, cleaning_steps, owner_flag,
  property:property(id, name, address, drain_interval_days, filter_interval_days, client:client(name)),
  submitter:profile(full_name, email),
  photos:photo(slot, phase, storage_path, captured_at, created_at),
  water:water_reading(total_alkalinity, ph, calcium_hardness, sanitizer_ppm,
    left_total_alkalinity, left_ph, left_calcium_hardness, left_sanitizer_ppm,
    recorded_at, found_recorded_at, left_recorded_at, treatments, treatment_note)`;

type Embedded<T> = T | T[] | null | undefined;

const first = <T>(v: Embedded<T>): T | null =>
  (Array.isArray(v) ? v[0] : v) ?? null;

type RawRow = Omit<RecordRow, "property" | "submitter" | "water" | "photos"> & {
  property: Embedded<
    Omit<NonNullable<RecordRow["property"]>, "client"> & {
      client: Embedded<{ name: string }>;
    }
  >;
  submitter: Embedded<NonNullable<RecordRow["submitter"]>>;
  photos: RecordRow["photos"] | null;
  water: Embedded<WaterRow>;
};

/** Flattens Supabase's embeds (object or one-element array) into a RecordRow. */
export function normalizeRecordRow(raw: RawRow): RecordRow {
  const property = first(raw.property);
  return {
    ...raw,
    property: property ? { ...property, client: first(property.client) } : null,
    submitter: first(raw.submitter),
    photos: raw.photos ?? [],
    water: first(raw.water),
  };
}

export async function loadRecordById(
  supabase: Client,
  id: string
): Promise<RecordRow | null> {
  const { data } = await supabase
    .from("turnover")
    .select(RECORD_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data ? normalizeRecordRow(data as unknown as RawRow) : null;
}

/** Only a locked record is ever shown to the owner. */
export async function loadRecordByToken(
  supabase: Client,
  token: string
): Promise<RecordRow | null> {
  const { data } = await supabase
    .from("turnover")
    .select(RECORD_SELECT)
    .eq("share_token", token)
    .eq("status", "submitted_locked")
    .maybeSingle();
  return data ? normalizeRecordRow(data as unknown as RawRow) : null;
}

/** A tub's locked records, newest first (history report). */
export async function loadTubRecords(
  supabase: Client,
  propertyId: string
): Promise<RecordRow[]> {
  const { data } = await supabase
    .from("turnover")
    .select(RECORD_SELECT)
    .eq("property_id", propertyId)
    .eq("status", "submitted_locked")
    .order("submitted_at_server", { ascending: false })
    .limit(200);
  return ((data ?? []) as unknown as RawRow[]).map(normalizeRecordRow);
}

/** The footer's next-due line for a record's tub, from its locked visits.
 *  For anon this sees only the tub's shared records — best effort. */
export async function loadNextDue(
  supabase: Client,
  row: RecordRow
): Promise<string | null> {
  if (!row.property) return null;
  const { data } = await supabase
    .from("turnover")
    .select("submitted_at_server, cleaning_steps")
    .eq("property_id", row.property.id)
    .eq("status", "submitted_locked");
  const visits = Array.isArray(data) ? data : [];
  return nextDueLine({
    ...careFromVisits(visits),
    drainDays: row.property.drain_interval_days ?? null,
    filterDays: row.property.filter_interval_days ?? null,
  });
}

export const proofUrl = (origin: string, token: string) =>
  `${origin}/proof/${token}`;
