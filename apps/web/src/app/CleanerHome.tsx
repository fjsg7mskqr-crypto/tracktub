import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/Icon";
import { timeAgo } from "@/lib/format";

// The cleaner's stripped-down home (issue #97). One job: tap an assigned tub to
// capture a turnover. RLS (property_select → app_can_see_property) already
// scopes `property` to exactly this staff user's assigned tubs.
export async function CleanerHome({ name }: { name: string | null }) {
  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, address,
       turnover(id, submitted_at_server, status)`
    )
    .order("created_at");

  const tubs = (properties ?? []).map((p) => {
    const last = (p.turnover ?? [])
      .filter((t) => t.status === "submitted_locked")
      .sort((a, b) =>
        (b.submitted_at_server ?? "").localeCompare(a.submitted_at_server ?? "")
      )[0];
    return { ...p, lastAt: last?.submitted_at_server ?? null };
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
          {tubs.map((p) => (
            <Link
              key={p.id}
              href={`/p/${p.id}/new`}
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
                <Icon name="camera" size={16} /> Capture
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
