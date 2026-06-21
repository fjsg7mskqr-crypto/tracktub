import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { timeAgo } from "@/lib/format";
import { getCurrentMembership } from "@/lib/auth";
import { CleanerHome } from "./CleanerHome";
import { ChemReadout } from "@/components/ChemReadout";
import {
  batherLoadActive,
  clarityFlag,
  type TurnoverChem,
} from "@/lib/chemistry-rules";
import { pickTurnoverThumbnail } from "@/lib/turnover-display";

type Tone = "ready" | "warn" | "urgent" | "neutral";

export default async function Home() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  // Cleaners get the stripped capture-only home.
  if (membership.role === "staff") {
    const firstName = membership.email?.split("@")[0] ?? null;
    return <CleanerHome name={firstName} />;
  }

  const canAdd = membership.role === "operator";
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("property")
    .select(
      `id, name, address,
       turnover(
         id, submitted_at_server, status, urgent, submitter_id,
         photo(slot, storage_path, phase),
         issue_tag(tag, confirmed_at),
         water_reading(total_alkalinity, ph, calcium_hardness, sanitizer_ppm)
       )`
    )
    .order("created_at");

  const submitterIds = [
    ...new Set(
      (properties ?? [])
        .flatMap((p) => (p.turnover ?? []).map((t) => t.submitter_id))
        .filter(Boolean)
    ),
  ] as string[];
  const { data: profiles } = submitterIds.length
    ? await supabase
        .from("profile")
        .select("id, full_name, email")
        .in("id", submitterIds)
    : { data: [] as { id: string; full_name: string | null; email: string }[] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      p.full_name || p.email?.split("@")[0] || "Unknown",
    ])
  );

  const now = Date.now();
  const rows = (properties ?? []).map((p) => {
    const locked = (p.turnover ?? [])
      .filter((t) => t.status === "submitted_locked")
      .sort((a, b) =>
        (b.submitted_at_server ?? "").localeCompare(a.submitted_at_server ?? "")
      );
    const last = locked[0] ?? null;
    const openIssues = last
      ? (last.issue_tag ?? []).filter((i) => !i.confirmed_at).length
      : 0;
    const chem: TurnoverChem[] = locked.map((t) => ({
      at: t.submitted_at_server,
      sanitizerPpm:
        (Array.isArray(t.water_reading) ? t.water_reading[0] : t.water_reading)
          ?.sanitizer_ppm ?? null,
      cloudy: (t.issue_tag ?? []).some(
        (i) => i.tag === "water_cloudy" && !i.confirmed_at
      ),
    }));
    const batherLoad = batherLoadActive(chem, now);
    const flag = chem.length ? clarityFlag(chem[0]) : null;
    const reading = last
      ? Array.isArray(last.water_reading)
        ? last.water_reading[0]
        : last.water_reading
      : null;

    const badges: { cls: string; label: string }[] = [];
    let tone: Tone = "neutral";
    const worse = (t: Tone) => {
      if (tone === "urgent") return;
      if (t === "urgent" || tone === "neutral") tone = t;
    };
    if (!last) {
      badges.push({ cls: "", label: "No turnovers" });
    } else {
      if (last.urgent) {
        tone = "urgent";
        badges.push({ cls: "urgent", label: "Urgent" });
      }
      if (batherLoad) {
        worse("warn");
        badges.push({ cls: "warn", label: "Shock due" });
      }
      if (flag?.reason === "low_sanitizer") {
        worse("warn");
        badges.push({ cls: "warn", label: "Low sanitizer" });
      }
      if (flag?.reason === "cloudy") {
        worse("warn");
        badges.push({ cls: "warn", label: "Cloudy water" });
      }
      if (openIssues > 0) {
        worse("warn");
        badges.push({
          cls: "warn",
          label: `${openIssues} issue${openIssues > 1 ? "s" : ""}`,
        });
      }
      if (badges.length === 0) {
        tone = "ready";
        badges.push({ cls: "ready", label: "Guest-ready" });
      }
    }

    return {
      id: p.id,
      name: p.name,
      address: p.address as string | null,
      last,
      thumbnail: last ? pickTurnoverThumbnail(last.photo ?? []) : null,
      reading,
      submitter: last ? nameById.get(last.submitter_id) ?? "Unknown" : null,
      tone: tone as Tone,
      badges,
    };
  });

  const ready = rows.filter((r) => r.tone === "ready").length;
  const needYou = rows.filter((r) => r.tone === "urgent" || r.tone === "warn").length;

  return (
    <div className="stack">
      <div className="dashhead">
        <div className="spread">
          <h1>Your hot tubs</h1>
          {canAdd && (
            <Link href="/add-property" className="btn primary">
              <Icon name="plus" size={15} /> Add property
            </Link>
          )}
        </div>
        {rows.length > 0 && (
          <div className="row">
            <span className="sub">
              <b>{ready}</b> guest-ready
              {needYou > 0 && (
                <>
                  {" · "}
                  <b className="t-urgent">{needYou}</b> need you
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div
          className="card pad stack"
          style={{ textAlign: "center", padding: "40px 24px" }}
        >
          <p className="muted">
            {canAdd
              ? "No properties yet. Add your first to start logging turnovers."
              : "No properties shared with you yet."}
          </p>
          {canAdd && (
            <Link
              href="/add-property"
              className="btn primary"
              style={{ alignSelf: "center" }}
            >
              Add your first property →
            </Link>
          )}
        </div>
      ) : (
        <div className="dlist">
          {rows.map((r) => (
            <Link key={r.id} href={`/p/${r.id}`} className={`drow2 t-${r.tone}`}>
              <div className="nmwrap">
                {r.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element -- turnover thumbnail
                  <img src={r.thumbnail} alt="" className="dthumb" />
                ) : (
                  <span className={`sdot t-${r.tone}`} />
                )}
                <div>
                  <div className="nm">{r.name}</div>
                  {r.address && <div className="ad">{r.address}</div>}
                </div>
              </div>
              <div className="when">
                {r.last ? (
                  <>
                    {timeAgo(r.last.submitted_at_server)}{" "}
                    <span className="who">· {r.submitter}</span>
                    <ChemReadout reading={r.reading} />
                  </>
                ) : (
                  <span className="who">No turnovers yet</span>
                )}
              </div>
              <div className="badges">
                {r.badges.map((b, i) => (
                  <span key={i} className={`spill ${b.cls}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
