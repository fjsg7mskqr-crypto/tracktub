import * as Sentry from "@sentry/nextjs";
import { initBotId } from "botid/client/core";
import { BOTID_PROTECTED_ROUTES } from "@/lib/botid-routes";

Sentry.init({
  // The DSN is public by design (it only addresses where events are sent), so
  // it ships in code — no per-environment Vercel config or redeploy needed.
  // Env still overrides it, e.g. to split projects per tier later.
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    "https://95ef95ac9eefd2ee1f0c31b83284943b@o4510660925718528.ingest.us.sentry.io/4511538300846080",

  // Vercel: "production" | "preview" | "development". prod is the only tier
  // wired to the Production environment, so alerts can filter on it.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,

  // Evidence platform: no IPs/headers attached to events by default.
  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Replays only around errors, fully masked — turnover photos and guest data
  // must never appear in a recording.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
});

// Vercel BotID (issue #43): attaches invisible challenge headers to fetches
// for the listed public write endpoints; the route verifies them server-side
// (src/lib/botid.ts). No-op in `next dev`. The challenge script loads from our
// own origin (withBotId rewrites in next.config.mjs), injected by this nonce'd
// bundle, so 'strict-dynamic' already permits it — no CSP host allowlist.
initBotId({ protect: BOTID_PROTECTED_ROUTES.map((r) => ({ ...r })) });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
