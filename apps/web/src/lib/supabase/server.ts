import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Server-side Supabase client wired to the Next.js cookie store. Reads the
 * session from cookies; writes refreshed cookies back where allowed (in a
 * Server Component the write is a no-op — middleware refreshes the session).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — cookies are read-only here.
          // The middleware refreshes the session instead.
        }
      },
    },
  });
}
