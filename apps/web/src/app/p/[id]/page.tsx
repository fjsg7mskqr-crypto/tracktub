import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Mono } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { ChemistryAlerts } from "@/components/ChemistryAlerts";
import { ChemistryTrend, type TrendReading } from "@/components/ChemistryTrend";
import {
  phOutOfRange,
  sanitizerOutOfRange,
  tempOutOfRange,
} from "@/lib/chemistry";
import {
  batherLoadActive,
  clarityFlag,
  type TurnoverChem,
} from "@/lib/chemistry-rules";

/** Compact mono chemistry readout for a history row — mirrors the dashboard. */
function Chem({
  reading,
}: {
  reading: {
    ph: number | null;
    sanitizer_ppm: number | null;
    temp_f: number | null;
  } | null;
}) {
  if (
    !reading ||
    (reading.ph == null &&
      reading.sanitizer_ppm == null &&
      reading.temp_f == null)
  )
    return null;
  const cell = (k: string, v: number | null, bad: boolean, suffix = "") => (
    <span className={bad ? "bad" : ""}>
      <span className="k">{k}</span> <b>{v != null ? `${v}${suffix}` : "—"}</b>
    </span>
  );
  return (
    <div className="creadout">
      {cell("pH", reading.ph, phOutOfRange(reading.ph))}
      {cell(
        "San",
        reading.sanitizer_ppm,
        sanitizerOutOfRange(reading.sanitizer_ppm)
      )}
      {cell("Temp", reading.temp_f, tempOutOfRange(reading.temp_f), "°")}
    </div>
  );
}

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
       issues:issue_tag(tag, source, confirmed_at),
       water:water_reading(ph, sanitizer_ppm, temp_f, recorded_at)`
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
  const batherLoad = batherLoadActive(chem, Date.now());
  const latestFlag = chem.length > 0 ? clarityFlag(chem[0]) : null;
  const flags = latestFlag ? [latestFlag] : [];
  const readings: TrendReading[] = list
    .map((t) => {
      const r = readingOf(t);
      return r
        ? {
            recorded_at: r.recorded_at,
            ph: r.ph,
            sanitizer_ppm: r.sanitizer_ppm,
            temp_f: r.temp_f,
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
          <Link href={`/p/${propertyId}/new`} className="btn primary">
            <Icon name="plus" size={15} /> New turnover
          </Link>
        )}
      </div>

      <ChemistryAlerts batherLoad={batherLoad} flags={flags} />

      {property.tub_notes && (
        <div className="card pad">
          <div className="label">Tub notes</div>
          <p className="small" style={{ margin: 0 }}>
            {property.tub_notes}
          </p>
        </div>
      )}

      {readings.length > 0 && <ChemistryTrend readings={readings} />}

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
                  <Chem reading={readingOf(t)} />
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
