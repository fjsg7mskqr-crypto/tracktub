"use client";

import { useState, useTransition } from "react";
import { addToToday, removeFromToday } from "@/lib/actions/home";

/** "Add to today" on a status-board tile; "Remove" once it was added by hand. */
export function AddToToday({
  tubId,
  tubName,
  added,
}: {
  tubId: string;
  tubName: string;
  added: boolean;
}) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  const label = failed ? "Retry" : added ? "Remove from today" : "Add to today";
  return (
    <button
      type="button"
      aria-label={`${label}: ${tubName}`}
      disabled={pending}
      onClick={() => {
        setFailed(false);
        start(async () => {
          try {
            await (added ? removeFromToday(tubId) : addToToday(tubId));
          } catch {
            setFailed(true);
          }
        });
      }}
      style={{
        flex: "none",
        minHeight: "var(--tt-tap)",
        padding: "0 4px 0 10px",
        border: 0,
        background: "transparent",
        color: added ? "var(--tt-text-3)" : "var(--tt-link)",
        fontFamily: "inherit",
        fontSize: 13.5,
        fontWeight: 600,
        opacity: pending ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {pending ? "…" : added ? "Remove" : "+ Today"}
    </button>
  );
}
