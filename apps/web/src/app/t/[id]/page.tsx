import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Seal } from "@/components/Seal";
import { formatDateTime } from "@/lib/format";
import { WaterReadingCard } from "@/components/WaterReadingCard";
import { CleaningChecklistCard } from "@/components/CleaningChecklistCard";
import { asSanitizerType, readingHasContent } from "@/lib/chemistry";
import { buildTurnoverGallery } from "@/lib/turnover-display";
import ProofActions from "./ProofActions";
import TurnoverGallery from "./TurnoverGallery";

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
      `id, submitted_at_server, urgent, notes, share_token, status, cleaning_steps,
       property:property(id, name, address, sanitizer_type),
       submitter:profile(full_name, email),
       photos:photo(slot, storage_path, confirmed_tags, phase, caption),
       issues:issue_tag(tag, source, confirmed_at),
       water:water_reading(total_alkalinity, ph, calcium_hardness, sanitizer_ppm, temp_f, recorded_at, treatments, treatment_note, balanced)`
    )
    .eq("id", turnoverIdParam)
    .single();
  if (!t) notFound();

  const property = Array.isArray(t.property) ? t.property[0] : t.property;
  const sanitizerType = asSanitizerType(property?.sanitizer_type);
  const submitter = Array.isArray(t.submitter) ? t.submitter[0] : t.submitter;
  const submitterName = submitter?.full_name ?? submitter?.email ?? "Unknown";
  const openIssues = (t.issues ?? []).filter((i) => !i.confirmed_at);
  const reading = Array.isArray(t.water) ? t.water[0] : t.water;
  const isDraft = t.status === "draft";

  const gallery = buildTurnoverGallery(t.photos ?? []);
  const v2 =
    gallery.moneyPair != null ||
    gallery.beforeIssue.length > 0 ||
    gallery.guidedAfter.length > 0;

  return (
    <div className="stack" style={{ maxWidth: 880 }}>
      <div className="crumb">
        <Link href="/">Dashboard</Link> /{" "}
        <Link href={`/p/${property?.id}`}>{property?.name}</Link> / Turnover
      </div>

      <div className="spread pagehead">
        <div>
          <h1 style={{ fontSize: 21 }}>{property?.name}</h1>
          <div className="small muted" style={{ marginTop: 3 }}>
            {t.submitted_at_server
              ? `${formatDateTime(t.submitted_at_server)} · ${submitterName}`
              : `Draft · ${submitterName}`}
          </div>
        </div>
        <div className="row wrap" style={{ justifyContent: "flex-end" }}>
          {isDraft ? (
            <span className="badge warn">
              <Icon name="reset" size={12} /> Draft
            </span>
          ) : (
            <span className="badge">
              <Icon name="lock" size={12} /> Locked
            </span>
          )}
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

      {isDraft && property?.id && (
        <div className="note">
          This turnover is still in progress.{" "}
          <Link href={`/p/${property.id}/new?turnover=${t.id}`}>
            Resume capture →
          </Link>
        </div>
      )}

      {reading && readingHasContent(reading) && (
        <WaterReadingCard reading={reading} sanitizerType={sanitizerType} />
      )}

      <CleaningChecklistCard steps={t.cleaning_steps} />

      <div className="card pad stack">
        {v2 ? (
          <TurnoverGallery
            moneyPair={gallery.moneyPair}
            issuePhotos={gallery.beforeIssue}
            guidedAfter={gallery.guidedAfter}
          />
        ) : (
          <TurnoverGallery
            before={gallery.legacyBefore}
            after={gallery.legacyAfter}
          />
        )}
        {t.notes && (
          <div>
            <div className="label">Notes</div>
            <p className="small" style={{ margin: 0 }}>
              {t.notes}
            </p>
          </div>
        )}
      </div>

      {!isDraft && (
        <>
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
        </>
      )}
    </div>
  );
}
