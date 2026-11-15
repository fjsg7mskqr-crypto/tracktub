"use client";

import { useState } from "react";
import type { AddedProduct } from "@/lib/visit";

const keyOf = (product: string) => product.trim().toLocaleLowerCase();

const input: React.CSSProperties = {
  minHeight: 44,
  borderRadius: 14,
  border: 0,
  background: "var(--tt-raised)",
  color: "var(--tt-text)",
  fontSize: 16,
  fontFamily: "inherit",
  padding: "0 14px",
  minWidth: 0,
};

function AmountInput({
  product,
  amount,
  onCommit,
}: {
  product: string;
  amount: string;
  onCommit: (amount: string) => void;
}) {
  return (
    <input
      aria-label={`Amount for ${product}`}
      placeholder="Amount"
      defaultValue={amount}
      onBlur={(e) => {
        if (e.currentTarget.value !== amount) onCommit(e.currentTarget.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={{ ...input, width: "100%", minHeight: 40, fontSize: 14 }}
    />
  );
}

/** Tap a product as with Work completed; selected amounts edit in place. */
export function AddedList({
  added,
  suggestions,
  onChange,
}: {
  added: AddedProduct[];
  suggestions: AddedProduct[];
  onChange: (next: AddedProduct[]) => void;
}) {
  const [draft, setDraft] = useState<AddedProduct | null>(null);
  const known = new Set(suggestions.map((s) => keyOf(s.product)));
  const products = [
    ...suggestions,
    ...added.filter((a) => {
      const key = keyOf(a.product);
      if (known.has(key)) return false;
      known.add(key);
      return true;
    }),
  ];

  function saveOther() {
    if (!draft?.product.trim()) return;
    const product = draft.product.trim();
    const next = { product, amount: draft.amount.trim() };
    onChange([
      ...added.filter((a) => keyOf(a.product) !== keyOf(product)),
      next,
    ]);
    setDraft(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {products.map((suggestion) => {
          const selected = added.find(
            (a) => keyOf(a.product) === keyOf(suggestion.product)
          );
          const on = Boolean(selected);
          return (
            <div
              key={keyOf(suggestion.product)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxWidth: "100%",
              }}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange(
                    on
                      ? added.filter(
                          (a) => keyOf(a.product) !== keyOf(suggestion.product)
                        )
                      : [...added, suggestion]
                  )
                }
                style={{
                  minHeight: 44,
                  padding: "0 16px",
                  borderRadius: 999,
                  border: 0,
                  background: on ? "#1E3A6B" : "var(--tt-raised)",
                  color: on ? "var(--tt-text)" : "#C4C8CF",
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: "inherit",
                }}
              >
                {on && <span aria-hidden="true">✓ </span>}
                {suggestion.product}
              </button>
              {selected && (
                <AmountInput
                  key={`${selected.product}:${selected.amount}`}
                  product={selected.product}
                  amount={selected.amount}
                  onCommit={(amount) =>
                    onChange(
                      added.map((a) =>
                        keyOf(a.product) === keyOf(selected.product)
                          ? { ...a, amount: amount.trim() }
                          : a
                      )
                    )
                  }
                />
              )}
            </div>
          );
        })}
        <button
          type="button"
          aria-label="Other product"
          aria-expanded={draft !== null}
          onClick={() => setDraft(draft ? null : { product: "", amount: "" })}
          style={{
            minHeight: 44,
            padding: "0 16px",
            borderRadius: 999,
            border: 0,
            background: "var(--tt-raised)",
            color: "#C4C8CF",
            fontSize: 15,
            fontWeight: 500,
            fontFamily: "inherit",
          }}
        >
          Other
        </button>
      </div>
      {draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveOther();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
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
      )}
    </div>
  );
}
