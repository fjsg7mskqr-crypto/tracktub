"use client";

import { useState, type FormEvent } from "react";

/** Front-end-only waitlist capture for the (not-yet-deployed) landing draft.
 *  Stashes the email in localStorage and shows a success state.
 *  TODO(launch): POST to a real waitlist endpoint before this page ships. */
export function WaitlistForm() {
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
      /* localStorage unavailable — non-fatal in this draft */
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="note" style={{ borderColor: "var(--brand-blue-line)" }}>
        <strong>You&rsquo;re on the list.</strong> We&rsquo;ll reach out when
        TrackTub opens for new operators.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="row wrap" style={{ gap: 8 }}>
      <input
        className="input"
        type="email"
        required
        placeholder="you@company.com"
        aria-label="Work email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ maxWidth: 280 }}
      />
      <button className="btn primary" type="submit">
        Join the waitlist →
      </button>
    </form>
  );
}
