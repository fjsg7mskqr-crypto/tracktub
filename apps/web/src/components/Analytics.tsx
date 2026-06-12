"use client";

import { useEffect } from "react";
import { initAnalytics, identify } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

// Mounts once in the root layout: initializes PostHog (no-op without a key)
// and identifies the signed-in user so funnels line up with real operators.
export function Analytics() {
  useEffect(() => {
    initAnalytics();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) identify(user.id, user.email ?? undefined);
    });
  }, []);
  return null;
}
