"use client";

import { useState, type FormEvent } from "react";

/** Glass-styled waitlist capture for the landing hero + launch sections.
 *  Phase 1: stashes the email in localStorage and shows a success state.
 *  Phase 2 (#34) swaps the submit handler for a Supabase-backed server action. */
export function LandingWaitlist({ cta = "Get early access" }: { cta?: string }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    try {
      const key = "tt_waitlist";
      const list = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
      list.push({ email: value, at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* localStorage unavailable — non-fatal */
    }
    setDone(true);
  }

  if (done) {
    return (
      <span className="vchip" role="status" style={{ marginTop: 26, padding: "8px 14px", fontSize: 13 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5l4 4 9-10" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        You&rsquo;re on the list — we&rsquo;ll be in touch.
      </span>
    );
  }

  return (
    <form className="capture" onSubmit={submit}>
      <label htmlFor="tt-wl-email" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        Work email
      </label>
      <input
        id="tt-wl-email"
        className="f"
        type="email"
        required
        placeholder="you@company.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn" type="submit">
        {cta}
      </button>
    </form>
  );
}
