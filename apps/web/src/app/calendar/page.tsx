import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  calendarItems,
  type CalItem,
} from "@/components/calendar/calendar-model";
import {
  VIEWS,
  calendarHref,
  calendarRange,
  parseView,
} from "@/components/calendar/calendar-view";
import { dayKey, dayParts } from "@/components/calendar/days";
import { loadCareData } from "@/components/calendar/load";

const DOT = { due: "var(--tt-due)", logged: "var(--tt-brand)" } as const;

const Dot = ({ kind, size }: { kind: CalItem["kind"]; size: number }) => (
  <span
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: DOT[kind],
      flex: "none",
    }}
  />
);

const navLink: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "var(--tt-tap)",
  height: "var(--tt-tap)",
  borderRadius: 999,
  background: "var(--tt-surface)",
  color: "var(--tt-text)",
  fontSize: 15,
  fontWeight: 600,
  textDecoration: "none",
};

function countLabel(items: CalItem[], month: boolean): string {
  const logged = items.filter((i) => i.kind === "logged").length;
  if (month) return `${logged} ${logged === 1 ? "visit" : "visits"} logged`;
  return `${items.length - logged} due · ${logged} logged`;
}

// Screen 3 (spec §3, D28): visits logged and care due — nothing else. No
// bookings, guest times, assigning or dispatch. Stays dynamic:
// getCurrentMembership() reads the session cookie (CSP nonce).
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; d?: string }>;
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const q = await searchParams;
  const now = new Date();
  const today = dayKey(now);
  const range = calendarRange(parseView(q.view), q.d, today);
  const isMonth = range.view === "month";

  const supabase = await createClient();
  const { tubs, visits } = await loadCareData(supabase);
  const byDay = calendarItems(tubs, visits, now);
  const shown = range.cells.flatMap((k) => (k ? (byDay.get(k) ?? []) : []));

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: "32px 20px 24px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--tt-text-3)" }}>
            {range.label}
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Calendar
          </h1>
        </div>
        <span style={{ fontSize: 13, color: "var(--tt-text-3)" }}>
          {countLabel(shown, isMonth)}
        </span>
      </div>

      <nav
        aria-label="Calendar view"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 4,
          background: "var(--tt-surface)",
          borderRadius: 999,
          padding: 4,
        }}
      >
        {VIEWS.map((v) => {
          const on = v.id === range.view;
          return (
            <Link
              key={v.id}
              href={calendarHref(v.id, range.anchor)}
              aria-current={on ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "var(--tt-tap)",
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                background: on ? "var(--tt-action)" : "transparent",
                color: on ? "#FFFFFF" : "var(--tt-text-2)",
              }}
            >
              {v.label}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 12,
            color: "var(--tt-text-2)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Dot kind="due" size={8} />
            Care due
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Dot kind="logged" size={8} />
            Visit logged
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Link href={range.prev} aria-label="Previous" style={navLink}>
            ‹
          </Link>
          {!range.containsToday && (
            <Link
              href={calendarHref(range.view, today)}
              style={{ ...navLink, padding: "0 14px" }}
            >
              Today
            </Link>
          )}
          <Link href={range.next} aria-label="Next" style={navLink}>
            ›
          </Link>
        </div>
      </div>

      {isMonth ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            aria-hidden="true"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 4,
              fontSize: 12,
              color: "var(--tt-text-3)",
              textAlign: "center",
            }}
          >
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 4,
            }}
          >
            {range.cells.map((k, i) => {
              if (!k) return <span key={`pad-${i}`} />;
              const items = byDay.get(k) ?? [];
              const isToday = k === today;
              const logged = items.filter((x) => x.kind === "logged").length;
              const due = items.length - logged;
              const p = dayParts(k);
              return (
                <Link
                  key={k}
                  href={calendarHref("day", k)}
                  aria-label={`${p.weekday}, ${p.month} ${p.num}${
                    items.length ? `: ${due} due, ${logged} logged` : ""
                  }`}
                  style={{
                    minHeight: 52,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    textDecoration: "none",
                    background: isToday ? "#13233F" : "var(--tt-surface)",
                    border: isToday
                      ? "1px solid #2A4A80"
                      : "1px solid transparent",
                    color: isToday ? "var(--tt-text)" : "#C4C8CF",
                  }}
                >
                  <span style={{ fontSize: 13 }}>{p.num}</span>
                  <span
                    style={{
                      display: "flex",
                      gap: 3,
                      justifyContent: "center",
                      minHeight: 6,
                    }}
                  >
                    {items.slice(0, 4).map((x) => (
                      <Dot key={x.id} kind={x.kind} size={6} />
                    ))}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {range.cells.map((k) => {
            if (!k) return null;
            const items = byDay.get(k) ?? [];
            const isToday = k === today;
            const p = dayParts(k);
            return (
              <section
                key={k}
                aria-label={`${p.weekday}, ${p.month} ${p.num}`}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "8px 10px 8px 0",
                  borderRadius: 18,
                  background: isToday ? "#0F1626" : undefined,
                }}
              >
                <div
                  style={{
                    width: 44,
                    flex: "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    paddingTop: 2,
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--tt-text-3)" }}>
                    {p.dow}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: isToday ? "var(--tt-link)" : "var(--tt-text)",
                    }}
                  >
                    {p.num}
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    minWidth: 0,
                  }}
                >
                  {items.length === 0 ? (
                    <span
                      style={{
                        fontSize: 14,
                        color: "#5A5F6A",
                        padding: "8px 0",
                      }}
                    >
                      {k < today ? "Nothing logged" : "Nothing due"}
                    </span>
                  ) : (
                    items.map((it) => (
                      <Link
                        key={it.id}
                        href={it.href}
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          minHeight: "var(--tt-tap)",
                          padding: "10px 12px",
                          borderRadius: 14,
                          textDecoration: "none",
                          color: "var(--tt-text)",
                          background:
                            it.kind === "due" ? "var(--tt-surface)" : "#0F1012",
                        }}
                      >
                        <span style={{ marginTop: 5, display: "flex" }}>
                          <Dot kind={it.kind} size={10} />
                        </span>
                        <span
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            minWidth: 0,
                          }}
                        >
                          <span style={{ fontSize: 15, fontWeight: 600 }}>
                            {it.tubName}
                          </span>
                          <span
                            style={{ fontSize: 13, color: "var(--tt-text-2)" }}
                          >
                            {it.what}
                          </span>
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--tt-text-3)" }}>
        Due dates are suggestions from your own history — how often you drain,
        change filters and visit each tub.
      </p>
    </main>
  );
}
