"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { RecurrenceKind, RecurrenceUnit } from "@/lib/maintenance";

export type ActionResult = { ok: true } | { ok: false; error: string };

interface TaskInput {
  propertyId: string;
  orgId: string;
  title: string;
  recurrenceKind: RecurrenceKind;
  recurrenceValue: number;
  recurrenceUnit: RecurrenceUnit | null;
  notes: string | null;
}

function parseTaskInput(formData: FormData): TaskInput | { error: string } {
  const title = ((formData.get("title") as string) ?? "").trim();
  const propertyId = (formData.get("property_id") as string) ?? "";
  const orgId = (formData.get("org_id") as string) ?? "";
  const recurrenceKind = (formData.get("recurrence_kind") as RecurrenceKind) ?? "time";
  const recurrenceValue = Number(formData.get("recurrence_value"));
  const rawUnit = (formData.get("recurrence_unit") as string) || null;
  const notes = ((formData.get("notes") as string) ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!propertyId || !orgId) return { error: "Missing property." };
  if (!Number.isInteger(recurrenceValue) || recurrenceValue <= 0)
    return { error: "Recurrence must be a positive whole number." };
  if (recurrenceKind === "time" && !rawUnit)
    return { error: "Pick a time unit." };

  return {
    propertyId,
    orgId,
    title,
    recurrenceKind,
    recurrenceValue,
    recurrenceUnit: recurrenceKind === "time" ? (rawUnit as RecurrenceUnit) : null,
    notes,
  };
}

export async function createMaintenanceTaskAction(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseTaskInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { error } = await supabase.from("maintenance_task").insert({
    property_id: parsed.propertyId,
    org_id: parsed.orgId,
    title: parsed.title,
    recurrence_kind: parsed.recurrenceKind,
    recurrence_value: parsed.recurrenceValue,
    recurrence_unit: parsed.recurrenceUnit,
    notes: parsed.notes,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/maintenance");
  revalidatePath("/operations");
  return { ok: true };
}

export async function updateMaintenanceTaskAction(
  taskId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const parsed = parseTaskInput(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const { error } = await supabase
    .from("maintenance_task")
    .update({
      title: parsed.title,
      recurrence_kind: parsed.recurrenceKind,
      recurrence_value: parsed.recurrenceValue,
      recurrence_unit: parsed.recurrenceUnit,
      notes: parsed.notes,
    })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/maintenance");
  revalidatePath("/operations");
  return { ok: true };
}

export async function markMaintenanceDoneAction(
  taskId: string,
  propertyId: string,
  note: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Insert the immutable completion log first (RLS verifies task↔property match).
  const { error: logErr } = await supabase.from("maintenance_log").insert({
    task_id: taskId,
    property_id: propertyId,
    done_by: user.id,
    note: note?.trim() || null,
  });
  if (logErr) return { ok: false, error: logErr.message };

  // Re-arm the cycle.
  const { error: taskErr } = await supabase
    .from("maintenance_task")
    .update({ last_done_at: new Date().toISOString() })
    .eq("id", taskId);
  if (taskErr) return { ok: false, error: taskErr.message };

  revalidatePath("/operations/maintenance");
  revalidatePath("/operations");
  return { ok: true };
}

export async function archiveMaintenanceTaskAction(
  taskId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_task")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/operations/maintenance");
  revalidatePath("/operations");
  return { ok: true };
}
