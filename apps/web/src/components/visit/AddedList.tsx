"use client";

import { useState } from "react";
import type { AddedProduct } from "@/lib/visit";

const keyOf = (product: string) => product.trim().toLocaleLowerCase();

const QUICK_AMOUNTS = [
  "1 oz",
  "2 oz",
  "3 oz",
  "4 oz",
  "1 tbsp",
  "2 tbsp",
  "3 tbsp",
  "1/4 cup",
  "1/2 cup",
  "1 cup",
];

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
  boxSizing: "border-box",
};

function AmountSheet({
  product,
  initialAmount,
  editing,
  onSave,
  onRemove,
  onClose,
}: {
  product: string;
  initialAmount: string;
  editing: boolean;
  onSave: (amount: string) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(initialAmount);
  const picks = [
    ...(initialAmount ? [initialAmount] : []),
    ...QUICK_AMOUNTS.filter((pick) => pick !== initialAmount),
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-amount-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgba(3, 3, 4, 0.8)",
      }}
    >
      <button
        type="button"
        aria-label="Close amount sheet"
        onClick={onClose}
        style={{ flex: 1, border: 0, background: "transparent" }}
      />
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "92dvh",
          overflowY: "auto",
          margin: "0 auto",
          padding: "12px 20px calc(24px + env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          background: "var(--tt-surface)",
          borderRadius: "28px 28px 0 0",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            alignSelf: "center",
            width: 40,
            height: 5,
            borderRadius: 999,
            background: "#3A3F48",
          }}
        />
        <h2
          id="product-amount-title"
          style={{ margin: 0, fontSize: 22, fontWeight: 700 }}
        >
          {product}
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
          {picks.map((pick) => (
            <button
              key={pick}
              type="button"
              aria-pressed={amount === pick}
              onClick={() => setAmount(pick)}
              style={{
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 999,
                border: 0,
                background: amount === pick ? "#1E3A6B" : "var(--tt-raised)",
                color: amount === pick ? "var(--tt-text)" : "#C4C8CF",
                fontSize: 15,
                fontWeight: 500,
                fontFamily: "inherit",
              }}
            >
              {pick}
            </button>
          ))}
        </div>
        <input
          aria-label="Amount"
          inputMode="decimal"
          type="text"
          placeholder="Amount (e.g. 3 oz)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ ...input, width: "100%" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => onSave(amount.trim())}
            style={{
              flex: "1 1 120px",
              minHeight: 52,
              borderRadius: 999,
              border: 0,
              background: "var(--tt-action)",
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            {editing ? "Save" : "Add"}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: "1 1 120px",
              minHeight: 52,
              borderRadius: 999,
              border: 0,
              background: "var(--tt-raised)",
              color: "var(--tt-text)",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
        </div>
        {editing && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              minHeight: 44,
              border: 0,
              background: "transparent",
              color: "var(--tt-due-text)",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

/** Tap a product to choose an amount; selected chips show what will be saved. */
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
  const [sheet, setSheet] = useState<{
    product: string;
    amount: string;
    editing: boolean;
  } | null>(null);
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
    onChange([
      ...added.filter((a) => keyOf(a.product) !== keyOf(product)),
      { product, amount: draft.amount.trim() },
    ]);
    setDraft(null);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        {products.map((suggestion) => {
          const selected = added.find(
            (a) => keyOf(a.product) === keyOf(suggestion.product)
          );
          return (
            <button
              key={keyOf(suggestion.product)}
              type="button"
              aria-pressed={Boolean(selected)}
              onClick={() => {
                setDraft(null);
                setSheet({
                  product: selected?.product ?? suggestion.product,
                  amount: selected?.amount ?? suggestion.amount,
                  editing: Boolean(selected),
                });
              }}
              style={{
                minHeight: 44,
                maxWidth: "100%",
                padding: "8px 16px",
                borderRadius: 999,
                border: 0,
                background: selected ? "#1E3A6B" : "var(--tt-raised)",
                color: selected ? "var(--tt-text)" : "#C4C8CF",
                fontSize: 15,
                fontWeight: 500,
                fontFamily: "inherit",
                overflowWrap: "anywhere",
                boxSizing: "border-box",
              }}
            >
              {selected && <span aria-hidden="true">✓ </span>}
              {suggestion.product}
              {selected?.amount ? ` · ${selected.amount}` : ""}
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Other product"
          aria-expanded={draft !== null}
          onClick={() => setDraft(draft ? null : { product: "", amount: "" })}
          style={{
            minHeight: 44,
            maxWidth: "100%",
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
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 0,
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
                minHeight: 44,
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
                minHeight: 44,
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
      {sheet && (
        <AmountSheet
          product={sheet.product}
          initialAmount={sheet.amount}
          editing={sheet.editing}
          onSave={(amount) => {
            onChange([
              ...added.filter((a) => keyOf(a.product) !== keyOf(sheet.product)),
              { product: sheet.product, amount },
            ]);
            setSheet(null);
          }}
          onRemove={() => {
            onChange(
              added.filter((a) => keyOf(a.product) !== keyOf(sheet.product))
            );
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
