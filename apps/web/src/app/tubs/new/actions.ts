"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getVerifiedMembership } from "@/lib/auth";
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
  const membership = await getVerifiedMembership();
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

  // The id is minted here and the insert skips RETURNING: a login narrowed to
  // chosen properties (D29) can't read the row back inside the same statement
  // (its access is granted by an AFTER INSERT trigger).
  const id = randomUUID();
  const { error } = await supabase.from("property").insert({
    id,
    org_id: membership.orgId,
    name: input.name,
    address: input.address,
    client_id: clientId,
    volume_gallons: input.volumeGallons,
  });
  if (error) return { error: "Couldn't save the tub. Try again." };

  revalidatePath("/tubs");
  redirect(tubPath(id));
}
