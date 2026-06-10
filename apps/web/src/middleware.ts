import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except static assets, image files, and the Sentry tunnel
  // (`/monitoring` is a telemetry ingest path — errors from signed-out users
  // must reach it, so it bypasses session refresh and auth gating).
  matcher: [
    "/((?!monitoring|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
