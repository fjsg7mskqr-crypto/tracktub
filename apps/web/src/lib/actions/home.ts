"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dayKey } from "@/components/calendar/days";

// Home's writes: today's route (hand-added stops) and settling open items.
// RLS is the gate (route_stop / task = app_can_capture_property); a write that
// RLS filters out matches no row and is reported as an error.

async function signedIn() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  return db;
}

/** Put a tub on today's route. Adding it twice is a no-op. */
export async function addToToday(propertyId: string): Promise<void> {
  const db = await signedIn();
  const { data: tub } = await db
    .from("property")
    .select("org_id")
    .eq("id", propertyId)
    .maybeSingle();
  if (!tub) throw new Error("Tub not found");
  const { error } = await db
    .from("route_stop")
    .upsert(
      { org_id: tub.org_id, property_id: propertyId, day: dayKey(new Date()) },
      { onConflict: "property_id,day", ignoreDuplicates: true }
    );
  if (error) throw new Error(`Couldn't add to today: ${error.message}`);
  refresh();
}

/** Take a hand-added tub off today's route. */
export async function removeFromToday(propertyId: string): Promise<void> {
  const db = await signedIn();
  const { error } = await db
    .from("route_stop")
    .delete()
    .eq("property_id", propertyId)
    .eq("day", dayKey(new Date()));
  if (error) throw new Error(`Couldn't remove from today: ${error.message}`);
  refresh();
}

async function closeItem(
  taskId: string,
  patch: { status: "settled" | "dismissed"; settled_visit_id?: string | null }
): Promise<void> {
  const db = await signedIn();
  const { data, error } = await db
    .from("task")
    .update({ ...patch, settled_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("status", "open")
    .select("id");
  if (error || !data?.length)
    throw new Error(
      `Couldn't update the item: ${error?.message ?? "not found"}`
    );
  refresh();
}

/** Settle an open item from Home; `visitId` is the tub's open draft, if any. */
export async function settleOpenItem(
  taskId: string,
  visitId: string | null
): Promise<void> {
  await closeItem(taskId, { status: "settled", settled_visit_id: visitId });
}
