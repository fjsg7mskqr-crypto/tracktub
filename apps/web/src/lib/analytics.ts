"use client";

import posthog from "posthog-js";

// Privacy-safe defaults for an evidence platform: no input autocapture, no
// session replay. No-ops entirely when the key is absent (e.g. local dev).
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
let ready = false;

export function initAnalytics() {
  if (!key || ready) return;
  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
    person_profiles: "identified_only",
  });
  ready = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!ready) return;
  posthog.capture(event, props);
}

export function identify(id: string, email?: string) {
  if (!ready) return;
  posthog.identify(id, email ? { email } : undefined);
}
