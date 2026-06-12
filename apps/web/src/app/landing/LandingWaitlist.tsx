"use client";

import { useActionState, useEffect } from "react";
import { joinWaitlist, type WaitlistState } from "./actions";
import { track } from "@/lib/analytics";

const INITIAL: WaitlistState = { status: "idle" };

const srOnly = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  overflow: "hidden" as const,
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap" as const,
};

/** Glass-styled waitlist capture (hero + launch sections). Submits to the
 *  Supabase-backed `joinWaitlist` server action with loading + success/error
 *  states. Inherits text-align from its container so it stays centered in the
 *  launch CTA and left-aligned in the hero. */
export function LandingWaitlist({ cta = "Get early access" }: { cta?: string }) {
  const [state, formAction, pending] = useActionState(joinWaitlist, INITIAL);

  useEffect(() => {
    if (state.status === "ok") track("waitlist_joined");
  }, [state.status]);

  if (state.status === "ok" || state.status === "already") {
    return (
      <span className="vchip" role="status" style={{ marginTop: 26, padding: "8px 14px", fontSize: 13 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5l4 4 9-10" stroke="#34D399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {state.status === "already"
          ? "You’re already on the list."
          : "You’re on the list — we’ll be in touch."}
      </span>
    );
  }

  return (
    <>
      <form className="capture" action={formAction}>
        <label htmlFor="tt-wl-email" style={srOnly}>
          Work email
        </label>
        <input
          id="tt-wl-email"
          name="email"
          className="f"
          type="email"
          required
          placeholder="you@company.com"
          autoComplete="email"
          disabled={pending}
        />
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Joining…" : cta}
        </button>
      </form>
      {state.status === "error" && (
        <p role="alert" style={{ margin: "9px 2px 0", fontSize: 12.5, color: "#fca5a5" }}>
          {state.message}
        </p>
      )}
    </>
  );
}
