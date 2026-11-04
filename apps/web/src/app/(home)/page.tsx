import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership, getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { APP_TIME_ZONE, formatShortDate, formatTime } from "@/lib/time";
import { loadTubs } from "@/app/tubs/load";
import { SectionLabel } from "@/components/tub/SectionLabel";
import { dayKey, dayParts, daysBetween } from "@/components/calendar/days";
import {
  boardOrder,
  boardState,
  careCountdown,
  focusCard,
  lastReading,
  ringState,
  todaysRoute,
  visitProgress,
  type HomeDraft,
  type HomeTub,
  type HomeVisit,
  type ReportState,
  type RouteStop,
} from "@/components/home/home-model";
import { bringList, type OpenItem } from "@/components/home/open-items";
import {
  loadHomeDrafts,
  loadHomeVisits,
  loadOpenItems,
  loadRouteStops,
} from "@/components/home/load";
import { RouteCard, type StopFocus } from "@/components/home/RouteCard";
import { BoardTile, type TileData } from "@/components/home/BoardTile";

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

/** The signed-in user's own name, if they set one. */
async function loadProfileName(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profile")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  return data?.full_name ?? null;
}

const REPORT: Record<ReportState, string> = {
  not_sent: "Report not sent",
  sent: "Sent",
  opened: "Host opened report",
};

function groupBy<T extends { tubId: string }>(
  xs: readonly T[]
): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(x.tubId, [...(m.get(x.tubId) ?? []), x]);
  return m;
}

function lastVisitText(visits: readonly HomeVisit[], today: string): string {
  const newest = visits.reduce<HomeVisit | null>(
    (a, v) => (!a || v.at > a.at ? v : a),
    null
  );
  if (!newest) return "no visits yet";
  const days = daysBetween(dayKey(newest.at), today);
  return days <= 0
    ? "last visit today"
    : days === 1
      ? "last visit yesterday"
      : `last visit ${days} days ago`;
}

/** The focus card for one route stop. */
function stopFocus(
  stop: RouteStop,
  tub: HomeTub,
  ctx: {
    visits: HomeVisit[];
    items: OpenItem[];
    draft: HomeDraft | undefined;
    now: Date;
    today: string;
    problem: ReturnType<typeof boardState>["problem"];
  }
): StopFocus {
  const { visits, items, draft, now, today, problem } = ctx;
  const done = visits.find((v) => v.id === stop.doneVisitId);
  const base = {
    tubId: tub.id,
    name: tub.name,
    items,
    draftId: stop.draftId,
    doneVisitId: stop.doneVisitId,
  };
  if (draft) {
    const p = visitProgress(draft);
    return {
      ...base,
      kind: "working",
      kicker: `${stop.state === "current" ? "Working on" : "In progress"} · started ${formatTime(draft.openedAt)}`,
      chip: { text: `${p.done} of ${p.steps.length} steps`, tone: "info" },
      progress: p.steps,
      subline: tub.clientName,
      bring: [],
      countdown: null,
    };
  }
  if (stop.state === "done")
    return {
      ...base,
      kind: "done",
      kicker: `Done · ${done ? formatTime(done.at) : ""}`,
      chip: problem ? { text: problem.chipWithDay, tone: "alert" } : null,
      progress: null,
      subline: tub.clientName,
      bring: [],
      countdown: careCountdown(tub, visits, now),
    };
  return {
    ...base,
    kind: stop.state === "current" ? "next" : "later",
    kicker: stop.state === "current" ? "Up next" : "Later today",
    chip: problem ? { text: problem.chipWithDay, tone: "alert" } : null,
    progress: null,
    subline: [tub.clientName, lastVisitText(visits, today)]
      .filter(Boolean)
      .join(" · "),
    bring: bringList(items, lastReading(visits)),
    countdown: careCountdown(tub, visits, now),
  };
}

function SectionHead({ title, aside }: { title: string; aside?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
      }}
    >
      <SectionLabel>{title}</SectionLabel>
      {aside && (
        <span style={{ fontSize: 13, color: "var(--tt-text-3)" }}>{aside}</span>
      )}
    </div>
  );
}

