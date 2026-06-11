import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { photoPublicUrl } from "@/lib/supabase/storage";
import { timeAgo } from "@/lib/format";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, address,
       turnover(
         id, submitted_at_server, status, urgent,
         photo(slot, storage_path),
         issue_tag(tag, confirmed_at)
       )`
    )
    .order("created_at");

  const cockpit = (properties ?? []).map((p) => {
    const locked = (p.turnover ?? [])
      .filter((t) => t.status === "submitted_locked")
      .sort((a, b) =>
        b.submitted_at_server.localeCompare(a.submitted_at_server)
      );
    const last = locked[0] ?? null;
    const openIssues = last
      ? (last.issue_tag ?? []).filter((i) => !i.confirmed_at).length
      : 0;
    return { ...p, last, openIssues };
  });

  return (
    <div className="stack">
      <div className="spread pagehead">
        <h1>Cockpit</h1>
        <Link href="/add-property" className="btn primary">
          <Icon name="plus" size={15} /> Add property
        </Link>
      </div>

      {cockpit.length === 0 ? (
        <div
          className="card pad stack"
          style={{ textAlign: "center", padding: "40px 24px" }}
        >
          <p className="muted">
            No properties yet. Add your first to start logging turnovers.
          </p>
          <Link
            href="/add-property"
            className="btn primary"
            style={{ alignSelf: "center" }}
          >
            Add your first property →
          </Link>
        </div>
      ) : (
        <div className="stack">
          {cockpit.map((p) => (
            <Link key={p.id} href={`/p/${p.id}`} className="card card-link pad">
              <div className="spread" style={{ marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.name}</div>
                  {p.address && (
                    <div className="small dim" style={{ marginTop: 2 }}>
                      {p.address}
                    </div>
                  )}
                </div>
                <div
                  className="row wrap"
                  style={{ justifyContent: "flex-end" }}
                >
                  {p.last?.urgent && (
                    <span className="badge danger">Urgent</span>
                  )}
                  {p.openIssues > 0 ? (
                    <span className="badge warn">
                      {p.openIssues} issue{p.openIssues > 1 ? "s" : ""}
                    </span>
                  ) : p.last ? (
                    <span className="badge ok">● Guest-ready</span>
                  ) : (
                    <span className="badge">No turnovers yet</span>
                  )}
                </div>
              </div>
              {p.last && (
                <div className="small dim">
                  Last turnover {timeAgo(p.last.submitted_at_server)}
                </div>
              )}
              {p.last?.photo && p.last.photo.length > 0 && (
                <div className="photos" style={{ marginTop: 10 }}>
                  {p.last.photo
                    .filter((ph) => ph.storage_path)
                    .slice(0, 4)
                    .map((ph) => (
                      <img
                        key={ph.slot}
                        src={photoPublicUrl(ph.storage_path!)}
                        alt={ph.slot}
                        style={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                      />
                    ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
