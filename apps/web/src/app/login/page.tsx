"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Functional sign-in — Google OAuth via Supabase. Plain elements + minimal
// inline styles; the UI/brand track restyles this once that foundation lands.
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
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
        Sign in to TrackTub
      </h1>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "#ededef",
          color: "#08090a",
          fontSize: 14,
          fontWeight: 600,
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" style={{ color: "#ef4444", fontSize: 13 }}>
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