// Screen 2, rebuilt (2026-11-04 status-board design): today's route with the
// Working on / Up next card, then every tub worst first. One round of reads.
// Stays dynamic: getCurrentMembership() reads the session cookie (CSP nonce).
export default async function Home() {
  const supabase = await createClient();
  const now = new Date();
  const today = dayKey(now);

  // The membership check and every read run together (the reads are RLS-
  // scoped); the profile row is found by the same verified user id.
  const [
    membership,
    tubRows,
    allVisits,
    allDrafts,
    allItems,
    allAdded,
    fullName,
  ] = await Promise.all([
    getCurrentMembership(),
    loadTubs(supabase),
    loadHomeVisits(supabase),
    loadHomeDrafts(supabase),
    loadOpenItems(supabase),
    loadRouteStops(supabase, today),
    loadProfileName(supabase),
  ]);
  if (!membership) redirect("/login");

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
      <Link
        href="/people"
        aria-label="People and account"
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: "var(--tt-raised)",
          color: "var(--tt-text)",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
          flex: "none",
        }}
      >
        {initials(fullName, membership.email)}
      </Link>
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

  if (tubRows.length === 0)
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
            Add your first tub to start logging visits. Today&apos;s route and
            every tub&apos;s condition show up here once you have.
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

  const tubs: HomeTub[] = tubRows;
  const ids = new Set(tubs.map((t) => t.id));
  const visits = allVisits.filter((v) => ids.has(v.tubId));
  const drafts = allDrafts.filter((d) => ids.has(d.tubId));
  const items = allItems.filter((i) => ids.has(i.tubId));
  const added = allAdded.filter((id) => ids.has(id));
  const visitsOf = groupBy(visits);
  const itemsOf = groupBy(items);
  const draftOf = new Map<string, HomeDraft>();
  for (const d of [...drafts].sort(
    (a, b) => b.openedAt.getTime() - a.openedAt.getTime()
  ))
    if (!draftOf.has(d.tubId)) draftOf.set(d.tubId, d);

  const route = todaysRoute({ tubs, visits, drafts, added, now });
  const focus = focusCard(route);
  const onRoute = new Set(route.map((s) => s.tubId));
  const entries = tubs.map((t) =>
    boardState(t, visitsOf.get(t.id) ?? [], itemsOf.get(t.id) ?? [], now)
  );
  const byId = new Map(tubs.map((t) => [t.id, t]));

  const cards: Record<string, StopFocus> = {};
  for (const s of route) {
    const tub = byId.get(s.tubId)!;
    cards[s.tubId] = stopFocus(s, tub, {
      visits: visitsOf.get(s.tubId) ?? [],
      items: itemsOf.get(s.tubId) ?? [],
      draft: s.draftId ? draftOf.get(s.tubId) : undefined,
      now,
      today,
      problem: entries.find((e) => e.tubId === s.tubId)?.problem ?? null,
    });
  }

  const tiles: TileData[] = boardOrder(entries).map((entry) => {
    const tub = byId.get(entry.tubId)!;
    const own = visitsOf.get(tub.id) ?? [];
    const newest = own.reduce<HomeVisit | null>(
      (a, v) => (!a || v.at > a.at ? v : a),
      null
    );
    const visitedToday = newest && dayKey(newest.at) === today ? newest : null;
    return {
      entry,
      ring: ringState(tub, own, now),
      subline:
        [
          tub.clientName,
          visitedToday
            ? `visited today ${formatTime(visitedToday.at)}`
            : onRoute.has(tub.id)
              ? "on today's route"
              : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      items: itemsOf.get(tub.id) ?? [],
      footer: newest
        ? [
            visitedToday
              ? "Last visit today"
              : `Last visit ${formatShortDate(newest.at, APP_TIME_ZONE)}`,
            REPORT[newest.report],
          ]
        : null,
      draftId: draftOf.get(tub.id)?.id ?? null,
      onRoute: onRoute.has(tub.id),
      added: added.includes(tub.id),
    };
  });

  const needsYou = entries.filter((e) => e.state === "problem").length;
  const doneCount = route.filter((s) => s.state === "done").length;
  const summary: [number, string, string | undefined][] = [
    [needsYou, "needs you", needsYou ? "var(--tt-alert-text)" : undefined],
    [
      items.length,
      "left open",
      items.length ? "var(--tt-due-text)" : undefined,
    ],
    [tubs.length, tubs.length === 1 ? "tub" : "tubs", undefined],
  ];

  return (
    <main style={main}>
      {header}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          marginTop: -8,
        }}
      >
        {summary.map(([count, label, color]) => (
          <div
            key={label}
            style={{
              ...card,
              borderRadius: "var(--tt-radius-tile)",
              padding: "12px 8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 700, color }}>
              {count}
            </span>
            <span style={{ fontSize: 13, color: "var(--tt-text-2)" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionHead
          title="Today's route"
          aside={
            route.length ? `${doneCount} of ${route.length} done` : undefined
          }
        />
        {route.length === 0 ? (
          <p
            style={{
              ...card,
              margin: 0,
              borderRadius: "var(--tt-radius-tile)",
              padding: 16,
              fontSize: 15,
              color: "var(--tt-text-2)",
            }}
          >
            Nothing on today&apos;s route. Tubs with care due land here on their
            own; add any tub with + Today below.
          </p>
        ) : (
          <RouteCard
            stops={route}
            focus={cards}
            initial={focus?.tubId ?? null}
          />
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SectionHead title="Status board" aside="worst first" />
        {tiles.map((t) => (
          <BoardTile key={t.entry.tubId} tile={t} />
        ))}
      </section>
    </main>
  );
}
