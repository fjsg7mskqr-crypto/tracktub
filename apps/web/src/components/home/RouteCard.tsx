"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { recordPath, visitPath } from "@/lib/app-routes";
import { StartVisitButton } from "@/components/tub/StartVisitButton";
import { Chip } from "./Chip";
import { OpenItemCheck } from "./OpenItemCheck";
import type { Chip as ChipData, ProgressStep, RouteStop } from "./home-model";
import type { OpenItem } from "./open-items";

/** What the focus card shows for one stop (built on the server). */
export type StopFocus = {
  tubId: string;
  name: string;
  kind: "working" | "next" | "later" | "done";
  /** "Working on · started 1:34 PM", "Up next", "Done · 10:42 AM". */
  kicker: string;
  chip: { text: string; tone: ChipData["tone"] | "info" } | null;
  progress: ProgressStep[] | null;
  /** "Lakeview Rentals · last visit 4 days ago". */
  subline: string | null;
  items: OpenItem[];
  bring: string[];
  countdown: string | null;
  draftId: string | null;
  doneVisitId: string | null;
};

/** Short stop names: first word, unless two stops would share it. */
function shortNames(stops: readonly RouteStop[]): Map<string, string> {
  const first = (n: string) => n.trim().split(/\s+/)[0] ?? n;
  const counts = new Map<string, number>();
  for (const s of stops)
    counts.set(first(s.name), (counts.get(first(s.name)) ?? 0) + 1);
  return new Map(
    stops.map((s) => [
      s.tubId,
      counts.get(first(s.name))! > 1 ? s.name : first(s.name),
    ])
  );
}

const STOP_W = 76;

/**
 * Today's route: a strip of stops with connecting lines, and the focus card
 * hanging under the selected stop (Working on / Up next). Tapping a stop shows
 * its card; the card's button starts, resumes or opens that visit.
 */
