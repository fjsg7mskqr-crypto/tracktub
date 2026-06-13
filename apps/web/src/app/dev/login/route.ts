// DEV-ONLY demo login. Signs in as a seeded demo user (host or cleaner) so the
// local demo opens straight into the app — no Google round-trip. 404s in
// production and is only ever wired to the LOCAL stack's seeded credentials.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEMO = {
  host: { email: "demo-host@tracktub.test", password: "demo-pass-1234" },
  cleaner: { email: "demo-cleaner@tracktub.test", password: "demo-pass-1234" },
} as const;

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const as = request.nextUrl.searchParams.get("as") === "cleaner" ? "cleaner" : "host";
  const creds = DEMO[as];

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(creds);

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  if (error) {
    url.pathname = "/login";
    url.searchParams.set("demo_error", error.message);
  }
  // The server client has written the auth cookies onto the response cookie jar;
  // redirect carries them so the destination renders authenticated.
  return NextResponse.redirect(url);
}
