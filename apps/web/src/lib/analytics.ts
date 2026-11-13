"use client";

import posthog from "posthog-js";
import { DEFAULT_POSTHOG_HOST } from "@/lib/csp";

// Privacy-safe defaults for an evidence platform: no input autocapture, no
// session replay, no third-party scripts. No-ops entirely when the key is
// absent (e.g. local dev). The CSP connect-src (src/lib/csp.ts) allows exactly
// the PostHog origins this config talks to — change both together.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
let ready = false;

export function initAnalytics() {
  if (!key || ready) return;
  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.replace(/\s/g, "") ||
      DEFAULT_POSTHOG_HOST,
    autocapture: false,
    // Never inject PostHog-hosted scripts (remote-config.js, surveys, toolbar,
    // exception/web-vitals extensions). Remote config then falls back to a
    // JSON fetch on the assets host, which connect-src allows.
    disable_external_dependency_loading: true,
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
