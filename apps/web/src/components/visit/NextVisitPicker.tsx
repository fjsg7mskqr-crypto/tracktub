"use client";

import { useTimeZone } from "@/components/app/TimeZone";
import { useState } from "react";
import { dayKey, dayParts } from "@/components/calendar/days";
import {
  NEXT_VISIT_PICKS,
  NEXT_VISIT_REASON_MAX,
  pickDate,
  pickFor,
  type NextVisitPickId,
} from "@/lib/next-visit";

/** "Mon, Nov 23" for a day key. */
export function dayLabel(key: string): string {
  const p = dayParts(key);
  return `${p.dow}, ${p.month} ${p.num}`;
}

const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 48,
  padding: "0 16px",
  borderRadius: 999,
  border: 0,
  background: on ? "var(--tt-action)" : "var(--tt-raised)",
  color: on ? "#FFFFFF" : "var(--tt-text)",
  fontSize: 16,
  fontWeight: 600,
  fontFamily: "inherit",
});

const field: React.CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: 0,
  background: "var(--tt-surface)",
  color: "var(--tt-text)",
  fontSize: 16, // 16px keeps iOS Safari from zooming on focus
  padding: "0 14px",
  fontFamily: "inherit",
};

/**
 * Finish step: "Next visit" quick picks plus an optional reason. Saves as the
 * pick or reason changes; None clears it.
 */
export function NextVisitPicker({
  value,
  onSave,
}: {
  value: { dueOn: string; reason: string } | null;
  onSave: (dueOn: string | null, reason: string) => void;
}) {
  const tz = useTimeZone();
  const [now] = useState(() => new Date());
  const today = dayKey(now, tz);
  const [pick, setPick] = useState<NextVisitPickId>(
    pickFor(value?.dueOn ?? null, now, tz)
  );
  const [date, setDate] = useState(value?.dueOn ?? "");
  const [reason, setReason] = useState(value?.reason ?? "");

  function choose(next: NextVisitPickId) {
    setPick(next);
    if (next === "none") return onSave(null, "");
    if (next === "date") return date ? onSave(date, reason) : undefined;
    onSave(pickDate(next, now, tz), reason);
  }

  const dueOn = pick === "date" ? date : pickDate(pick, now, tz);

  return (
    <section
      aria-label="Next visit"
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 600 }}>Next visit</h3>
      <p style={{ margin: 0, fontSize: 14, color: "var(--tt-text-2)" }}>
        Schedule a re-check. It shows on the Calendar and on Home that day.
      </p>
      <div
        role="radiogroup"
        aria-label="When"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {NEXT_VISIT_PICKS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={pick === p.id}
            onClick={() => choose(p.id)}
            style={chip(pick === p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {pick === "date" && (
        <input
          type="date"
          aria-label="Next visit date"
          min={today}
          value={date}
          onChange={(e) => {
            const v = e.target.value;
            setDate(v);
            if (v && v >= today) onSave(v, reason);
          }}
          style={field}
        />
      )}
      {pick !== "none" && (
        <>
          <input
            type="text"
            aria-label="Reason for the next visit"
            placeholder="Why? e.g. Re-check foaming"
            maxLength={NEXT_VISIT_REASON_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => {
              if (dueOn && dueOn >= today) onSave(dueOn, reason);
            }}
            style={field}
          />
          {dueOn && (
            <p
              role="status"
              style={{ margin: 0, fontSize: 14, color: "var(--tt-ok)" }}
            >
              ✓ Scheduled for {dayLabel(dueOn)}
            </p>
          )}
        </>
      )}
    </section>
  );
}
