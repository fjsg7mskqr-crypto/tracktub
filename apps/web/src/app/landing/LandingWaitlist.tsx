"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { WaitlistState } from "./waitlist/route";
import { track } from "@/lib/analytics";
import { MAX_TUB_COUNT, WAITLIST_ROLES } from "@/lib/waitlist";
import styles from "./landing.module.css";

const INITIAL: WaitlistState = { status: "idle" };
const FAILED: WaitlistState = {
  status: "error",
  message: "Something went wrong — please try again.",
};

/** POSTs to the stable /landing/waitlist route (not a Server Action — see the
 *  route for why). */
async function joinWaitlist(extra: {
  email: string;
  role: string;
  tubs: string;
}): Promise<WaitlistState> {
  try {
    const res = await fetch("/landing/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(extra),
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
    const data = new FormData(e.currentTarget);
    setPending(true);
    setState(
      await joinWaitlist({
        email: String(data.get("email") ?? ""),
        role: String(data.get("role") ?? ""),
        tubs: String(data.get("tubs") ?? ""),
      })
    );
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
        <div className={styles.joinOptional}>
          <div className={styles.joinField}>
            <label htmlFor="tt-wl-role" className={styles.joinLabel}>
              I’m a… <span>(optional)</span>
            </label>
            <select
              id="tt-wl-role"
              name="role"
              className={styles.joinInput}
              defaultValue=""
              disabled={pending}
            >
              <option value="">Choose one</option>
              {WAITLIST_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.joinField}>
            <label htmlFor="tt-wl-tubs" className={styles.joinLabel}>
              How many tubs? <span>(optional)</span>
            </label>
            <input
              id="tt-wl-tubs"
              name="tubs"
              className={styles.joinInput}
              type="number"
              min={0}
              max={MAX_TUB_COUNT}
              step={1}
              inputMode="numeric"
              placeholder="e.g. 6"
              disabled={pending}
            />
          </div>
        </div>
      </form>
      {state.status === "error" && (
        <p role="alert" className={styles.joinErr}>
          {state.message}
        </p>
      )}
    </div>
  );
}
