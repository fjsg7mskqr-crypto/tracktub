import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Seal } from "@/components/Seal";
import { Icon } from "@/components/Icon";
import { photoPublicUrl } from "@/lib/supabase/storage";
import { formatDateTime } from "@/lib/format";

export default async function ProofPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Anon read — works because of the turnover_public_proof RLS policy.
  const { data: t } = await supabase
    .from("turnover")
    .select(
      `id, submitted_at_server, urgent, notes, share_token,
       property:property(name, address),
       submitter:profile(full_name, email),
       photos:photo(slot, storage_path),
       issues:issue_tag(tag, source, confirmed_at)`
    )
    .eq("share_token", token)
    .eq("status", "submitted_locked")
    .single();

  if (!t) notFound();

  // Wedge-signal instrumentation (PRD §16): count the recipient open
  // server-side. The RPC validates the token, so anon can't forge events.
  // Instrumentation must never break the public proof page.
  try {
    await supabase.rpc("record_proof_open", { p_share_token: token });
  } catch {
    /* non-critical */
  }

  const property = Array.isArray(t.property) ? t.property[0] : t.property;
  const submitter = Array.isArray(t.submitter) ? t.submitter[0] : t.submitter;
  const submitterName =
    submitter?.full_name ?? submitter?.email ?? "Staff member";
  const openIssues = (t.issues ?? []).filter((i) => !i.confirmed_at);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <div
        className="container"
        style={{ maxWidth: 640, padding: "26px 18px 70px" }}
      >
        <div className="row" style={{ marginBottom: 18, gap: 10 }}>
          <span style={{ display: "inline-flex" }}>
            <Seal size={24} />
          </span>
          <span
            style={{
              fontFamily: "var(--sans)",
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: "-0.035em",
            }}
          >
            Track<b style={{ fontWeight: 600 }}>Tub</b>
          </span>
          <span className="eyebrow" style={{ marginLeft: "auto" }}>
            Certificate of turnover
          </span>
        </div>

        <div className="card pad stack">
          <div className="spread" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="eyebrow">Turnover proof</div>
              <h1 style={{ fontSize: 26, marginTop: 4 }}>
                {property?.name ?? "Property"}
              </h1>
              {property?.address && (
                <div className="small dim" style={{ marginTop: 2 }}>
                  {property.address}
                </div>
              )}
            </div>
            <div
              style={{ textAlign: "center", flex: "none" }}
              title="Server-timestamped, locked record"
            >
              <Seal size={56} />
              <div
                className="eyebrow"
                style={{ color: "var(--verified)", marginTop: 4 }}
              >
                Verified
              </div>
            </div>
          </div>

          <div className="photos">
            {(t.photos ?? [])
              .filter((ph) => ph.storage_path)
              .map((ph) => (
                <img
                  key={ph.slot}
                  src={photoPublicUrl(ph.storage_path!)}
                  alt={ph.slot}
                  style={{
                    width: "calc(25% - 6px)",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
              ))}
          </div>

          {openIssues.length > 0 ? (
            <div className="note warn">
              <strong>Issues flagged on this visit:</strong>{" "}
              {openIssues.map((i) => i.tag).join(", ")}.
            </div>
          ) : (
            <div className="note">No issues flagged — tub was guest-ready.</div>
          )}

          <hr className="divider" />

          <dl className="kv">
            <dt>Captured</dt>
            <dd>
              {formatDateTime(t.submitted_at_server)}{" "}
              <span className="tiny dim">(server time)</span>
            </dd>
            <dt>Submitted by</dt>
            <dd>{submitterName}</dd>
            <dt>Record</dt>
            <dd>
              <span className="row" style={{ gap: 6 }}>
                <Icon name="lock" size={14} /> Locked — unchanged since
                submission
              </span>
              <span className="mono tiny dim">#{t.share_token}</span>
            </dd>
          </dl>

          {t.notes && (
            <>
              <hr className="divider" />
              <div>
                <div className="label">Notes from the turnover</div>
                <p className="small" style={{ margin: 0 }}>
                  {t.notes}
                </p>
              </div>
            </>
          )}
        </div>

        <p className="tiny dim" style={{ textAlign: "center", marginTop: 16 }}>
          This record was captured through TrackTub and locked at submission.
          Photos are human-confirmed. No login required to view.
        </p>
      </div>
    </div>
  );
}
