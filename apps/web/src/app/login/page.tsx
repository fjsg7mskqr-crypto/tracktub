"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";

// Functional sign-in — Google OAuth via Supabase. Now on the design-system
// `Button` primitive (issue #96); this screen was previously a bespoke
// placeholder awaiting the UI foundation.
export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // Client-initiated PKCE stores a one-time code verifier in a cookie on the
      // CURRENT origin, so the OAuth round-trip MUST return to that same origin.
      // Do NOT use getURL() here: it prefers a fixed canonical URL
      // (NEXT_PUBLIC_SITE_URL), which sends preview/non-canonical deployments to
      // prod, where the verifier cookie is absent → session never minted →
      // redirect loop back to /login. Always use the live browser origin.
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is redirected to Google, so this line is only
    // reached on error.
    if (error) {
      setError(error.message);
      setPending(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 360,
        margin: "0 auto",
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 16,
        padding: "0 24px",
      }}
    >
      <h1 style={{ fontSize: 22 }}>Sign in to TrackTub</h1>
      <Button
        variant="primary"
        block
        onClick={signInWithGoogle}
        disabled={pending}
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error && (
        <p
          role="alert"
          className="small"
          style={{ color: "var(--urgent)", margin: 0 }}
        >
          {error}
        </p>
      )}
    </main>
  );
}
