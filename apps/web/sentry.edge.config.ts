import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Public-by-design DSN baked in (see instrumentation-client.ts); env wins
  // when set.
  dsn:
    process.env.SENTRY_DSN ??
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    "https://95ef95ac9eefd2ee1f0c31b83284943b@o4510660925718528.ingest.us.sentry.io/4511538300846080",

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,
});
