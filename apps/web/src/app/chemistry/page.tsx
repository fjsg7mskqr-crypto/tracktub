import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { getCurrentMembership } from "@/lib/auth";
import { ChemistryAlerts } from "@/components/ChemistryAlerts";
import { ChemistryTrend, type TrendReading } from "@/components/ChemistryTrend";
import {
  batherLoadActive,
  clarityFlag,
  type TurnoverChem,
} from "@/lib/chemistry-rules";

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

  return (
    <div className="stack">
      <div className="spread pagehead">
        <h1>Chemistry</h1>
        {cards.length > 0 && (
          <span className={attentionCount > 0 ? "badge warn" : "badge ok"}>
            {attentionCount > 0
              ? `${attentionCount} need${attentionCount === 1 ? "s" : ""} attention`
              : "All guest-ready"}
          </span>
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
          {cards.map((p) => (
            <Link
              key={p.id}
              href={`/p/${p.id}`}
              className="card card-link pad stack"
            >
              <div className="spread">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.name}</div>
                  {p.address && (
                    <div className="small dim" style={{ marginTop: 2 }}>
                      {p.address}
                    </div>
                  )}
                </div>
                <div className="row wrap" style={{ justifyContent: "flex-end" }}>
                  {p.batherLoad && (
                    <span className="badge warn">
                      <Icon name="droplet" size={11} /> Shock due
                    </span>
                  )}
                  {p.chemFlag?.reason === "low_sanitizer" && (
                    <span className="badge warn">Low sanitizer</span>
                  )}
                  {p.chemFlag?.reason === "cloudy" && (
                    <span className="badge warn">Cloudy</span>
                  )}
                  {!p.attention &&
                    (p.readings.length > 0 ? (
                      <span className="badge ok">● Guest-ready</span>
                    ) : (
                      <span className="badge">No readings yet</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
