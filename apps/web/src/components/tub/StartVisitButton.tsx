"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startVisit } from "@/lib/actions/visit";
import { visitPath } from "@/lib/app-routes";

/**
 * Start visit (spec §5.3): the explicit action that creates the draft (Lane 2's
 * `startVisit`; a second tap resumes the same draft), then opens the visit.
 */
export function StartVisitButton({ tubId }: { tubId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        const { visitId } = await startVisit(tubId);
        router.push(visitPath(visitId));
      } catch {
        setError("Couldn't start the visit. Try again.");
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        style={{
          height: 52,
          border: 0,
          borderRadius: 999,
          background: "var(--tt-action)",
          color: "#FFFFFF",
          fontSize: 17,
          fontWeight: 600,
          fontFamily: "inherit",
          opacity: pending ? 0.6 : 1,
        }}
      >
        {pending ? "Starting…" : "Start visit"}
      </button>
      {error && (
        <p role="alert" style={{ margin: 0, color: "var(--tt-due-text)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
