import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { photoPublicUrl } from "@/lib/supabase/storage";
import { timeAgo } from "@/lib/format";

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: propertyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: property } = await supabase
    .from("property")
    .select("id, name, address, tub_notes")
    .eq("id", propertyId)
    .single();
  if (!property) notFound();

  const { data: canCapture } = await supabase.rpc("app_can_capture_property", {
    p_property: propertyId,
  });

  const { data: turnovers } = await supabase
    .from("turnover")
    .select(
      `id, submitted_at_server, urgent, notes, share_token,
       submitter:profile(full_name, email),
       photos:photo(slot, storage_path, confirmed_tags),
       issues:issue_tag(tag, source, confirmed_at)`
    )
    .eq("property_id", propertyId)
    .eq("status", "submitted_locked")
    .order("submitted_at_server", { ascending: false });

  return (
    <div className="stack">
      <div className="crumb">
        <Link href="/">Cockpit</Link> / {property.name}
      </div>

      <div className="spread pagehead">
        <div>
          <h1>{property.name}</h1>
          {property.address && (
            <div className="small dim" style={{ marginTop: 4 }}>
              {property.address}
            </div>
          )}
        </div>
        {canCapture && (
          <Link href={`/p/${propertyId}/new`} className="btn primary">
            <Icon name="plus" size={15} /> New turnover
          </Link>
        )}
      </div>

      {property.tub_notes && (
        <div className="card pad">
          <div className="label">Tub notes</div>
          <p className="small" style={{ margin: 0 }}>
            {property.tub_notes}
          </p>
        </div>
      )}

      <h3 style={{ fontSize: 16, marginTop: 6 }}>
        Turnover history{" "}
        <span className="dim small" style={{ fontWeight: 500 }}>
          ({(turnovers ?? []).length})
        </span>
      </h3>

      <div className="stack">
        {(turnovers ?? []).length === 0 ? (
          <div className="empty">No turnovers yet.</div>
        ) : (
          (turnovers ?? []).map((t) => {
            const openIssues = (t.issues ?? []).filter((i) => !i.confirmed_at);
            const submitter = Array.isArray(t.submitter)
              ? t.submitter[0]
              : t.submitter;
            const submitterName =
              submitter?.full_name ?? submitter?.email ?? "Unknown";
            return (
              <Link
                key={t.id}
                href={`/t/${t.id}`}
                className="card card-link pad"
              >
                <div className="spread" style={{ marginBottom: 8 }}>
                  <div className="row">
                    <strong>{timeAgo(t.submitted_at_server)}</strong>
                    <span className="small dim">· {submitterName}</span>
                    <Icon
                      name="lock"
                      size={13}
                      style={{ color: "var(--ink-3)" }}
                    />
                  </div>
                  <div
                    className="row wrap"
                    style={{ justifyContent: "flex-end" }}
                  >
                    {t.urgent && <span className="badge danger">Urgent</span>}
                    {openIssues.length > 0 ? (
                      <span className="badge warn">
                        {openIssues.map((i) => i.tag).join(", ")}
                      </span>
                    ) : (
                      <span className="badge ok">Clean</span>
                    )}
                    {t.share_token && (
                      <span className="badge brand">
                        <Icon name="share" size={11} /> Proof link
                      </span>
                    )}
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
                          width: 80,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                      />
                    ))}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
