import { createClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

export type WaitlistState = {
  status: "idle" | "ok" | "already" | "error";
  message?: string;
};

const reply = (state: WaitlistState, status = 200) => Response.json(state, { status });

/** POST /landing/waitlist — validate + persist a waitlist signup to Supabase.
 *  A route handler, NOT a Server Action: action ids change on every build, so a
 *  /landing tab opened before a deploy would post a stale id and 500 ("Failed to
 *  find Server Action"). This URL is stable across deploys. Public via the
 *  `/landing` prefix in PUBLIC_PATHS. The anon RLS policy allows INSERT only, so
 *  this works for logged-out visitors and can never read the list back. */
export async function POST(request: Request) {
  // Throttle waitlist submissions per IP (issue #42). No-op until Upstash is
  // configured; fails open, so a limiter hiccup never blocks a real signup.
  const { success } = await checkRateLimit("waitlist", getClientIp(request.headers));
  if (!success) {
    return reply(
      { status: "error", message: "Too many attempts — please wait a moment and try again." },
      429,
    );
  }

  let email: string;
  try {
    const body: unknown = await request.json();
    const raw =
      typeof body === "object" && body !== null ? (body as { email?: unknown }).email : "";
    email = normalizeEmail(String(raw ?? ""));
  } catch {
    return reply({ status: "error", message: "Please enter a valid email address." }, 400);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("waitlist").insert({ email, source: "landing" });
    if (error) {
      // 23505 = unique_violation — they're already signed up; treat as success.
      if (error.code === "23505") return reply({ status: "already" });
      console.error("[waitlist] insert failed:", error.message);
      return reply({ status: "error", message: "Something went wrong — please try again." }, 500);
    }
    return reply({ status: "ok" });
  } catch (err) {
    console.error("[waitlist] unexpected error:", err);
    return reply({ status: "error", message: "Something went wrong — please try again." }, 500);
  }
}
