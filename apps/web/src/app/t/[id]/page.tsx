import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Seal } from "@/components/Seal";
import { photoPublicUrl } from "@/lib/supabase/storage";
import { formatDateTime } from "@/lib/format";
import { WaterReadingCard } from "@/components/WaterReadingCard";
import { readingHasValues } from "@/lib/chemistry";
import ProofActions from "./ProofActions";

export default async function TurnoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: turnoverIdParam } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: t } = await supabase
    .from("turnover")
    .select(
      `id, submitted_at_server, urgent, notes, share_token, status,
       property:property(id, name, address),
       submitter:profile(full_name, email),
       photos:photo(slot, storage_path, confirmed_tags),
       issues:issue_tag(tag, source, confirmed_at),
       water:water_reading(ph, sanitizer_ppm, temp_f, recorded_at)`
    )
    .eq("id", turnoverIdParam)
    .single();
  if (!t) notFound();

  const property = Array.isArray(t.property) ? t.property[0] : t.property;
  const submitter = Array.isArray(t.submitter) ? t.submitter[0] : t.submitter;
  const submitterName = submitter?.full_name ?? submitter?.email ?? "Unknown";
  const openIssues = (t.issues ?? []).filter((i) => !i.confirmed_at);
  const reading = Array.isArray(t.water) ? t.water[0] : t.water;

  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="crumb">
        <Link href="/">Cockpit</Link> /{" "}
        <Link href={`/p/${property?.id}`}>{property?.name}</Link> / Turnover
      </div>

      <div className="spread pagehead">
        <div>
          <h1 style={{ fontSize: 21 }}>{property?.name}</h1>
          <div className="small muted" style={{ marginTop: 3 }}>
            {formatDateTime(t.submitted_at_server)} · {submitterName}
          </div>
        </div>
        <div className="row wrap" style={{ justifyContent: "flex-end" }}>
          <span className="badge">
            <Icon name="lock" size={12} /> Locked
          </span>
          {t.urgent && <span className="badge danger">Urgent</span>}
          {openIssues.length > 0 ? (
            <span className="badge warn">
              {openIssues.map((i) => i.tag).join(", ")}
            </span>
          ) : (
            <span className="badge ok">Clean</span>
          )}
        </div>
      </div>

      <div className="card pad stack">
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
                  cursor: "pointer",
                }}
              />
            ))}
        </div>
        {t.notes && (
          <div>
            <div className="label">Notes</div>
            <p className="small" style={{ margin: 0 }}>
              {t.notes}
            </p>
          </div>
        )}
      </div>

      {reading && readingHasValues(reading) && (
        <WaterReadingCard reading={reading} />
      )}

      {/* Proof — the differentiator */}
      <div className="card pad stack">
        <div className="spread">
          <h3 style={{ fontSize: 17 }}>Proof</h3>
          <span className="row" style={{ gap: 7 }}>
            <span style={{ display: "inline-flex" }}>
              <Seal size={20} />
            </span>
            <span className="eyebrow" style={{ color: "var(--verified)" }}>
              Verified
            </span>
          </span>
        </div>

        <ProofActions
          shareToken={t.share_token}
          turnoverId={t.id}
          turnoverDate={t.submitted_at_server}
        />

        <hr className="divider" />
        <div className="row wrap small dim">
          <span className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" disabled>
              <Icon name="file" size={14} /> Signed PDF
            </button>
            <span className="mock-tag">fast-follow</span>
          </span>
          <span className="row" style={{ gap: 6 }}>
            <span className="badge">
              <Icon name="pin" size={12} /> Geofence
            </span>
            <span className="mock-tag">fast-follow</span>
          </span>
        </div>
      </div>

      <p className="tiny dim row" style={{ gap: 6, alignItems: "flex-start" }}>
        <Icon name="lock" size={13} style={{ marginTop: 1, flex: "none" }} />
        This record is locked and unchanged since submission. Corrections create
        a new turnover — the original is preserved.
      </p>
    </div>
  );
}
