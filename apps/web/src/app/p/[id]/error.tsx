"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

/**
 * Error boundary for the property subtree, including the capture flow.
 *
 * Separate from the root boundary because this is where an operator is mid-job:
 * a generic "something went wrong" is the wrong message when they are standing
 * at a tub wondering whether their photos survived. Reassure, then offer both
 * a retry and a way back.
 */
export default function PropertyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main style={{ padding: "48px 20px", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>This tub failed to load</h1>
      <p className="muted" style={{ lineHeight: 1.6, marginBottom: 22 }}>
        Anything already saved to this turnover is still there. Try again, or go
        back and reopen it.
      </p>
      {error.digest && (
        <p className="small muted" style={{ marginBottom: 22 }}>
          Reference: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn ghost">
          All tubs
        </Link>
      </div>
    </main>
  );
}
