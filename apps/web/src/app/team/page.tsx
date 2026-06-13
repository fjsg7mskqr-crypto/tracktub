import { requireOperator } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  MemberRow,
  SectionHead,
  Tile,
  Tiles,
} from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { InviteModal, type PropertyOption } from "./InviteModal";
import { InviteRowActions } from "./InviteRowActions";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ProfileLite = { full_name: string | null; email: string | null } | null;

function profileName(p: ProfileLite, fallback = "A teammate"): string {
  if (!p) return fallback;
  return p.full_name?.trim() || p.email || fallback;
}

export default async function TeamPage() {
  const me = await requireOperator();
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - WEEK_MS).toISOString();

  const [
    { data: properties },
    { data: memberships },
    { data: assignments },
    { data: owners },
    { data: turnovers },
    { data: invites },
    { data: events },
  ] = await Promise.all([
    supabase.from("property").select("id, name").order("created_at"),
    supabase
      .from("membership")
      .select("user_id, role, created_at, profile:profile(full_name, email)")
      .eq("org_id", me.orgId),
    supabase.from("staff_assignment").select("property_id, staff_user_id"),
    supabase.from("property_owner").select("property_id, owner_user_id"),
    supabase
      .from("turnover")
      .select(
        "id, property_id, submitter_id, submitted_at_server, urgent, issue_tag(tag, confirmed_at)"
      )
      .eq("status", "submitted_locked")
      .order("submitted_at_server", { ascending: false }),
    supabase
      .from("invite")
      .select("id, role, email, property_ids, created_at")
      .is("accepted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("proof_event")
      .select("kind, occurred_at, actor_user_id")
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);

  const props = properties ?? [];
  const members = memberships ?? [];
  const locked = turnovers ?? [];

  const propName = new Map(props.map((p) => [p.id, p.name]));
  const nameOf = new Map<string, string>();
  for (const m of members) {
    nameOf.set(
      m.user_id,
      profileName(
        m.profile as ProfileLite,
        m.user_id === me.userId ? "You" : "A teammate"
      )
    );
  }

  // ── Coverage strip ─────────────────────────────────────────────────────────
  const recent = locked.filter((t) => (t.submitted_at_server ?? "") >= cutoff);
  const coveredPropertyIds = new Set(recent.map((t) => t.property_id));
  const coveredCount = props.filter((p) => coveredPropertyIds.has(p.id)).length;
  const allCovered = props.length > 0 && coveredCount === props.length;

  const turnoversThisWeek = recent.length;
  const byCleaners = recent.filter((t) => t.submitter_id !== me.userId).length;

  const openIssues = locked.reduce(
    (n, t) => n + (t.issue_tag ?? []).filter((i) => !i.confirmed_at).length,
    0
  );
  const urgentCount = locked.filter((t) => t.urgent).length;
  const needsEyes = openIssues + urgentCount;

  // ── People ─────────────────────────────────────────────────────────────────
  const assignedNames = (userId: string): string[] => {
    const staffProps = (assignments ?? [])
      .filter((a) => a.staff_user_id === userId)
      .map((a) => propName.get(a.property_id))
      .filter(Boolean) as string[];
    const ownerProps = (owners ?? [])
      .filter((o) => o.owner_user_id === userId)
      .map((o) => propName.get(o.property_id))
      .filter(Boolean) as string[];
    return [...new Set([...staffProps, ...ownerProps])];
  };

  const helperRow = (m: (typeof members)[number]) => {
    const mine = locked.filter((t) => t.submitter_id === m.user_id);
    const thisWeek = mine.filter(
      (t) => (t.submitted_at_server ?? "") >= cutoff
    ).length;
    const lastAt = mine[0]?.submitted_at_server ?? null;
    const propsList = assignedNames(m.user_id);
    const bits = [
      `${thisWeek} turnover${thisWeek === 1 ? "" : "s"} this week`,
      lastAt ? `last ${timeAgo(lastAt)}` : "none yet",
      propsList.length ? propsList.join(", ") : "no tubs assigned",
    ];
    return (
      <MemberRow
        key={m.user_id}
        name={nameOf.get(m.user_id) ?? "A teammate"}
        subtitle={bits.join(" · ")}
        badge={
          m.role === "staff" ? (
            <Badge variant="brand">Cleaner</Badge>
          ) : (
            <Badge>Viewer</Badge>
          )
        }
      />
    );
  };

  const you = members.find((m) => m.user_id === me.userId);
  const helpers = members.filter((m) => m.user_id !== me.userId);

  // ── Activity feed ──────────────────────────────────────────────────────────
  type FeedEvent = { at: string; text: string };
  const feed: FeedEvent[] = [];
  for (const t of locked) {
    if (!t.submitted_at_server) continue;
    const who = nameOf.get(t.submitter_id) ?? "A teammate";
    const where = propName.get(t.property_id) ?? "a property";
    feed.push({ at: t.submitted_at_server, text: `${who} captured ${where}` });
    const open = (t.issue_tag ?? []).find((i) => !i.confirmed_at);
    if (open) {
      feed.push({
        at: t.submitted_at_server,
        text: `${who} flagged ${open.tag} at ${where}`,
      });
    }
  }
  for (const m of helpers) {
    if (m.created_at) {
      feed.push({
        at: m.created_at,
        text: `${nameOf.get(m.user_id) ?? "Someone"} joined your team`,
      });
    }
  }
  for (const e of events ?? []) {
    if (e.kind === "share_copied") {
      const who = e.actor_user_id
        ? (nameOf.get(e.actor_user_id) ?? "You")
        : "You";
      feed.push({ at: e.occurred_at, text: `${who} shared a proof link` });
    } else if (e.kind === "link_opened") {
      feed.push({ at: e.occurred_at, text: "A proof link was opened" });
    }
  }
  feed.sort((a, b) => b.at.localeCompare(a.at));
  const recentFeed = feed.slice(0, 10);

  const propertyOptions: PropertyOption[] = props.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  return (
    <div className="stack">
      <div className="spread pagehead">
        <div>
          <h1>Team</h1>
          <p className="muted small">
            Who&apos;s keeping your tubs guest-ready — and proof they are.
          </p>
        </div>
        <InviteModal properties={propertyOptions} />
      </div>

      <Tiles>
        <Tile
          label="Coverage this week"
          value={`${coveredCount} / ${props.length}`}
          sub={
            allCovered ? (
              <span style={{ color: "var(--verified)" }}>● All captured</span>
            ) : (
              "properties captured in the last 7 days"
            )
          }
        />
        <Tile
          label="Turnovers this week"
          value={turnoversThisWeek}
          sub={`${byCleaners} by your cleaner${byCleaners === 1 ? "" : "s"}`}
        />
        <Tile
          label="Needs your eyes"
          value={needsEyes}
          sub={
            needsEyes > 0 ? (
              <span style={{ color: "var(--pending)" }}>
                ● open issues / urgent
              </span>
            ) : (
              "all clear"
            )
          }
        />
      </Tiles>

      <div
        className="grid"
        style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}
      >
        <div className="stack">
          <SectionHead>People</SectionHead>
          <Card>
            {you && (
              <MemberRow
                name={nameOf.get(me.userId) ?? "You"}
                subtitle={me.email ?? undefined}
                avatarVariant="blue"
                badge={<Badge variant="brand">Host</Badge>}
              />
            )}
            {helpers.map(helperRow)}
            {(invites ?? []).map((inv) => (
              <MemberRow
                key={inv.id}
                name={inv.email || "Invited helper"}
                subtitle={`${inv.role === "staff" ? "Cleaner" : "Viewer"} · invited ${timeAgo(inv.created_at)}`}
                badge={<Badge variant="warn">Pending</Badge>}
                actions={<InviteRowActions inviteId={inv.id} />}
              />
            ))}
            {helpers.length === 0 && (invites ?? []).length === 0 && (
              <p className="small muted" style={{ margin: "8px 2px" }}>
                No helpers yet. Invite your cleaner or a co-host to share the
                load.
              </p>
            )}
          </Card>
        </div>

        <div className="stack">
          <SectionHead>Recent activity</SectionHead>
          <Card>
            {recentFeed.length === 0 ? (
              <EmptyState>No activity yet.</EmptyState>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {recentFeed.map((e, i) => (
                  <div key={i} className="row" style={{ gap: 10 }}>
                    <Avatar name={e.text} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <div className="small">{e.text}</div>
                      <div className="tiny dim">{timeAgo(e.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
