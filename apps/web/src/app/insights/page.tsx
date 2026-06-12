import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.03em" }}>
          {value}
        </div>
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
    return { name: p.name, perWeek: (count / WEEKS).toFixed(1), count };
  });

  // Founder section: env allowlist gates rendering; the SECURITY DEFINER
  // founder_metrics() RPC re-checks the email server-side regardless.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  let founder: Record<string, number> | null = null;
  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
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
      <div className="pagehead">
        <h1>Insights</h1>
        <p className="muted small" style={{ marginTop: 4 }}>
          Your workspace over the last {WEEKS} weeks — live from your turnover
          records.
        </p>
      </div>

      <div className="tiles">
        <div className="tile">
          <div className="k">Turnovers logged</div>
          <div className="v">{locked.length}</div>
          <div className="sub">guest-ready proofs on file</div>
        </div>
        <div className="tile">
          <div className="k">Complete 4-photo rate</div>
          <div className="v">{locked.length ? `${completePct}%` : "—"}</div>
          <div className="sub">full evidence sets</div>
        </div>
        <div className="tile">
          <div className="k">Proof links shared</div>
          <div className="v">{locked.length ? `${sharePct}%` : "—"}</div>
          <div className="sub">of turnovers, link copied or opened</div>
        </div>
        <div className="tile">
          <div className="k">Recipient opens</div>
          <div className="v">{opens}</div>
          <div className="sub">someone viewed a proof link</div>
        </div>
        <div className="tile">
          <div className="k">Open issues</div>
          <div
            className="v"
            style={{ color: openIssues ? "var(--warn)" : undefined }}
          >
            {openIssues}
          </div>
          <div className="sub">unconfirmed flags on recent visits</div>
        </div>
      </div>

      <div className="card pad stack">
        <div className="label" style={{ marginBottom: 0 }}>
          Turnovers per property
        </div>
        {perProperty.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            No properties yet.
          </p>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            {perProperty.map((p) => (
              <div key={p.name} className="spread small">
                <span>
                  <strong>{p.name}</strong>
                </span>
                <span className="dim">
                  {p.count} in {WEEKS} wks ({p.perWeek}/wk)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {founder && (
        <>
          <h3 style={{ fontSize: 16, marginTop: 6 }}>
            Founder view — validation gates (PRD §12 / §16)
          </h3>
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
