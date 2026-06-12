"use server";

import { createClient } from "@/lib/supabase/server";

// Records a proof-link share (PRD §16 wedge signal). RLS only allows the
// acting org member to insert `share_copied` rows for locked turnovers.
export async function recordProofShare(turnoverId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  try {
    await supabase.from("proof_event").insert({
      turnover_id: turnoverId,
      kind: "share_copied",
      actor_user_id: user.id,
    });
  } catch {
    // Fire-and-forget instrumentation — never propagate to the caller.
  }
}
