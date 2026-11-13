import { checkBotId } from "botid/server";

/**
 * Server-side Vercel BotID gate (issue #43) for public write endpoints listed
 * in src/lib/botid-routes.ts. Basic (free) mode: no account keys, no visible
 * challenge — the client script is served from our own origin via the
 * `withBotId` rewrites in next.config.mjs.
 *
 * Returns a 403 Response when BotID classifies the request as a bot, or null
 * to let the request through. The 403 body uses the same `{ status, message }`
 * shape the waitlist form already renders, so a misclassified human sees a
 * friendly line of text, never a CAPTCHA.
 *
 * FAILS OPEN: if the BotID call itself throws (Vercel API hiccup, missing OIDC
 * token, running outside Vercel e.g. `next start` locally) the request is
 * allowed and the error logged — mirroring src/lib/ratelimit.ts. The protected
 * surface is an insert-only, unique-email, per-IP-throttled waitlist; a few
 * spam rows during an outage are cheap, silently dropping real sign-ups (as the
 * #281 CSP bug did for ~2 months) is not.
 *
 * Locally and in tests (NODE_ENV !== "production") BotID always reports human.
 */
export async function rejectBots(route: string): Promise<Response | null> {
  try {
    const verdict = await checkBotId();
    if (!verdict.isBot) return null;
  } catch (err) {
    console.error(`[botid] ${route} check failed; allowing:`, err);
    return null;
  }
  return Response.json(
    {
      status: "error",
      message:
        "We couldn’t verify this request. Please refresh the page and try again.",
    },
    { status: 403 }
  );
}
