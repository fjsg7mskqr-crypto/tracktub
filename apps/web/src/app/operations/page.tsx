import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/auth";
import { OperationsHeader } from "@/components/OperationsHeader";
import { ChemistryAlerts } from "@/components/ChemistryAlerts";
import { ChemistryTrend, type TrendReading } from "@/components/ChemistryTrend";
import { ChemReadout } from "@/components/ChemReadout";
import {
  batherLoadActive,
  clarityFlag,
  type TurnoverChem,
} from "@/lib/chemistry-rules";
import { maintenanceStatus, type MaintenanceInput } from "@/lib/maintenance";
import { asSanitizerType } from "@/lib/chemistry";

export default async function OperationsPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  // Staff get the capture-only home; this cross-property view is operator/owner.
  if (membership.role === "staff") redirect("/");

  const canAdd = membership.role === "operator";
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, address, sanitizer_type,
       turnover(
         id, submitted_at_server, status, urgent,
         issue_tag(tag, confirmed_at),
         water_reading(total_alkalinity, ph, calcium_hardness, sanitizer_ppm, recorded_at)
       ),
       maintenance_task(
         id, recurrence_kind, recurrence_value, recurrence_unit, last_done_at, archived_at
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
    const sanitizerType = asSanitizerType(p.sanitizer_type);
    const batherLoad = batherLoadActive(chem, now, sanitizerType);
    const chemFlag =
      chem.length > 0 ? clarityFlag(chem[0], sanitizerType) : null;
    const flags = chemFlag ? [chemFlag] : [];
    const readings: TrendReading[] = locked
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
    const lockedAts = locked
      .map((t) => t.submitted_at_server)
      .filter((s): s is string => !!s);
    const overdueMaintenance = (p.maintenance_task ?? [])
      .filter((t) => !t.archived_at)
      .filter((t) => {
        const input: MaintenanceInput = {
          recurrenceKind: t.recurrence_kind,
          recurrenceValue: t.recurrence_value,
          recurrenceUnit: t.recurrence_unit,
          lastDoneAt: t.last_done_at,
          turnoversSinceDone: t.last_done_at
            ? lockedAts.filter((at) => at > (t.last_done_at as string)).length
            : lockedAts.length,
        };
        return maintenanceStatus(input, now).state === "overdue";
      }).length;
    const attention = batherLoad || chemFlag != null || overdueMaintenance > 0;

    return { ...p, sanitizerType, batherLoad, chemFlag, flags, readings, attention, overdueMaintenance };
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
      <OperationsHeader
        active="chemistry"
        readyCount={readyCount}
        attentionCount={attentionCount}
      />

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
                      <ChemReadout
                        reading={p.readings[0] ?? null}
                        sanitizerType={p.sanitizerType}
                      />
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
                    {p.overdueMaintenance > 0 && (
                      <span className="spill warn">
                        Maintenance: {p.overdueMaintenance} overdue
                      </span>
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
                  <ChemistryTrend
                    readings={p.readings}
                    compact
                    sanitizerType={p.sanitizerType}
                  />
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
