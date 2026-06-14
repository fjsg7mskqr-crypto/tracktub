"use client";

import { useState } from "react";
import { Lightbox } from "@/components/Lightbox";

export type Shot = { url: string; label: string };

/** Prominent before/after gallery for the turnover log. The "before" shot reads
 *  as a hero; the guest-ready set is a large responsive grid. Any photo opens
 *  full-screen via the shared Lightbox. */
export default function TurnoverGallery({
  before,
  after,
}: {
  before: Shot[];
  after: Shot[];
}) {
  const [open, setOpen] = useState<Shot | null>(null);

  const Shot = ({ s, hero }: { s: Shot; hero?: boolean }) => (
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

  return (
    <>
      {before.length > 0 && (
        <div className="tgal">
          <div className="tgal-label">How it was found</div>
          {before.length === 1 ? (
            <Shot s={before[0]} hero />
          ) : (
            <div className="tgal-grid">
              {before.map((s, i) => (
                <Shot key={i} s={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {after.length > 0 && (
        <div className="tgal">
          <div className="tgal-label">
            Guest-ready <span className="ct">· {after.length} photos</span>
          </div>
          <div className="tgal-grid">
            {after.map((s, i) => (
              <Shot key={i} s={s} />
            ))}
          </div>
        </div>
      )}

      {open && <Lightbox src={open.url} alt={open.label} onClose={() => setOpen(null)} />}
    </>
  );
}
