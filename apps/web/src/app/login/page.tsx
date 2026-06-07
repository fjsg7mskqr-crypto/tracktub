"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Functional M1 login — plain elements + minimal inline styles. The UI/brand
// track restyles this with shadcn/Tailwind once that foundation lands.
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setPending(false);
    if (error) setError(error.message);
    else setSent(true);
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
      {sent ? (
        <p style={{ color: "#8a8f98" }}>
          Check your email for a sign-in link.
        </p>
      ) : (
        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "#131417",
              color: "#ededef",
              fontSize: 14,
            }}
          />
          <button
            type="submit"
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
            {pending ? "Sending…" : "Email me a sign-in link"}
          </button>
          {error && (
            <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>
          )}
        </form>
      )}
    </main>
  );
}
