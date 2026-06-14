import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * Pre-launch lockdown: after a session is established, reject anyone who isn't
 * on the `ADMIN_EMAILS` allowlist — sign them out and send them to the public
 * landing page, so a non-admin can never hold a session or use an
 * auto-provisioned workspace. Enforced in production only (local dev / demo stay
 * open). Returns a redirect to short-circuit the flow, or null to continue.
 */
async function rejectNonAdmin(
  supabase: SupabaseClient,
  origin: string,
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV !== "production") return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && !isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/landing`);
  }
  return null;
}

/**
 * Magic-link landing route. Handles both flows so it works regardless of how the
 * project's auth email template is configured:
 *   - PKCE / code flow  -> ?code=...            (exchangeCodeForSession)
 *   - token-hash flow    -> ?token_hash=&type=  (verifyOtp)
 * On success, redirects to ?next (defaults to "/").
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // `next` is attacker-controllable; pin it to a same-origin absolute path so it
  // can never become an open redirect, regardless of how it is later used.
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return (
        (await rejectNonAdmin(supabase, origin)) ??
        NextResponse.redirect(`${origin}${next}`)
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return (
        (await rejectNonAdmin(supabase, origin)) ??
        NextResponse.redirect(`${origin}${next}`)
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
