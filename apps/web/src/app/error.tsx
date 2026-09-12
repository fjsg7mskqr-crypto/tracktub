"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Root route-segment error boundary.
 *
 * Until 2026-09-11 the app had NO `error.tsx` anywhere — only `global-error`,
 * which replaces the root layout and therefore only catches throws originating
 * in that layout. Without a boundary in the segment tree, a server component
 * that throws during a CLIENT-SIDE navigation makes the router abort silently:
 * the screen does not change, nothing is logged where the user can see it, and
 * the tap looks ignored. Whatever caused the 2026-09-02 dead tap, failing that
 * way is unacceptable on its own.
 */
export default function Error({
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
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>Something went wrong</h1>
      <p className="muted" style={{ lineHeight: 1.6, marginBottom: 22 }}>
        This screen failed to load. The error has been reported.
      </p>
      {error.digest && (
        <p className="small muted" style={{ marginBottom: 22 }}>
          Reference: {error.digest}
        </p>
      )}
      <button type="button" className="btn primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
