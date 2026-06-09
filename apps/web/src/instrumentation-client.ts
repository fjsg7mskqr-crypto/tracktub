import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // No DSN (local dev, or before the Sentry project exists) disables the SDK
  // cleanly — the app runs exactly as before. Issue #37 tracks provisioning.
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
