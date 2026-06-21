import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { timeAgo } from "@/lib/format";

// The cleaner's stripped-down home (issue #97). One job: tap an assigned tub to
// capture a turnover. RLS (property_select → app_can_see_property) already
// scopes `property` to exactly this staff user's assigned tubs.
export async function CleanerHome({ name }: { name: string | null }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, address,
       turnover(id, submitted_at_server, status, submitter_id)`
    )
    .order("created_at");

  const tubs = (properties ?? []).map((p) => {
    const locked = (p.turnover ?? [])
      .filter((t) => t.status === "submitted_locked")
      .sort((a, b) =>
        (b.submitted_at_server ?? "").localeCompare(a.submitted_at_server ?? "")
      );
    const draft = (p.turnover ?? []).find(
      (t) => t.status === "draft" && t.submitter_id === user.id
    );
    return {
      ...p,
      lastAt: locked[0]?.submitted_at_server ?? null,
      draftId: draft?.id ?? null,
    };
  });

  return (
    <div className="stack">
      <div className="pagehead">
        <h1>Your tubs</h1>
        <p className="muted small">
          {name ? `Hi ${name} — ` : ""}tap a tub to capture this turnover.
        </p>
      </div>

      {tubs.length === 0 ? (
        <div
          className="card pad stack"
          style={{ textAlign: "center", padding: "40px 24px" }}
        >
          <p className="muted">
            No tubs assigned yet. Your host will add you to a property.
          </p>
        </div>
      ) : (
        <div className="stack">
          {tubs.map((p) => {
            const captureHref = p.draftId
              ? `/p/${p.id}/new?turnover=${p.draftId}`
              : `/p/${p.id}/new`;
            const captureLabel = p.draftId ? "Resume turnover" : "Capture";

            return (
              <div key={p.id} className="stack" style={{ gap: 8 }}>
                {p.draftId && (
                  <Link
                    href={captureHref}
                    className="note"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    Turnover in progress —{" "}
                    <strong style={{ color: "var(--text-hi)" }}>resume →</strong>
                  </Link>
                )}
                <Link
                  href={captureHref}
                  className="card card-link pad spread"
                  style={{ alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 17 }}>{p.name}</div>
                    {p.address && (
                      <div className="small dim" style={{ marginTop: 2 }}>
                        {p.address}
                      </div>
                    )}
                    <div className="small muted" style={{ marginTop: 6 }}>
                      {p.lastAt
                        ? `Last captured ${timeAgo(p.lastAt)}`
                        : "Not captured yet"}
                    </div>
                  </div>
                  <span className="btn primary" aria-hidden="true">
                    <Icon name="camera" size={16} /> {captureLabel}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
