"use client";

import { useState } from "react";
import { Lightbox } from "@/components/Lightbox";
import type { Shot } from "@/lib/turnover-display";

export type { Shot };

/** Prominent before/after gallery for the turnover log. Capture v2 shows the
 *  money-shot full-frame pair as a hero, issue photos with captions, then the
 *  guided after set. Legacy turnovers use the original before / guest-ready grid. */
export default function TurnoverGallery({
  moneyPair,
  issuePhotos,
  guidedAfter,
  before,
  after,
}: {
  moneyPair?: { before: Shot; after: Shot } | null;
  issuePhotos?: Shot[];
  guidedAfter?: Shot[];
  /** Legacy layout */
  before?: Shot[];
  after?: Shot[];
}) {
  const [open, setOpen] = useState<Shot | null>(null);

  const ShotBtn = ({ s, hero }: { s: Shot; hero?: boolean }) => (
    <button
      type="button"
      className={`tgal-shot${hero ? " tgal-hero" : ""}`}
      onClick={() => setOpen(s)}
      aria-label={`View ${s.label}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- user-captured photo */}
      <img src={s.url} alt={s.label} />
      <span className="cap">{s.label}</span>
    </button>
  );

  const v2 = !!(moneyPair || (issuePhotos?.length ?? 0) > 0 || (guidedAfter?.length ?? 0) > 0);

  if (v2) {
    return (
      <>
        {moneyPair && (
          <div className="tgal">
            <div className="tgal-label">Before &amp; after</div>
            <div className="tgal-pair">
              <ShotBtn s={moneyPair.before} hero />
              <ShotBtn s={moneyPair.after} hero />
            </div>
          </div>
        )}

        {(issuePhotos?.length ?? 0) > 0 && (
          <div className="tgal">
            <div className="tgal-label">
              Issues flagged{" "}
              <span className="ct">· {issuePhotos!.length} photo{issuePhotos!.length > 1 ? "s" : ""}</span>
            </div>
            <div className="tgal-grid">
              {issuePhotos!.map((s, i) => (
                <div key={i} className="tgal-issue">
                  <ShotBtn s={s} />
                  {s.caption && (
                    <p className="small muted" style={{ margin: "6px 2px 0" }}>
                      {s.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(guidedAfter?.length ?? 0) > 0 && (
          <div className="tgal">
            <div className="tgal-label">
              Guest-ready{" "}
              <span className="ct">· {guidedAfter!.length} photos</span>
            </div>
            <div className="tgal-grid">
              {guidedAfter!.map((s, i) => (
                <ShotBtn key={i} s={s} />
              ))}
            </div>
          </div>
        )}

        {open && (
          <Lightbox src={open.url} alt={open.label} onClose={() => setOpen(null)} />
        )}
      </>
    );
  }

  const legacyBefore = before ?? [];
  const legacyAfter = after ?? [];

  return (
    <>
      {legacyBefore.length > 0 && (
        <div className="tgal">
          <div className="tgal-label">How it was found</div>
          {legacyBefore.length === 1 ? (
            <ShotBtn s={legacyBefore[0]} hero />
          ) : (
            <div className="tgal-grid">
              {legacyBefore.map((s, i) => (
                <ShotBtn key={i} s={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {legacyAfter.length > 0 && (
        <div className="tgal">
          <div className="tgal-label">
            Guest-ready <span className="ct">· {legacyAfter.length} photos</span>
          </div>
          <div className="tgal-grid">
            {legacyAfter.map((s, i) => (
              <ShotBtn key={i} s={s} />
            ))}
          </div>
        </div>
      )}

      {open && (
        <Lightbox src={open.url} alt={open.label} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
