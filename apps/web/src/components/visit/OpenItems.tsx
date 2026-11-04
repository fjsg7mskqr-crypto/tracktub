"use client";

import { useState } from "react";
import {
  OPEN_ITEM_KINDS,
  type OpenItemKind,
  type RecheckSuggestion,
} from "@/components/home/open-items";
import { formatShortDate } from "@/lib/time";
import type { VisitOpenItem } from "@/lib/visit";

type Status = "settled" | "open" | "dismissed";

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  minHeight: 56,
  padding: "4px 4px 4px 6px",
  borderRadius: "var(--tt-radius-tile)",
  background: "var(--tt-surface)",
};

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 22,
        height: 22,
        flex: "none",
        borderRadius: 7,
        border: on ? 0 : "2px solid #4B5160",
        background: on ? "var(--tt-ok)" : "transparent",
        color: "#08090A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
        >
          <path d="M5 12l5 5 9-10" />
        </svg>
      )}
    </span>
  );
}

function Remove({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        flex: "none",
        border: 0,
        borderRadius: 999,
        background: "transparent",
        color: "var(--tt-text-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function ItemText({ item }: { item: VisitOpenItem }) {
  const settled = item.status === "settled";
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
        textAlign: "left",
      }}
    >
      <span
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: settled ? "var(--tt-text-2)" : "var(--tt-text)",
          textDecoration: settled ? "line-through" : undefined,
        }}
      >
        {item.title}
      </span>
      <span style={{ fontSize: 13, color: "var(--tt-text-3)" }}>
        {[
          item.note,
          settled
            ? "settled this visit"
            : `left ${formatShortDate(item.openedAt)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </span>
    </span>
  );
}

/**
 * Top of the visit: what was left open last time. Tap to settle (tap again to
 * undo); × when it's no longer needed. Never blocks finishing.
 */
export function LeftOpen({
  items,
  onSetStatus,
}: {
  items: VisitOpenItem[];
  onSetStatus: (id: string, status: Status) => void;
}) {
  if (items.length === 0) return null;
  const open = items.filter((i) => i.status === "open").length;
  return (
    <section
      aria-label="Left open last time"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 15,
          fontWeight: 600,
          color: "var(--tt-due-text)",
        }}
      >
        Left open last time
        {open > 0 ? ` · ${open} to settle` : " · all settled"}
      </h2>
      {items.map((it) => {
        const settled = it.status === "settled";
        return (
          <div key={it.id} style={row}>
            <button
              type="button"
              role="checkbox"
              aria-checked={settled}
              aria-label={`Settled: ${it.title}`}
              onClick={() => onSetStatus(it.id, settled ? "open" : "settled")}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 48,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 8px",
                border: 0,
                background: "transparent",
                color: "inherit",
                fontFamily: "inherit",
              }}
            >
              <Check on={settled} />
              <ItemText item={it} />
            </button>
            {!settled && (
              <Remove
                label={`No longer needed: ${it.title}`}
                onClick={() => onSetStatus(it.id, "dismissed")}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}

const chip = (on: boolean): React.CSSProperties => ({
  height: 44,
  padding: "0 16px",
  borderRadius: 999,
  border: 0,
  background: on ? "#1E3A6B" : "var(--tt-raised)",
  color: on ? "var(--tt-text)" : "#C4C8CF",
  fontSize: 15,
  fontWeight: 500,
  fontFamily: "inherit",
});

const input: React.CSSProperties = {
  height: 48,
  borderRadius: 14,
  border: 0,
  background: "var(--tt-surface)",
  color: "var(--tt-text)",
  fontSize: 16,
  padding: "0 14px",
  fontFamily: "inherit",
};

/**
 * "Leave for next time": quick chips (+ optional note) and, when the as-left
 * reading is out of range, a one-tap "Re-check <reading>" suggestion. Items
 * left at this visit are listed with × to take one back.
 */
export function LeaveForNext({
  left,
  suggestions,
  onLeave,
  onSetStatus,
}: {
  left: VisitOpenItem[];
  suggestions: RecheckSuggestion[];
  onLeave: (kind: OpenItemKind, text: string, note: string) => void;
  onSetStatus: (id: string, status: Status) => void;
}) {
  const [kind, setKind] = useState<OpenItemKind | null>(null);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const needsText = kind === "other" && text.trim() === "";

  function leave() {
    if (!kind || needsText) return;
    onLeave(kind, text, note);
    setKind(null);
    setText("");
    setNote("");
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h3
        style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#C4C8CF" }}
      >
        Leave for next time
      </h3>
      {suggestions.map((s) => (
        <button
          key={s.field}
          type="button"
          onClick={() => onLeave("recheck", s.title, s.note)}
          style={{
            ...chip(false),
            alignSelf: "flex-start",
            background: "rgba(232,163,61,0.14)",
            color: "var(--tt-due-text)",
            fontWeight: 600,
          }}
        >
          + {s.title}{" "}
          <span style={{ fontWeight: 400 }}>({s.note.toLowerCase()})</span>
        </button>
      ))}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {OPEN_ITEM_KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            aria-pressed={kind === k.kind}
            onClick={() => setKind(kind === k.kind ? null : k.kind)}
            style={chip(kind === k.kind)}
          >
            {k.label}
          </button>
        ))}
      </div>
      {kind && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {kind === "other" && (
            <input
              aria-label="What's left open"
              placeholder="What's left open?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={input}
            />
          )}
          <input
            aria-label="Note (optional)"
            placeholder={
              kind === "part" ? "Which part? (optional)" : "Note (optional)"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={input}
          />
          <button
            type="button"
            onClick={leave}
            disabled={needsText}
            style={{
              height: 48,
              borderRadius: 999,
              border: 0,
              background: "var(--tt-raised)",
              color: "var(--tt-text)",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "inherit",
              opacity: needsText ? 0.5 : 1,
            }}
          >
            Leave it open
          </button>
        </div>
      )}
      {left.map((it) => (
        <div key={it.id} style={{ ...row, paddingLeft: 14 }}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 16, fontWeight: 600 }}>
              {it.title}
            </span>
            <span style={{ fontSize: 13, color: "var(--tt-text-3)" }}>
              {it.note ? `${it.note} · ` : ""}for next time
            </span>
          </span>
          <Remove
            label={`Take back: ${it.title}`}
            onClick={() => onSetStatus(it.id, "dismissed")}
          />
        </div>
      ))}
    </section>
  );
}
