import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Edge runtime = middleware. Same env-driven DSN as the server config; no
  // DSN disables the SDK cleanly and capture calls become no-ops.
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,
});
