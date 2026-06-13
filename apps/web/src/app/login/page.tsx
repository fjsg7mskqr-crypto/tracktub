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
    // Carry a same-origin `?next=` through the OAuth round-trip so capability
    // links (e.g. /invite/{token}) resume after sign-in. The callback route
    // re-validates next as a same-origin path, so an open redirect is
    // impossible even if this is tampered with. Read it from the live URL at
    // click time to avoid forcing the page dynamic via useSearchParams.
    const rawNext = new URLSearchParams(window.location.search).get("next");
    const next =
      rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
        ? rawNext
        : null;
    const callback = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // Client-initiated PKCE stores a one-time code verifier in a cookie on the
      // CURRENT origin, so the OAuth round-trip MUST return to that same origin.
      // Do NOT use getURL() here: it prefers a fixed canonical URL
      // (NEXT_PUBLIC_SITE_URL), which sends preview/non-canonical deployments to
      // prod, where the verifier cookie is absent → session never minted →
      // redirect loop back to /login. Always use the live browser origin.
      options: { redirectTo: callback },
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

      {process.env.NODE_ENV !== "production" && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 16,
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#5f646e",
            }}
          >
            Local demo — no Google needed
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href="/dev/login?as=host"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid rgba(59,130,246,0.32)",
                background: "rgba(59,130,246,0.13)",
                color: "#60a5fa",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Sign in as host
            </a>
            <a
              href="/dev/login?as=cleaner"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "#191b20",
                color: "#ededef",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Sign in as cleaner
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
