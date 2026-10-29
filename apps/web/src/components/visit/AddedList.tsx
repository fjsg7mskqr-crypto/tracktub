"use client";

import { useState } from "react";
import type { AddedProduct } from "@/lib/visit";

const input: React.CSSProperties = {
  minHeight: 48,
  borderRadius: 14,
  border: 0,
  background: "var(--tt-raised)",
  color: "var(--tt-text)",
  fontSize: 16,
  fontFamily: "inherit",
  padding: "0 14px",
  minWidth: 0,
};

/** "What you added": product + amount rows, then "Add a product". */
export function AddedList({
  added,
  onChange,
}: {
  added: AddedProduct[];
  onChange: (next: AddedProduct[]) => void;
}) {
  const [draft, setDraft] = useState<AddedProduct | null>(null);

  function save() {
    if (!draft || !draft.product.trim()) return;
    onChange([
      ...added,
      { product: draft.product.trim(), amount: draft.amount.trim() },
    ]);
    setDraft(null);
  }

  return (
    <div
      style={{
        background: "var(--tt-surface)",
        borderRadius: "var(--tt-radius-card)",
        padding: "8px 16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {added.map((a, i) => (
        <div
          key={`${a.product}-${i}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            minHeight: 52,
          }}
        >
          <span style={{ fontSize: 16 }}>{a.product}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{a.amount}</span>
            <button
              type="button"
              aria-label={`Remove ${a.product}`}
              onClick={() => onChange(added.filter((_, j) => j !== i))}
              style={{
                width: 44,
                height: 44,
                border: 0,
                background: "transparent",
                color: "var(--tt-text-3)",
                fontSize: 20,
                fontFamily: "inherit",
              }}
            >
              ×
            </button>
          </span>
        </div>
      ))}

      {draft ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "8px 0",
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}
          >
            <input
              aria-label="Product"
              placeholder="Product"
              autoFocus
              value={draft.product}
              onChange={(e) => setDraft({ ...draft, product: e.target.value })}
              style={input}
            />
            <input
              aria-label="Amount"
              placeholder="Amount"
              value={draft.amount}
              onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              style={input}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={!draft.product.trim()}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 999,
                border: 0,
                background: "var(--tt-action)",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
                opacity: draft.product.trim() ? 1 : 0.6,
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 999,
                border: 0,
                background: "var(--tt-raised)",
                color: "var(--tt-text)",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setDraft({ product: "", amount: "" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minHeight: 52,
            border: 0,
            background: "transparent",
            color: "var(--tt-link)",
            fontSize: 16,
            fontWeight: 500,
            fontFamily: "inherit",
            padding: 0,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add a product
        </button>
      )}
    </div>
  );
}
