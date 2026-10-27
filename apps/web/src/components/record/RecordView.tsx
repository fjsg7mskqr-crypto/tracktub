import Link from "next/link";
import { tubPath } from "@/lib/app-routes";
import type { RecordModel } from "./record-model";
import { RecordShareActions } from "./RecordShareActions";
import "./record.css";

/** Verbatim from the spec/mockup (D23 wording). */
export const RECORD_FOOTER =
  "Photos taken live in the TrackTub camera. Times stamped by TrackTub's server; the record was locked when submitted and can't be edited.";

/**
 * The record (spec §9) — the same facts for every holder (D23). The operator
 * view adds a dark bar on top with Send to owner / Copy link; below it is
 * exactly what the owner sees. White and printable.
 */
export function RecordView({
  visit,
  audience,
  shareUrl = null,
  nextDue = null,
}: {
  visit: RecordModel;
  audience: "operator" | "owner";
  shareUrl?: string | null;
  nextDue?: string | null;
}) {
  const shortLink = shareUrl?.replace(/^https?:\/\//, "") ?? null;
  const allLeftInRange =
    visit.water.leftAt !== null &&
    visit.water.lines.every((l) => l.leftInRange === true);

  return (
    <div className="tt-record-page">
      {audience === "operator" && (
        <div className="tt-record-operator">
          {visit.propertyId && (
            <Link className="tt-record-back" href={tubPath(visit.propertyId)}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
              {visit.tub}
            </Link>
          )}
          <RecordShareActions
            turnoverId={visit.id}
            url={shareUrl}
            tub={visit.tub}
          />
          <p className="tt-record-hint">
            Below is exactly what the owner sees.
          </p>
        </div>
      )}

      <article className="tt-record">
        <header className="tt-record-head">
          <div>
            <span className="tt-record-mast">
              Track<span>Tub</span> record
            </span>
            <h1>{visit.tub}</h1>
            <p className="tt-record-sub">
              {[visit.client, visit.date].filter(Boolean).join(" · ")}
            </p>
            <p className="tt-record-sub">
              Serviced by {visit.operator} · {visit.span}
            </p>
          </div>
          <div className="tt-record-badges">
            {visit.locked ? (
              <span className="tt-record-badge locked">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  aria-hidden="true"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                Locked {visit.lockedAt}
              </span>
            ) : (
              <span className="tt-record-badge draft">Draft</span>
            )}
            {visit.partial.length > 0 && (
              <span className="tt-record-badge partial">Partial</span>
            )}
          </div>
        </header>

        {visit.partial.length > 0 && (
          <p className="tt-record-text tt-record-muted">
            Not logged: {visit.partial.map((m) => m.toLowerCase()).join(", ")}.
          </p>
        )}

        <section>
          <h2>Water</h2>
          {visit.water.any ? (
            <>
              <div className="tt-record-water" role="table">
                <div className="tt-record-water-row head" role="row">
                  <span role="columnheader" />
                  <span role="columnheader">
                    {visit.water.foundAt
                      ? `Found ${visit.water.foundAt}`
                      : "Found"}
                  </span>
                  <span role="columnheader">
                    {visit.water.leftAt ? `Left ${visit.water.leftAt}` : "Left"}
                  </span>
                  <span role="columnheader">Target</span>
                </div>
                {visit.water.lines.map((l) => (
                  <div className="tt-record-water-row" role="row" key={l.field}>
                    <span role="rowheader">{l.label}</span>
                    <span
                      role="cell"
                      className={l.foundInRange === false ? "out" : undefined}
                    >
                      {l.found}
                    </span>
                    <span
                      role="cell"
                      className={l.leftInRange === false ? "left out" : "left"}
                    >
                      {l.left}
                      {l.leftInRange && (
                        <>
                          {" "}
                          <span className="tick" aria-label="in range">
                            ✓
                          </span>
                        </>
                      )}
                    </span>
                    <span role="cell" className="target">
                      {l.target}
                    </span>
                  </div>
                ))}
              </div>
              {allLeftInRange && (
                <p className="tt-record-text">
                  In range when re-tested at {visit.water.leftAt}, before the
                  visit was closed.
                </p>
              )}
            </>
          ) : (
            <p className="tt-record-text tt-record-muted">No reading logged.</p>
          )}
        </section>

        <section>
          <h2>Photos</h2>
          {visit.photos.length > 0 ? (
            <div className="tt-record-photos">
              {visit.photos.map((p) => (
                <figure key={p.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- stored photo, not a static asset */}
                  <img src={p.url} alt={`${p.label} photo`} loading="lazy" />
                  <figcaption>
                    {p.label} · {p.time}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="tt-record-text tt-record-muted">No photos.</p>
          )}
        </section>

        <section className="tt-record-pair">
          <div>
            <h2>Added</h2>
            <p className="tt-record-text">
              {visit.added.length > 0
                ? visit.added.join("\n")
                : "Nothing added"}
            </p>
          </div>
          <div>
            <h2>Work</h2>
            <p className="tt-record-text">
              {visit.work.map((w) => (
                <span
                  key={w.label}
                  className={w.done ? undefined : "tt-record-muted"}
                  style={{ display: "block" }}
                >
                  {w.done ? `✓ ${w.label}` : `— ${w.label}`}
                </span>
              ))}
            </p>
          </div>
        </section>

        {visit.ownerFlag && (
          <section className="tt-record-panel">
            <h2>For the owner</h2>
            <p className="tt-record-text">{visit.ownerFlag}</p>
          </section>
        )}

        {visit.notes && (
          <section>
            <h2>Notes</h2>
            <p className="tt-record-text">{visit.notes}</p>
          </section>
        )}

        <footer>
          <span>{RECORD_FOOTER}</span>
          <span>
            {[nextDue, `Record ${visit.recordId}`, shortLink]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </footer>
      </article>
    </div>
  );
}
