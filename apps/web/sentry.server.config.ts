import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Server-side prefers the non-public var; falls back to the public one so a
  // single Vercel env entry is enough. No DSN disables the SDK cleanly.
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Evidence platform: no IPs/headers attached to events by default. Local
  // variables stay off too — stack frames here can hold session tokens.
  sendDefaultPii: false,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  enableLogs: true,
});
