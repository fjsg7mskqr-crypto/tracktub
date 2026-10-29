"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

/**
 * Shared body for the signed-in app's per-route `error.tsx` boundaries. A throw
 * during navigation must show something — never a silent dead tap (see
 * tests/error-boundary-coverage.test.ts).
 */
export function AppError({
  error,
  reset,
  title,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main style={{ padding: "48px 20px", maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>{title}</h1>
      <p
        style={{ lineHeight: 1.6, marginBottom: 22, color: "var(--tt-text-2)" }}
      >
        This screen failed to load. The error has been reported.
      </p>
      {error.digest && (
        <p
          style={{ fontSize: 13, marginBottom: 22, color: "var(--tt-text-3)" }}
        >
          Reference: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: "var(--tt-tap)",
            padding: "0 22px",
            borderRadius: 999,
            border: 0,
            background: "var(--tt-action)",
            color: "#fff",
            font: "inherit",
            fontWeight: 600,
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            minHeight: "var(--tt-tap)",
            padding: "0 22px",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            background: "var(--tt-raised)",
            color: "var(--tt-text)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Home
        </Link>
      </div>
    </main>
  );
}
