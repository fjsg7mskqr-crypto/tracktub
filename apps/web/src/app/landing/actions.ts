"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/email";

export type WaitlistState = {
  status: "idle" | "ok" | "already" | "error";
  message?: string;
};

/** Server action: validate + persist a waitlist signup to Supabase.
 *  The anon RLS policy allows INSERT only, so this works for logged-out
 *  visitors and can never read the list back. */
export async function joinWaitlist(
  _prev: WaitlistState,
  formData: FormData,
): Promise<WaitlistState> {
  let email: string;
  try {
    email = normalizeEmail(String(formData.get("email") ?? ""));
  } catch {
    return { status: "error", message: "Please enter a valid email address." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist").insert({ email, source: "landing" });
    if (error) {
      // 23505 = unique_violation — they're already signed up; treat as success.
      if (error.code === "23505") return { status: "already" };
      console.error("[waitlist] insert failed:", error.message);
      return { status: "error", message: "Something went wrong — please try again." };
    }
    return { status: "ok" };
  } catch (err) {
    console.error("[waitlist] unexpected error:", err);
    return { status: "error", message: "Something went wrong — please try again." };
  }
}
