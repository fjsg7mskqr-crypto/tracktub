"use client";

import { useState } from "react";

const FlagIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    aria-hidden="true"
  >
    <path d="M5 21V4h11l-2 4 2 4H5" />
  </svg>
);

const pill = (primary: boolean): React.CSSProperties => ({
  flex: 1,
  height: 44,
  borderRadius: 999,
  border: 0,
  background: primary ? "var(--tt-action)" : "var(--tt-raised)",
  color: primary ? "#FFFFFF" : "var(--tt-text)",
  fontSize: 15,
  fontWeight: 600,
  fontFamily: "inherit",
});

/** "Flag something for the owner": one short note the record calls out. */
export function OwnerFlag({
  flag,
  onSave,
}: {
  flag: string | null;
  onSave: (flag: string | null) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  if (editing !== null) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(editing.trim() || null);
          setEditing(null);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <label
          htmlFor="owner-flag"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--tt-due-text)",
          }}
        >
          <FlagIcon />
          For the owner
        </label>
        <textarea
          id="owner-flag"
          rows={2}
          autoFocus
          value={editing}
          placeholder="What should the owner know? e.g. cover strap is torn"
          onChange={(e) => setEditing(e.target.value)}
          style={{
            borderRadius: 18,
            border: "2px solid rgba(232,163,61,0.45)",
            background: "var(--tt-surface)",
            color: "var(--tt-text)",
            fontSize: 16,
            padding: 14,
            fontFamily: "inherit",
            resize: "none",
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={pill(true)}>
            Save flag
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            style={pill(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (flag) {
    return (
      <div
        style={{
          background: "rgba(232,163,61,0.10)",
          borderRadius: 18,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--tt-due-text)",
          }}
        >
          <FlagIcon />
          Flagged for the owner
        </span>
        <p style={{ margin: 0, fontSize: 16 }}>{flag}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setEditing(flag)}
            style={pill(false)}
          >
            Edit flag
          </button>
          <button
            type="button"
            onClick={() => onSave(null)}
            style={pill(false)}
          >
            Remove flag
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing("")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        minHeight: 48,
        border: 0,
        background: "transparent",
        color: "var(--tt-due-text)",
        fontSize: 15,
        fontWeight: 600,
        fontFamily: "inherit",
        padding: 0,
      }}
    >
      <FlagIcon />
      Flag something for the owner
    </button>
  );
}
