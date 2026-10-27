"use client";

import { useState } from "react";
import {
  READING_FIELDS,
  READING_TARGETS,
  inRange,
  type ReadingField,
  type ReadingKind,
} from "@/lib/readings";
import type { ReadingValues, VisitSnapshot } from "@/lib/visit";
import { Clock } from "./Clock";
import {
  accept,
  bump,
  initSheet,
  toValues,
  type SheetState,
} from "./reading-sheet-state";

const fmt = (f: ReadingField, v: number) =>
  v.toFixed(READING_TARGETS[f].decimals);
const target = (f: ReadingField) =>
  `${READING_TARGETS[f].lo}–${READING_TARGETS[f].hi}`;

const HINT: Record<ReadingKind, { withSuggestion: string; none: string }> = {
  found: {
    withSuggestion:
      "Greyed numbers are last visit's. Tap one if the strip matches, or nudge it with − / +. Amber = out of range.",
    none: "Use − / + to set what the strip shows. Rows you don't touch stay blank. Amber = out of range.",
  },
  left: {
    withSuggestion:
      "Greyed numbers are what you found this visit — nudge each to what the strip shows now. Amber = out of range.",
    none: "Log the reading as found first, or set each row with − / +. Amber = out of range.",
  },
};

/** Screen 7: bottom sheet for the as-found / as-left reading. */
export function ReadingSheet({
  snapshot,
  initialKind,
  onLog,
  onClose,
}: {
  snapshot: VisitSnapshot;
  initialKind: ReadingKind;
  onLog: (kind: ReadingKind, values: ReadingValues) => Promise<void>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ReadingKind>(initialKind);
  const [sheets, setSheets] = useState<Record<ReadingKind, SheetState>>(() => ({
    found: initSheet(snapshot.found, snapshot.previous?.found ?? null),
    left: initSheet(snapshot.left, snapshot.found),
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheet = sheets[kind];
  const update = (next: SheetState) =>
    setSheets((s) => ({ ...s, [kind]: next }));
  const hasSuggestion = READING_FIELDS.some(
    (f) => sheet[f].suggestion !== null
  );

  async function log() {
    setBusy(true);
    setError(null);
    try {
      await onLog(kind, toValues(sheet));
    } catch {
      setError("Couldn't save the reading. Check your signal and try again.");
    } finally {
      setBusy(false);
    }
  }

  const tab = (on: boolean): React.CSSProperties => ({
    height: 44,
    borderRadius: 999,
    border: 0,
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 600,
    background: on ? "var(--tt-action)" : "transparent",
    color: on ? "#FFFFFF" : "var(--tt-text-3)",
  });
  const round: React.CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: 999,
    border: 0,
    background: "#22252C",
    color: "var(--tt-text)",
    fontSize: 26,
    fontFamily: "inherit",
    flex: "none",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reading-sheet-title"
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
        aria-label="Close"
        onClick={onClose}
        style={{ flex: 1, border: 0, background: "transparent" }}
      />
      <div
        style={{
          background: "var(--tt-surface)",
          borderRadius: "28px 28px 0 0",
          padding: "12px 20px calc(24px + env(safe-area-inset-bottom))",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
          maxWidth: 560,
          margin: "0 auto",
          boxSizing: "border-box",
          maxHeight: "92dvh",
          overflowY: "auto",
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h2
            id="reading-sheet-title"
            style={{ margin: 0, fontSize: 22, fontWeight: 700 }}
          >
            Log a reading
          </h2>
          <span style={{ fontSize: 13, color: "var(--tt-text-3)" }}>
            <Clock iso={new Date()} /> · {snapshot.propertyName}
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Which reading"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 6,
            background: "var(--tt-bg)",
            borderRadius: 999,
            padding: 4,
          }}
        >
          {(["found", "left"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              style={tab(kind === k)}
            >
              {k === "found" ? "As found" : "As left"}
            </button>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 14, color: "var(--tt-text-3)" }}>
          {hasSuggestion ? HINT[kind].withSuggestion : HINT[kind].none}
        </p>

        {READING_FIELDS.map((f) => {
          const t = READING_TARGETS[f];
          const row = sheet[f];
          const shown = row.set ? row.value : row.suggestion;
          const out = row.set && inRange(f, row.value) === false;
          const found = snapshot.found?.[f] ?? null;
          const sub =
            kind === "left" && found !== null
              ? `found ${fmt(f, found)} · target ${target(f)}`
              : `target ${target(f)}`;
          return (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minHeight: 64,
              }}
            >
              <span
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: 17, fontWeight: 600 }}>{t.label}</span>
                <span style={{ fontSize: 12, color: "var(--tt-text-3)" }}>
                  {sub}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Lower ${t.label}`}
                onClick={() => update(bump(sheet, f, -1))}
                style={round}
              >
                −
              </button>
              <button
                type="button"
                aria-label={
                  shown === null
                    ? `${t.label} not set`
                    : `Use ${fmt(f, shown)} for ${t.label}`
                }
                onClick={() => update(accept(sheet, f))}
                style={{
                  width: 72,
                  minHeight: 44,
                  border: 0,
                  background: "transparent",
                  fontFamily: "inherit",
                  textAlign: "center",
                  fontSize: 24,
                  fontWeight: row.set ? 700 : 500,
                  color: out
                    ? "var(--tt-due-text)"
                    : row.set
                      ? "var(--tt-text)"
                      : "var(--tt-text-3)",
                  padding: 0,
                }}
              >
                {shown === null ? "—" : fmt(f, shown)}
              </button>
              <button
                type="button"
                aria-label={`Raise ${t.label}`}
                onClick={() => update(bump(sheet, f, 1))}
                style={round}
              >
                +
              </button>
            </div>
          );
        })}

        {error && (
          <p role="alert" style={{ margin: 0, color: "var(--tt-due-text)" }}>
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={log}
          disabled={busy}
          style={{
            height: 56,
            borderRadius: 999,
            border: 0,
            background: "var(--tt-action)",
            color: "#FFFFFF",
            fontSize: 17,
            fontWeight: 600,
            fontFamily: "inherit",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "Saving…" : "Log it"}
        </button>
      </div>
    </div>
  );
}
