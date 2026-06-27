import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Mono } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { ChemistryAlerts } from "@/components/ChemistryAlerts";
import { ChemistryTrend, type TrendReading } from "@/components/ChemistryTrend";
import { ChemReadout } from "@/components/ChemReadout";
import {
  batherLoadActive,
  clarityFlag,
  type TurnoverChem,
} from "@/lib/chemistry-rules";
import { asSanitizerType } from "@/lib/chemistry";
import { PropertySettings } from "./PropertySettings";

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
    .select("id, name, address, tub_notes, sanitizer_type")
    .eq("id", propertyId)
    .single();
  if (!property) notFound();

  const sanitizerType = asSanitizerType(property.sanitizer_type);

  const { data: canCapture } = await supabase.rpc("app_can_capture_property", {
    p_property: propertyId,
  });

  const { data: draftTurnover } = await supabase
    .from("turnover")
    .select("id")
    .eq("property_id", propertyId)
    .eq("status", "draft")
    .eq("submitter_id", user.id)
    .maybeSingle();

  const captureHref = draftTurnover
    ? `/p/${propertyId}/new?turnover=${draftTurnover.id}`
    : `/p/${propertyId}/new`;

  const { data: turnovers } = await supabase
    .from("turnover")
    .select(
      `id, submitted_at_server, urgent, notes, share_token,
       submitter:profile(full_name, email),
       issues:issue_tag(tag, source, confirmed_at),
       water:water_reading(total_alkalinity, ph, calcium_hardness, sanitizer_ppm, recorded_at)`
    )
    .eq("property_id", propertyId)
    .eq("status", "submitted_locked")
    .order("submitted_at_server", { ascending: false });

  // ── Chemistry-aware layer (issue #100) ──────────────────────────────────────
  const list = turnovers ?? []; // newest-first
  const readingOf = (t: (typeof list)[number]) =>
    Array.isArray(t.water) ? t.water[0] : t.water;
  const chem: TurnoverChem[] = list.map((t) => ({
    at: t.submitted_at_server,
    sanitizerPpm: readingOf(t)?.sanitizer_ppm ?? null,
    cloudy: (t.issues ?? []).some(
      (i) => i.tag === "water_cloudy" && !i.confirmed_at
    ),
  }));
  // eslint-disable-next-line react-hooks/purity -- async RSC; Date.now() is request-scoped on the server
  const batherLoad = batherLoadActive(chem, Date.now(), sanitizerType);
  const latestFlag =
    chem.length > 0 ? clarityFlag(chem[0], sanitizerType) : null;
  const flags = latestFlag ? [latestFlag] : [];
  const readings: TrendReading[] = list
    .map((t) => {
      const r = readingOf(t);
      return r
        ? {
            recorded_at: r.recorded_at,
            total_alkalinity: r.total_alkalinity,
            ph: r.ph,
            calcium_hardness: r.calcium_hardness,
            sanitizer_ppm: r.sanitizer_ppm,
          }
        : null;
    })
    .filter((r): r is TrendReading => r !== null);

  return (
    <div className="stack">
      <div className="crumb">
        <Link href="/">Dashboard</Link> / {property.name}
      </div>

      <div className="spread pagehead">
        <div>
          <h1 style={{ fontSize: 21 }}>{property.name}</h1>
          {property.address && (
            <div className="small muted" style={{ marginTop: 3 }}>
              {property.address}
            </div>
          )}
        </div>
        {canCapture && (
          <Link href={captureHref} className="btn primary">
            <Icon name={draftTurnover ? "camera" : "plus"} size={15} />{" "}
            {draftTurnover ? "Resume turnover" : "New turnover"}
          </Link>
        )}
      </div>

      {draftTurnover && canCapture && (
        <Link href={captureHref} className="note" style={{ textDecoration: "none", color: "inherit" }}>
          Turnover in progress —{" "}
          <strong style={{ color: "var(--text-hi)" }}>resume →</strong>
        </Link>
      )}

      <ChemistryAlerts batherLoad={batherLoad} flags={flags} />

      {property.tub_notes && (
        <div className="card pad">
          <div className="label">Tub notes</div>
          <p className="small" style={{ margin: 0 }}>
            {property.tub_notes}
          </p>
        </div>
      )}

      {readings.length > 0 && (
        <ChemistryTrend readings={readings} sanitizerType={sanitizerType} />
      )}

      <PropertySettings
        propertyId={property.id}
        sanitizerType={sanitizerType}
        canManage={!!canCapture}
      />

      <h3 style={{ fontSize: 16, marginTop: 6 }}>
        Turnover history{" "}
        <span className="dim small" style={{ fontWeight: 500 }}>
          ({list.length})
        </span>
      </h3>

      {list.length === 0 ? (
        <div className="empty">No turnovers yet.</div>
      ) : (
        <div className="dlist">
          {list.map((t) => {
            const openIssues = (t.issues ?? []).filter((i) => !i.confirmed_at);
            const submitter = Array.isArray(t.submitter)
              ? t.submitter[0]
              : t.submitter;
            const submitterName =
              submitter?.full_name ?? submitter?.email ?? "Unknown";
            const tone = t.urgent
              ? "urgent"
              : openIssues.length > 0
                ? "warn"
                : "ready";
            return (
              <Link
                key={t.id}
                href={`/t/${t.id}`}
                className={`drow2 t-${tone}`}
              >
                <div className="nmwrap">
                  <span className={`sdot t-${tone}`} />
                  <div>
                    <Mono className="nm">{timeAgo(t.submitted_at_server)}</Mono>
                    <div className="ad">{submitterName}</div>
                  </div>
                </div>
                <div className="when">
                  <ChemReadout
                    reading={readingOf(t)}
                    sanitizerType={sanitizerType}
                  />
                </div>
                <div className="badges">
                  {t.urgent && <span className="spill urgent">Urgent</span>}
                  {openIssues.length > 0 ? (
                    <span className="spill warn">
                      {openIssues.length} issue
                      {openIssues.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="spill ready">Clean</span>
                  )}
                  {t.share_token && (
                    <span className="spill">
                      <Icon name="share" size={11} /> Proof link
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
