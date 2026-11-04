"use client";

import { useState, useTransition } from "react";
import { settleOpenItem } from "@/lib/actions/home";
import type { OpenItem } from "./open-items";

/**
 * One open item as a checkbox row (Home tile / focus card). A tap settles it —
 * at the tub's open visit when there is one — and it drops off on refresh.
 */
export function OpenItemCheck({
  item,
  draftId,
}: {
  item: OpenItem;
  draftId: string | null;
}) {
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={`Settle: ${item.title}`}
      disabled={done || pending}
      onClick={() => {
        setFailed(false);
        setDone(true);
        start(async () => {
          try {
            await settleOpenItem(item.id, draftId);
          } catch {
            setDone(false);
            setFailed(true);
          }
        });
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        minHeight: "var(--tt-tap)",
        padding: 0,
        border: 0,
        background: "transparent",
        color: done ? "var(--tt-text-3)" : "var(--tt-text)",
        fontFamily: "inherit",
        fontSize: 14,
        textAlign: "left",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18,
          height: 18,
          flex: "none",
          borderRadius: 5,
          border: done ? 0 : "1.5px solid #4B5160",
          background: done ? "var(--tt-ok)" : "transparent",
          color: "#08090A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {done && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.4"
          >
            <path d="M5 12l5 5 9-10" />
          </svg>
        )}
      </span>
      <span
        style={{
          minWidth: 0,
          textDecoration: done ? "line-through" : undefined,
        }}
      >
        {item.title}
        {item.note && (
          <span style={{ color: "var(--tt-text-2)" }}>: {item.note}</span>
        )}
      </span>
      {failed && (
        <span
          role="alert"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "var(--tt-due-text)",
          }}
        >
          Not saved
        </span>
      )}
    </button>
  );
}
