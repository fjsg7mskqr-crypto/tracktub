import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APP_TIME_ZONE } from "@/lib/time";
import { tubPath } from "@/lib/app-routes";
import { SectionLabel } from "@/components/tub/SectionLabel";
import { HomeStartVisit } from "@/components/calendar/HomeStartVisit";
import {
  attentionList,
  calendarItems,
  weekCounts,
  type CalItem,
} from "@/components/calendar/calendar-model";
import {
  addDays,
  dayKey,
  dayParts,
  weekStart,
} from "@/components/calendar/days";
import { loadCareData, loadShareActivity } from "@/components/calendar/load";

const card: React.CSSProperties = {
  background: "var(--tt-surface)",
  color: "var(--tt-text)",
  textDecoration: "none",
};

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: APP_TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now)
  );
  return hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
}

function initials(name: string | null, email: string | null): string {
  const src = name?.trim() || email?.split("@")[0] || "";
  const parts = src.split(/\s+/).filter(Boolean);
  return (
    (parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : src.slice(0, 2)) || "·"
  ).toUpperCase();
}

const Dot = ({ color, size = 6 }: { color: string; size?: number }) => (
  <span
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: color,
      flex: "none",
    }}
  />
);

// Screen 2 (spec §2): today's strip, what needs attention, and this week.
// Stays dynamic: getCurrentMembership() reads the session cookie (CSP nonce).
export default async function Home() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const supabase = await createClient();
  const now = new Date();
  const today = dayKey(now);
  // A day of margin; weekCounts trims to the zone's Monday.
  const since = new Date(
    Date.parse(`${addDays(weekStart(today), -1)}T00:00:00Z`)
  ).toISOString();

  const [{ tubs, visits, drafts }, activity, { data: profile }] =
    await Promise.all([
      loadCareData(supabase),
      loadShareActivity(supabase, since),
      supabase
        .from("profile")
        .select("full_name")
        .eq("id", membership.userId)
        .maybeSingle(),
    ]);

  const fullName = profile?.full_name ?? null;
  const first = fullName?.trim().split(/\s+/)[0];
  const p = dayParts(today);

  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--tt-text-3)" }}>
          {p.weekday}, {p.month} {p.num}
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {greeting(now)}
          {first ? `, ${first}` : ""}
        </h1>
      </div>
      <span
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: "var(--tt-raised)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
          flex: "none",
        }}
      >
        {initials(fullName, membership.email)}
      </span>
    </div>
  );

  const main: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 26,
    padding: "32px 20px 24px",
    maxWidth: 560,
    margin: "0 auto",
  };

  if (tubs.length === 0)
    return (
      <main style={main}>
        {header}
        <section
          style={{
            ...card,
            borderRadius: "var(--tt-radius-card)",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            No tubs yet
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: "var(--tt-text-2)" }}>
            Add your first tub to start logging visits. Care due and your week
            show up here once you have.
          </p>
          <Link
            href="/tubs/new"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 48,
              borderRadius: 999,
              background: "var(--tt-action)",
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Add tub
          </Link>
        </section>
      </main>
    );

  const byDay = calendarItems(tubs, visits, now);
  const strip = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  // One line per tub with something today; a logged visit wins over care due.
  const todayLines = new Map<string, CalItem>();
  for (const it of byDay.get(today) ?? []) {
    const seen = todayLines.get(it.tubId);
    if (!seen || (seen.kind === "due" && it.kind === "logged"))
      todayLines.set(it.tubId, it);
  }
  const attention = attentionList(tubs, visits, now);
  const week = weekCounts({ visits, ...activity }, now);

  return (
    <main style={main}>
      {header}

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SectionLabel>Today</SectionLabel>
          <Link
            href="/calendar"
            style={{
              minHeight: "var(--tt-tap)",
              display: "flex",
              alignItems: "center",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--tt-link)",
              textDecoration: "none",
            }}
          >
            Calendar
          </Link>
        </div>
        <Link
          href="/calendar"
          aria-label="Open the calendar"
          style={{
            ...card,
            borderRadius: "var(--tt-radius-card)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <span
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 4,
              textAlign: "center",
            }}
          >
            {strip.map((k) => {
              const d = dayParts(k);
              const items = byDay.get(k) ?? [];
              const isToday = k === today;
              return (
                <span
                  key={k}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    padding: "6px 0",
                    borderRadius: 12,
                    background: isToday ? "#13233F" : undefined,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: isToday ? "#A9C9FF" : "var(--tt-text-3)",
                    }}
                  >
                    {d.dow}
                  </span>
                  <span
                    style={{ fontSize: 15, fontWeight: isToday ? 700 : 400 }}
                  >
                    {d.num}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      gap: 3,
                      justifyContent: "center",
                      minHeight: 6,
                    }}
                  >
                    {items.some((i) => i.kind === "logged") && (
                      <Dot color="var(--tt-brand)" />
                    )}
                    {items.some((i) => i.kind === "due") && (
                      <Dot color="var(--tt-due)" />
                    )}
                  </span>
                </span>
              );
            })}
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayLines.size === 0 ? (
              <span style={{ fontSize: 15, color: "var(--tt-text-2)" }}>
                Nothing logged or due today
              </span>
            ) : (
              [...todayLines.values()].map((it) => (
                <span
                  key={it.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 15,
                  }}
                >
                  <span>{it.tubName}</span>
                  <span
                    style={{
                      color:
                        it.kind === "due"
                          ? "var(--tt-due-text)"
                          : it.sent
                            ? "var(--tt-ok)"
                            : "var(--tt-text-2)",
                      textAlign: "right",
                    }}
                  >
                    {it.short}
                  </span>
                </span>
              ))
            )}
          </span>
        </Link>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>Needs attention</SectionLabel>
        {attention.length === 0 ? (
          <p style={{ margin: 0, fontSize: 15, color: "var(--tt-text-2)" }}>
            Nothing due this week.
          </p>
        ) : (
          attention.map((a) => (
            <div
              key={a.id}
              style={{
                ...card,
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 60,
                borderRadius: "var(--tt-radius-tile)",
                padding: "8px 8px 8px 14px",
              }}
            >
              <Link
                href={tubPath(a.tubId)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: "var(--tt-tap)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "var(--tt-text)",
                  textDecoration: "none",
                }}
              >
                <Dot
                  size={10}
                  color={a.tone === "due" ? "var(--tt-due)" : "#3A3F48"}
                />
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    {a.title}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--tt-text-2)" }}>
                    {a.detail}
                  </span>
                </span>
              </Link>
              {a.tone === "due" && (
                <HomeStartVisit
                  tubId={a.tubId}
                  tubName={tubs.find((t) => t.id === a.tubId)?.name ?? ""}
                  draftId={drafts.get(a.tubId) ?? null}
                />
              )}
            </div>
          ))
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionLabel>This week</SectionLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {(
            [
              [week.logged, "visits logged", null],
              [week.sent, "records sent", "/reports"],
              [week.opened, "opened by owners", "/reports"],
            ] as const
          ).map(([count, label, href]) => {
            const body = (
              <>
                <span style={{ fontSize: 26, fontWeight: 700 }}>{count}</span>
                <span style={{ fontSize: 13, color: "var(--tt-text-2)" }}>
                  {label}
                </span>
              </>
            );
            const style: React.CSSProperties = {
              ...card,
              borderRadius: "var(--tt-radius-tile)",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            };
            return href ? (
              <Link key={label} href={href} style={style}>
                {body}
              </Link>
            ) : (
              <div key={label} style={style}>
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