export function RouteCard({
  stops,
  focus,
  initial,
}: {
  stops: RouteStop[];
  focus: Record<string, StopFocus>;
  /** The stop the card opens on; null keeps it closed until a tap. */
  initial: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(initial);
  const strip = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<number | null>(null);
  const names = shortNames(stops);
  const idx = stops.findIndex((s) => s.tubId === selected);
  const card = selected ? focus[selected] : undefined;

  // Point the card's arrow at the selected stop (the strip may scroll).
  useLayoutEffect(() => {
    const el = strip.current;
    if (!el || idx < 0) return;
    const place = () => {
      const dot = el.querySelectorAll<HTMLElement>("[data-stop]")[idx];
      if (dot) setPointer(dot.offsetLeft + dot.offsetWidth / 2 - el.scrollLeft);
    };
    place();
    el.addEventListener("scroll", place, { passive: true });
    return () => el.removeEventListener("scroll", place);
  }, [idx, stops.length]);

  return (
    <div
      style={{
        background: "var(--tt-surface)",
        border: "1px solid #232A38",
        borderRadius: "var(--tt-radius-card)",
        overflow: "hidden",
      }}
    >
      <div
        ref={strip}
        role="list"
        aria-label="Stops"
        style={{
          display: "flex",
          alignItems: "flex-start",
          padding: "14px 8px 12px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}
      >
        {stops.map((s, i) => {
          const done = s.state === "done";
          const cur = s.state === "current";
          const isSel = s.tubId === selected;
          const ring =
            s.problem && !done ? "var(--tt-alert)" : "var(--tt-brand)";
          return (
            <div key={s.tubId} role="listitem" style={{ display: "contents" }}>
              <button
                type="button"
                data-stop
                aria-pressed={isSel}
                aria-label={`${s.name}, ${s.label}${s.problem ? ", needs attention" : ""}`}
                onClick={() => setSelected(s.tubId)}
                style={{
                  flex: stops.length > 4 ? `0 0 ${STOP_W}px` : `1 1 0`,
                  minWidth: STOP_W - 8,
                  minHeight: 64,
                  padding: "2px 2px 0",
                  border: 0,
                  background: "transparent",
                  color: "var(--tt-text-3)",
                  fontFamily: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  position: "relative",
                }}
              >
                {i > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: 11,
                      right: "50%",
                      width: "100%",
                      height: 2,
                      background:
                        stops[i - 1].state === "done" && (done || cur)
                          ? "var(--tt-brand)"
                          : "#2B303C",
                    }}
                  />
                )}
                <span
                  aria-hidden="true"
                  style={{
                    position: "relative",
                    width: cur ? 20 : 16,
                    height: cur ? 20 : 16,
                    marginTop: cur ? 0 : 2,
                    borderRadius: 999,
                    boxSizing: "border-box",
                    border: `2.5px solid ${ring}`,
                    background: done ? "var(--tt-brand)" : "var(--tt-bg)",
                    boxShadow: cur
                      ? `0 0 0 5px ${s.problem ? "rgba(242,102,94,0.22)" : "rgba(59,130,246,0.24)"}`
                      : undefined,
                  }}
                />
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: cur ? "var(--tt-link)" : "var(--tt-text)",
                    maxWidth: STOP_W - 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 3,
                  }}
                >
                  {names.get(s.tubId)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    lineHeight: 1.2,
                    color:
                      s.problem && !done
                        ? "var(--tt-alert-text)"
                        : "var(--tt-text-3)",
                  }}
                >
                  {s.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {card && <FocusPanel card={card} pointer={pointer} />}
    </div>
  );
}

function FocusPanel({
  card,
  pointer,
}: {
  card: StopFocus;
  pointer: number | null;
}) {
  const button: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 999,
    background: "var(--tt-action)",
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: 600,
    textDecoration: "none",
  };
  return (
    <section
      aria-label={card.kicker}
      style={{
        position: "relative",
        borderTop: "1px solid #232A38",
        background: "#171B24",
        padding: "16px 16px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {pointer !== null && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -7,
            left: Math.max(14, pointer - 6),
            width: 12,
            height: 12,
            background: "#171B24",
            borderLeft: "1px solid #232A38",
            borderTop: "1px solid #232A38",
            transform: "rotate(45deg)",
          }}
        />
      )}
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: card.kind === "done" ? "var(--tt-text-3)" : "var(--tt-link)",
        }}
      >
        {card.kicker}
      </span>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          {card.name}
        </h3>
        {card.chip && <Chip text={card.chip.text} tone={card.chip.tone} />}
      </div>
      {card.subline && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--tt-text-2)" }}>
          {card.subline}
        </p>
      )}
      {card.progress && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            margin: "4px 0 2px",
          }}
        >
          <div style={{ display: "flex", gap: 5 }}>
            {card.progress.map((p) => (
              <span
                key={p.key}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 9,
                  background: p.done ? "var(--tt-brand)" : "#2B303C",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--tt-text-3)",
            }}
          >
            {card.progress.map((p) => (
              <span
                key={p.key}
                style={{ color: p.done ? "var(--tt-text-2)" : undefined }}
              >
                {p.label}
                {p.done ? " ✓" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
      {card.items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {card.items.map((it) => (
            <OpenItemCheck key={it.id} item={it} draftId={card.draftId} />
          ))}
        </div>
      )}
      {card.bring.length > 0 && (
        <p style={{ margin: 0, fontSize: 14, color: "#C9CCD3" }}>
          <b style={{ fontWeight: 600 }}>Bring:</b> {card.bring.join(", ")}
        </p>
      )}
      {card.countdown && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--tt-text-3)" }}>
          {card.countdown}
        </p>
      )}
      <div style={{ marginTop: 6 }}>
        {card.kind === "working" && card.draftId ? (
          <Link href={visitPath(card.draftId)} style={button}>
            Resume visit
          </Link>
        ) : card.kind === "done" && card.doneVisitId ? (
          <Link
            href={recordPath(card.doneVisitId)}
            style={{
              ...button,
              background: "var(--tt-raised)",
              color: "var(--tt-text)",
            }}
          >
            Open record
          </Link>
        ) : (
          <StartVisitButton tubId={card.tubId} />
        )}
      </div>
    </section>
  );
}
