"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { WaitlistState } from "./waitlist/route";
import { track } from "@/lib/analytics";
import styles from "./landing.module.css";

const INITIAL: WaitlistState = { status: "idle" };
const FAILED: WaitlistState = {
  status: "error",
  message: "Something went wrong — please try again.",
};

/** POSTs to the stable /landing/waitlist route (not a Server Action — see the
 *  route for why). */
async function joinWaitlist(email: string): Promise<WaitlistState> {
  try {
    const res = await fetch("/landing/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const state = (await res.json()) as WaitlistState;
    return state?.status ? state : FAILED;
  } catch {
    return FAILED;
  }
}

/** Early-access sign-up (Round 6 join section). Posts to /landing/waitlist
 *  with pending + success/error states. */
export function LandingWaitlist({
  cta = "Get early access",
}: {
  cta?: string;
}) {
  const [state, setState] = useState<WaitlistState>(INITIAL);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setPending(true);
    setState(await joinWaitlist(email));
    setPending(false);
  }

  useEffect(() => {
    if (state.status === "ok") track("waitlist_joined");
  }, [state.status]);

  if (state.status === "ok" || state.status === "already") {
    return (
      <p className={styles.joinDone} role="status">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 12.5l4 4 9-10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {state.status === "already"
          ? "You’re already on the list."
          : "You’re on the list — we’ll be in touch."}
      </p>
    );
  }

  return (
    <div className={styles.joinWrap}>
      <form className={styles.joinForm} onSubmit={onSubmit}>
        <label htmlFor="tt-wl-email" className={styles.srOnly}>
          Email
        </label>
        <input
          id="tt-wl-email"
          name="email"
          className={styles.joinInput}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@yourrentals.com"
          disabled={pending}
        />
        <button className={styles.btnPrimary} type="submit" disabled={pending}>
          {pending ? "Joining…" : cta}
        </button>
      </form>
      {state.status === "error" && (
        <p role="alert" className={styles.joinErr}>
          {state.message}
        </p>
      )}
    </div>
  );
}
