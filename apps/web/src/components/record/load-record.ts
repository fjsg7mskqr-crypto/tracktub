import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  careFromVisits,
  nextDueLine,
  type RecordRow,
  type WaterRow,
} from "./record-model";

type Client = SupabaseClient<Database>;

/** Everything the record prints, for one turnover, read by a signed-in member
 *  (RLS-scoped). The public report does NOT use this: anon has no table access
 *  and loads through proof_record(token) — see loadRecordByToken. */
export const RECORD_SELECT = `id, status, created_at, submitted_at_server, locked_at, share_token, notes, cleaning_steps, owner_flag,
  property:property(id, name, address, drain_interval_days, filter_interval_days, client:client(name)),
  submitter:profile(full_name, email),
  photos:photo(slot, phase, storage_path, captured_at, received_at, created_at),
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

/** A record plus the tub's locked-visit care history (for "next due"). */
export type ProofRecord = { row: RecordRow; tubVisits: CareVisit[] };

type CareVisit = {
  submitted_at_server: string | null;
  cleaning_steps: string[] | null;
};

/** The public report, by its exact share token. Anon has no table access, so
 *  this goes through proof_record(), which returns the one locked visit whose
 *  share_token matches (nothing for a wrong, short or null token). */
export async function loadRecordByToken(
  supabase: Client,
  token: string
): Promise<ProofRecord | null> {
  const { data } = await supabase.rpc("proof_record", { p_token: token });
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const { tub_visits, ...raw } = data as unknown as RawRow & {
    tub_visits?: CareVisit[] | null;
  };
  return {
    row: normalizeRecordRow(raw as RawRow),
    tubVisits: Array.isArray(tub_visits) ? tub_visits : [],
  };
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
 *  Signed-in callers pass nothing and the visits are read under RLS; the public
 *  report passes the visits proof_record() returned (anon reads no tables). */
export async function loadNextDue(
  supabase: Client,
  row: RecordRow,
  visits?: CareVisit[]
): Promise<string | null> {
  if (!row.property) return null;
  let list = visits;
  if (!list) {
    const { data } = await supabase
      .from("turnover")
      .select("submitted_at_server, cleaning_steps")
      .eq("property_id", row.property.id)
      .eq("status", "submitted_locked");
    list = Array.isArray(data) ? data : [];
  }
  return nextDueLine({
    ...careFromVisits(list),
    drainDays: row.property.drain_interval_days ?? null,
    filterDays: row.property.filter_interval_days ?? null,
  });
}

export const proofUrl = (origin: string, token: string) =>
  `${origin}/proof/${token}`;
