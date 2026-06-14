import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/auth";
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

// Mono pH/San/Temp readout — same atom the dashboard rows use.
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

export default async function ChemistryPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  // Staff get the capture-only home; this cross-property view is operator/owner.
  if (membership.role === "staff") redirect("/");

  const canAdd = membership.role === "operator";
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, address,
       turnover(
         id, submitted_at_server, status, urgent,
         issue_tag(tag, confirmed_at),
         water_reading(ph, sanitizer_ppm, temp_f, recorded_at)
       )`
    )
    .order("created_at");

  const now = Date.now();
  const cards = (properties ?? []).map((p) => {
    const locked = (p.turnover ?? [])
      .filter((t) => t.status === "submitted_locked")
      .sort((a, b) =>
        (b.submitted_at_server ?? "").localeCompare(a.submitted_at_server ?? "")
      );
    const readingOf = (t: (typeof locked)[number]) =>
      Array.isArray(t.water_reading) ? t.water_reading[0] : t.water_reading;

    const chem: TurnoverChem[] = locked.map((t) => ({
      at: t.submitted_at_server,
      sanitizerPpm: readingOf(t)?.sanitizer_ppm ?? null,
      cloudy: (t.issue_tag ?? []).some(
        (i) => i.tag === "water_cloudy" && !i.confirmed_at
      ),
    }));
    const batherLoad = batherLoadActive(chem, now);
    const chemFlag = chem.length > 0 ? clarityFlag(chem[0]) : null;
    const flags = chemFlag ? [chemFlag] : [];
    const readings: TrendReading[] = locked
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
    const attention = batherLoad || chemFlag != null;

    return { ...p, batherLoad, chemFlag, flags, readings, attention };
  });

  // Demo story: tubs needing attention float to the top, then alphabetical.
  cards.sort((a, b) => {
    if (a.attention !== b.attention) return a.attention ? -1 : 1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  const attentionCount = cards.filter((c) => c.attention).length;
  const readyCount = cards.length - attentionCount;

  return (
    <div className="stack">
      <div className="dashhead">
        <div className="spread">
          <h1>Chemistry</h1>
        </div>
        {cards.length > 0 && (
          <div className="row">
            <span className="sub">
              <b>{readyCount}</b> guest-ready
              {attentionCount > 0 && (
                <>
                  {" · "}
                  <b className="t-warn">{attentionCount}</b> need
                  {attentionCount === 1 ? "s" : ""} attention
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <div
          className="card pad"
          style={{ textAlign: "center", padding: "40px 24px" }}
        >
          <p className="muted">
            {canAdd
              ? "No properties yet. Add your first to start logging turnovers."
              : "No properties shared with you yet."}
          </p>
        </div>
      ) : (
        <div className="stack">
          {cards.map((p) => {
            const tone = p.attention
              ? "warn"
              : p.readings.length > 0
                ? "ready"
                : "neutral";
            return (
              <Link
                key={p.id}
                href={`/p/${p.id}`}
                className="card card-link pad stack"
              >
                <div className="spread">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span className={`sdot t-${tone}`} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                        {p.name}
                      </div>
                      {p.address && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-dim)",
                            marginTop: 1,
                          }}
                        >
                          {p.address}
                        </div>
                      )}
                      <Chem reading={p.readings[0] ?? null} />
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      justifyContent: "flex-end",
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {p.batherLoad && (
                      <span className="spill warn">Shock due</span>
                    )}
                    {p.chemFlag?.reason === "low_sanitizer" && (
                      <span className="spill warn">Low sanitizer</span>
                    )}
                    {p.chemFlag?.reason === "cloudy" && (
                      <span className="spill warn">Cloudy</span>
                    )}
                    {!p.attention &&
                      (p.readings.length > 0 ? (
                        <span className="spill ready">Guest-ready</span>
                      ) : (
                        <span className="spill">No readings yet</span>
                      ))}
                  </div>
                </div>

                <ChemistryAlerts batherLoad={p.batherLoad} flags={p.flags} />

                {p.readings.length > 0 ? (
                  <ChemistryTrend readings={p.readings} compact />
                ) : (
                  <p className="small dim" style={{ margin: 0 }}>
                    No water readings yet.
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
