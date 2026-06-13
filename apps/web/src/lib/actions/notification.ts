"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Mark a single notification read. RLS (notification_update_own) scopes the
// update to the caller's own rows, so an id from another user is a silent no-op.
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error)
    throw new Error(`Failed to mark notification read: ${error.message}`);
  revalidatePath("/");
}

// Mark every unread notification read for the current user (the "dismiss all"
// control on the Dashboard feed).
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error)
    throw new Error(`Failed to mark notifications read: ${error.message}`);
  revalidatePath("/");
}
