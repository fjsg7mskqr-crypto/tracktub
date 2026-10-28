import Link from "next/link";
import { recordPath, visitPath } from "@/lib/app-routes";
import { formatShortDate, formatTime } from "@/lib/time";
import {
  draftEntries,
  isPartial,
  stillToLog,
  visitEnd,
  visitHeadline,
  type LogVisit,
} from "@/components/tub/log";
import { SectionLabel } from "@/components/tub/SectionLabel";
import { StartVisitButton } from "@/components/tub/StartVisitButton";

const rail: React.CSSProperties = {
  width: 12,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  flex: "none",
};

function span(v: LogVisit): string {
  const start = formatTime(v.at);
  const end = visitEnd(v);
  const endText = end && end > v.at ? formatTime(end) : null;
  return endText && endText !== start ? `${start} – ${endText}` : start;
}

function PastVisit({ v }: { v: LogVisit }) {
  const partial = isPartial(v);
  return (
    <div style={{ display: "flex", gap: 14 }}>
      <div style={rail} aria-hidden="true">
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "#3A3F48",
            marginTop: 6,
          }}
        />
        <span style={{ flex: 1, width: 2, background: "#1E2026" }} />
      </div>
      <Link
        href={recordPath(v.id)}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "var(--tt-tap)",
          paddingBottom: 20,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          color: "var(--tt-text)",
          textDecoration: "none",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--tt-text-3)" }}>
          {formatShortDate(v.at)} · {span(v)} ·{" "}
          <span
            style={{ color: partial ? "var(--tt-due-text)" : "var(--tt-ok)" }}
          >
            {partial ? "partial" : "locked"}
          </span>
        </span>
        <span style={{ fontSize: 15, color: "#C4C8CF" }}>
          {visitHeadline(v)}
        </span>
      </Link>
    </div>
  );
}

const card: React.CSSProperties = {
  borderRadius: "var(--tt-radius-tile)",
  background: "var(--tt-surface)",
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

function OpenVisit({ v, now }: { v: LogVisit; now: Date }) {
  const day =
    formatShortDate(v.at) === formatShortDate(now)
      ? "Today"
      : formatShortDate(v.at);
  const missing = stillToLog(v);
  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          paddingBottom: 14,
        }}
      >
        <div style={{ ...rail, justifyContent: "center" }} aria-hidden="true">
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "var(--tt-brand)",
            }}
          />
        </div>
        <h3
          style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#A9C9FF" }}
        >
          {day} · visit open since {formatTime(v.at)}
        </h3>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <div style={rail} aria-hidden="true">
          <span style={{ flex: 1, width: 2, background: "#1E3A6B" }} />
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Render-only list, never reordered: index keys are safe. */}
          {draftEntries(v).map((e, i) => (
            <div key={`${i}-${e.title}`} style={card}>
              <span style={{ fontSize: 12, color: "var(--tt-text-3)" }}>
                {e.at ? `${formatTime(e.at)} · ${e.title}` : e.title}
              </span>
              {e.chips && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {e.chips.map((c) => (
                    <span
                      key={c.text}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        fontSize: 14,
                        background: c.out
                          ? "rgba(232, 163, 61, 0.14)"
                          : "var(--tt-raised)",
                        color: c.out ? "var(--tt-due-text)" : "var(--tt-text)",
                        fontWeight: c.out ? 600 : 400,
                      }}
                    >
                      {c.text}
                    </span>
                  ))}
                </div>
              )}
              {e.text && <span style={{ fontSize: 15 }}>{e.text}</span>}
            </div>
          ))}
          {missing.length > 0 && (
            <div
              style={{
                ...card,
                background: "transparent",
                border: "1px dashed #2A4A80",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 12, color: "#A9C9FF" }}>
                Still to log
              </span>
              <span style={{ fontSize: 15, color: "#C4C8CF" }}>
                {missing.join(" · ")}
              </span>
            </div>
          )}
          <PrimaryLink href={visitPath(v.id)}>Continue visit</PrimaryLink>
        </div>
      </div>
    </>
  );
}

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
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
      }}
    >
      {children}
    </Link>
  );
}

/**
 * Log (spec §5.3), newest at the top: the open visit's entries + Continue
 * visit (or Start visit) pinned first, then locked visits one line each →
 * record, newest first. Phone testing: oldest-first buried the latest visit at
 * the bottom of a long page.
 */
export function TubLog({
  tubId,
  visits,
  now,
}: {
  tubId: string;
  /** Any order; the Log sorts them. */
  visits: readonly LogVisit[];
  now: Date;
}) {
  const past = visits
    .filter((v) => v.status === "submitted_locked")
    .sort((a, b) => b.at.getTime() - a.at.getTime());
  const open = [...visits].reverse().find((v) => v.status === "draft") ?? null;

  return (
    <section style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 16 }}>
        <SectionLabel>Log</SectionLabel>
      </div>
      {past.length === 0 && !open && (
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            color: "var(--tt-text-2)",
          }}
        >
          No visits yet
        </p>
      )}
      <div style={{ marginBottom: past.length > 0 ? 24 : 0 }}>
        {open ? (
          <OpenVisit v={open} now={now} />
        ) : (
          <StartVisitButton tubId={tubId} />
        )}
      </div>
      {past.map((v) => (
        <PastVisit key={v.id} v={v} />
      ))}
    </section>
  );
}
