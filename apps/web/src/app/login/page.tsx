"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getURL } from "@/lib/url";

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
      options: { redirectTo: `${getURL()}/auth/callback` },
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
      {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
    </main>
  );
}
