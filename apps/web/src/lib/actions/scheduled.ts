"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Enums } from "@/lib/supabase/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

type Kind = Enums<"scheduled_item_kind">;

function revalidate() {
  revalidatePath("/operations/schedule");
  revalidatePath("/operations");
}

export async function createScheduledItemAction(input: {
  propertyId: string;
  orgId: string;
  kind: Kind;
  title: string;
  scheduledFor: string; // YYYY-MM-DD
  maintenanceTaskId?: string | null;
  source?: Enums<"scheduled_item_source">;
  notes?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  if (!input.propertyId || !input.orgId)
    return { ok: false, error: "Missing property." };
  if (!input.scheduledFor) return { ok: false, error: "Pick a date." };

  const { error } = await supabase.from("scheduled_item").insert({
    property_id: input.propertyId,
    org_id: input.orgId,
    kind: input.kind,
    title,
    scheduled_for: input.scheduledFor,
    maintenance_task_id: input.maintenanceTaskId ?? null,
    source: input.source ?? "manual",
    notes: input.notes?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function editScheduledItemAction(
  id: string,
  input: { title: string; notes?: string | null },
): Promise<ActionResult> {
  const supabase = await createClient();
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  const { error } = await supabase
    .from("scheduled_item")
    .update({ title, notes: input.notes?.trim() || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function rescheduleScheduledItemAction(
  id: string,
  scheduledFor: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  if (!scheduledFor) return { ok: false, error: "Pick a date." };
  const { error } = await supabase
    .from("scheduled_item")
    .update({ scheduled_for: scheduledFor })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function assignScheduledItemAction(
  id: string,
  assigneeUserId: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduled_item")
    .update({ assignee_user_id: assigneeUserId })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Best-effort notify: the writer no-ops on self-assign / unauthorized, so a
  // hiccup must never fail the assignment itself.
  if (assigneeUserId) {
    try {
      await supabase.rpc("notify_scheduled_assignment", {
        p_scheduled_item_id: id,
      });
    } catch {
      // Swallow — the assignment is saved regardless of the notification.
    }
  }
  revalidate();
  return { ok: true };
}

export async function markScheduledItemDoneAction(input: {
  id: string;
  // For a maintenance occurrence, also write the completion log + re-arm cycle.
  maintenanceTaskId?: string | null;
  propertyId?: string | null;
  note?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nowIso = new Date().toISOString();

  if (input.maintenanceTaskId && input.propertyId) {
    const { error: logErr } = await supabase.from("maintenance_log").insert({
      task_id: input.maintenanceTaskId,
      property_id: input.propertyId,
      done_by: user.id,
      note: input.note?.trim() || null,
    });
    if (logErr) return { ok: false, error: logErr.message };
    const { error: taskErr } = await supabase
      .from("maintenance_task")
      .update({ last_done_at: nowIso })
      .eq("id", input.maintenanceTaskId);
    if (taskErr) return { ok: false, error: taskErr.message };
  }

  const { error } = await supabase
    .from("scheduled_item")
    .update({ status: "done", done_at: nowIso })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function skipScheduledItemAction(
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("scheduled_item")
    .update({ status: "skipped" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}
