import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { Mono, SectionHead } from "@/components/ui";
import { TeamInsightsHeader } from "@/components/TeamInsightsHeader";

function Gate({
  label,
  value,
  target,
  pass,
  hint,
}: {
  label: string;
  value: string;
  target: string;
  pass: boolean;
  hint: string;
}) {
  return (
    <div className="card pad">
      <div className="spread">
        <div className="label" style={{ marginBottom: 0 }}>
          {label}
        </div>
        <span className={pass ? "badge ok" : "badge warn"}>
          {pass ? "● on track" : "● below target"}
        </span>
      </div>
      <div
        className="row"
        style={{ alignItems: "baseline", gap: 8, marginTop: 6 }}
      >
        <Mono
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--text-hi)",
          }}
        >
          {value}
        </Mono>
        <div className="small dim">target {target}</div>
      </div>
      <div className="small muted" style={{ marginTop: 4 }}>
        {hint}
      </div>
    </div>
  );
}

const WEEKS = 4;

export default async function Insights() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const since = new Date(
    // eslint-disable-next-line react-hooks/purity -- async RSC; Date.now() is request-scoped on the server
    Date.now() - WEEKS * 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // All org-scoped by RLS: the user only ever sees their own workspace.
  const [{ data: properties }, { data: turnovers }, { data: events }] =
    await Promise.all([
      supabase.from("property").select("id, name"),
      supabase
        .from("turnover")
        .select(
          "id, property_id, submitted_at_server, photos:photo(id), issues:issue_tag(confirmed_at)"
        )
        .eq("status", "submitted_locked")
        .gte("submitted_at_server", since),
      supabase.from("proof_event").select("turnover_id, kind"),
    ]);

  const props = properties ?? [];
  const locked = turnovers ?? [];
  const evs = events ?? [];

  const complete = locked.filter((t) => (t.photos ?? []).length >= 4).length;
  const completePct = locked.length
    ? Math.round((complete / locked.length) * 100)
    : 0;
  const openIssues = locked.reduce(
    (n, t) => n + (t.issues ?? []).filter((i) => !i.confirmed_at).length,
    0
  );

  const lockedIds = new Set(locked.map((t) => t.id));
  const sharedIds = new Set(
    evs
      .filter((e) => e.kind === "share_copied" && lockedIds.has(e.turnover_id))
      .map((e) => e.turnover_id)
  );
  const opens = evs.filter((e) => e.kind === "link_opened").length;
  const sharePct = locked.length
    ? Math.round((sharedIds.size / locked.length) * 100)
    : 0;

  const perProperty = props.map((p) => {
    const count = locked.filter((t) => t.property_id === p.id).length;
    return { id: p.id, name: p.name, perWeek: (count / WEEKS).toFixed(1), count };
  });
  const maxPerProperty = Math.max(1, ...perProperty.map((p) => p.count));

  // Founder section: env allowlist gates rendering; the SECURITY DEFINER
  // founder_metrics() RPC re-checks the email server-side regardless.
  let founder: Record<string, number> | null = null;
  if (isAdminEmail(user.email)) {
    const { data } = await supabase.rpc("founder_metrics");
    founder = (data as Record<string, number>) ?? null;
  }

  const activationPct = founder?.orgs
    ? Math.round((founder.activated_orgs / founder.orgs) * 100)
    : 0;
  const retentionPct = founder?.activated_orgs
    ? Math.round((founder.retained_orgs / founder.activated_orgs) * 100)
    : 0;
  const founderSharePct = founder?.locked_turnovers
    ? Math.round((founder.shared_turnovers / founder.locked_turnovers) * 100)
    : 0;

  return (
    <div className="stack">
      <TeamInsightsHeader active="insights" />

      <p className="muted small" style={{ marginTop: -2 }}>
        Your workspace over the last {WEEKS} weeks — live from your turnover
        records.
      </p>

      <SectionHead>Workspace metrics</SectionHead>
      <div className="tiles">
        <div className="tile">
          <div className="k">Turnovers logged</div>
          <div className="v">
            <Mono>{locked.length}</Mono>
          </div>
          <div className="sub">guest-ready proofs on file</div>
        </div>
        <div className="tile">
          <div className="k">Complete 4-photo rate</div>
          <div className="v">
            <Mono>{locked.length ? `${completePct}%` : "—"}</Mono>
          </div>
          <div className="sub">full evidence sets</div>
        </div>
        <div className="tile">
          <div className="k">Proof links shared</div>
          <div className="v">
            <Mono>{locked.length ? `${sharePct}%` : "—"}</Mono>
          </div>
          <div className="sub">of turnovers, link copied or opened</div>
        </div>
        <div className="tile">
          <div className="k">Recipient opens</div>
          <div className="v">
            <Mono>{opens}</Mono>
          </div>
          <div className="sub">someone viewed a proof link</div>
        </div>
        <div className="tile">
          <div className="k">Open issues</div>
          <div
            className="v"
            style={{ color: openIssues ? "var(--warn)" : undefined }}
          >
            <Mono>{openIssues}</Mono>
          </div>
          <div className="sub">unconfirmed flags on recent visits</div>
        </div>
      </div>

      <SectionHead>Turnovers per property</SectionHead>
      <div className="card pad">
        {perProperty.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            No properties yet.
          </p>
        ) : (
          <div className="pbars">
            {perProperty.map((p) => (
              <div key={p.id} className="pbar-row">
                <div className="pbar-name">{p.name}</div>
                <div className="pbar-track">
                  <div
                    className="pbar-fill"
                    style={{
                      width: `${Math.round((p.count / maxPerProperty) * 100)}%`,
                    }}
                  />
                </div>
                <div className="pbar-num">
                  <b>{p.count}</b> in {WEEKS}w · {p.perWeek}/wk
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {founder && (
        <>
          <SectionHead as="h3">
            Founder view — validation gates (PRD §12 / §16)
          </SectionHead>
          <div
            className="grid"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            <Gate
              label="Activation"
              value={`${activationPct}%`}
              target="≥60%"
              pass={activationPct >= 60}
              hint={`Orgs with a locked turnover in their first week (${founder.activated_orgs}/${founder.orgs}).`}
            />
            <Gate
              label="Retention"
              value={`${retentionPct}%`}
              target="≥50%"
              pass={retentionPct >= 50}
              hint={`Activated orgs still submitting after week 1 (${founder.retained_orgs}/${founder.activated_orgs}).`}
            />
            <Gate
              label="Wedge — proof shared"
              value={`${founderSharePct}%`}
              target="≥30%"
              pass={founderSharePct >= 30}
              hint={`Locked turnovers whose proof link was shared (${founder.shared_turnovers}/${founder.locked_turnovers}).`}
            />
            <Gate
              label="Recipient opens"
              value={`${founder.total_opens}`}
              target="trend ↑"
              pass={founder.total_opens > 0}
              hint={`Proof links opened by recipients across ${founder.opened_turnovers} turnovers.`}
            />
            <Gate
              label="WTP intent"
              value={`${founder.wtp_intents}`}
              target="trend ↑"
              pass={founder.wtp_intents > 0}
              hint="Operators who joined the paid waitlist at the $12/mo fake-door."
            />
          </div>
          <p className="tiny dim">
            Cross-org founder view — PostHog has the cohort-accurate funnels.
            Reminder (PRD): this lean path tests <strong>use</strong>, not{" "}
            <strong>willingness-to-pay</strong>.
          </p>
        </>
      )}
    </div>
  );
}
