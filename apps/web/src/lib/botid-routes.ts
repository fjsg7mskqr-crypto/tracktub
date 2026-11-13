/**
 * The public write endpoints guarded by Vercel BotID (issue #43). Shared by the
 * client (`initBotId` in src/instrumentation-client.ts, which attaches the
 * invisible challenge headers to matching fetches) and documentation for the
 * server (`rejectBots` in src/lib/botid.ts, called inside each route). BotID's
 * server check FAILS for a route the client isn't told to protect, so a new
 * entry here must ship together with a `rejectBots()` call in that route.
 *
 * Kept free of server imports so it can be bundled into the browser.
 */
export const BOTID_PROTECTED_ROUTES = [
  { path: "/landing/waitlist", method: "POST" },
] as const;
