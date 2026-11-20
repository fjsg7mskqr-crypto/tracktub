import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { rejectBots } from "@/lib/botid";
import {
  MIN_TOKEN_LENGTH,
  isBotUserAgent,
  isPrefetch,
} from "@/lib/open-filter";

const noContent = () => new Response(null, { status: 204 });

/** POST /proof/[token]/open — record that a PERSON opened the shared report.
 *  Called by <OpenBeacon> from the browser once the page has loaded and is
 *  visible; the server render of /proof/[token] records nothing, so link-preview
 *  crawlers, email scanners and uptime bots (which only GET the page) never
 *  count. Public via the `/proof` prefix in PUBLIC_PATHS. Answers 204 for every
 *  non-error outcome — counted or not — so it reveals nothing about a token. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (typeof token !== "string" || token.length < MIN_TOKEN_LENGTH)
    return noContent();

  // Bots/previewers that do run the beacon, and speculative prefetches.
  if (isBotUserAgent(request.headers.get("user-agent"))) return noContent();
  if (isPrefetch(request.headers)) return noContent();

  // Invisible bot check (issue #43). Fails open — see src/lib/botid.ts.
  const blocked = await rejectBots("proof-open");
  if (blocked) return blocked;

  // Per IP + token, so reloading one report can't inflate anything and one
  // client can't probe many tokens. No-op until Upstash is configured.
  const { success } = await checkRateLimit(
    "proof_open",
    `${getClientIp(request.headers)}:${token}`
  );
  if (!success) return noContent();

  try {
    const supabase = await createClient();

    // The team's own opens (the tech checking their link) don't count: a
    // signed-in user who can read this turnover under normal RLS is a member.
    // Signed-out visitors, and signed-in users of other teams, count.
    const { data: claims } = await supabase.auth.getClaims();
    if (claims?.claims?.sub) {
      const { data: proof } = await supabase.rpc("proof_record", {
        p_token: token,
      });
      const turnoverId =
        proof && typeof proof === "object" && !Array.isArray(proof)
          ? (proof as { id?: unknown }).id
          : null;
      if (typeof turnoverId === "string") {
        const { data: own } = await supabase
          .from("turnover")
          .select("id")
          .eq("id", turnoverId)
          .maybeSingle();
        if (own) return noContent();
      }
    }

    // share_view is its own append-only table because turnover_lock_guard
    // rejects updates to a locked turnover. Counting must never break anything.
    try {
      await supabase.rpc("record_share_view", { p_token: token });
    } catch {
      /* non-critical */
    }
    try {
      await supabase.rpc("record_proof_open", { p_share_token: token });
    } catch {
      /* non-critical — legacy proof_event signal */
    }
  } catch (err) {
    console.error("[proof-open] failed:", err);
  }
  return noContent();
}
