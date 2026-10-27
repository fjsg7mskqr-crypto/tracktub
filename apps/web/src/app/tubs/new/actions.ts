"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { tubPath } from "@/lib/app-routes";
import { parseAddTub } from "@/components/tub/add-tub";

export type AddTubState = { error: string | null };

/**
 * Add tub (spec §4): optionally create the client, then the property. RLS and
 * the (client_id, org_id) foreign key keep both inside the caller's org. No
 * tub-count wall — a solo operator services many tubs.
 */
export async function createTubAction(
  _prev: AddTubState,
  fd: FormData
): Promise<AddTubState> {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const parsed = parseAddTub(fd);
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.value;

  const supabase = await createClient();
  let clientId = input.clientId;
  if (input.newClientName) {
    const { data: client, error } = await supabase
      .from("client")
      .insert({ org_id: membership.orgId, name: input.newClientName })
      .select("id")
      .single();
    if (error || !client)
      return { error: "Couldn't save the client. Try again." };
    clientId = client.id;
  }

  const { data: tub, error } = await supabase
    .from("property")
    .insert({
      org_id: membership.orgId,
      name: input.name,
      address: input.address,
      client_id: clientId,
      volume_gallons: input.volumeGallons,
    })
    .select("id")
    .single();
  if (error || !tub) return { error: "Couldn't save the tub. Try again." };

  revalidatePath("/tubs");
  redirect(tubPath(tub.id));
}
