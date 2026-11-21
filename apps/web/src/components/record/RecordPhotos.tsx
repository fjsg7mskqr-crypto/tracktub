"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PhotoViewer } from "@/components/photo/PhotoViewer";

export type RecordPhoto = {
  label: string;
  /** Caption times, already shortened by the server component. */
  time: string;
  received: string | null;
  url: string | null;
};

/**
 * The report's Photos grid. A thumbnail with a signed URL is a button that
 * opens a full-screen, uncropped viewer (native <dialog>: focus trap, Esc,
 * focus return). Tiles without a URL stay plain "Photo unavailable" boxes.
 * Photo URLs expire after an hour, so a failed load offers a reload.
 */
export function RecordPhotos({ photos }: Readonly<{ photos: RecordPhoto[] }>) {
  // Indexes into `photos` that can actually be shown.
  const viewable = photos.flatMap((p, i) => (p.url ? [i] : []));
  const [open, setOpen] = useState<number | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const openedFrom = useRef<number | null>(null);

  const go = useCallback((i: number) => {
    openedFrom.current = i;
    setOpen(i);
  }, []);
  const close = useCallback(() => setOpen(null), []);

  // Return focus to the tile that was last on screen once the viewer is gone.
  useEffect(() => {
    if (open === null && openedFrom.current !== null) {
      triggers.current[openedFrom.current]?.focus();
      openedFrom.current = null;
    }
  }, [open]);

  return (
    <>
      <div className="tt-record-photos">
        {photos.map((p, i) => (
          <figure key={`${i}-${p.label}`}>
            {p.url ? (
              <button
                type="button"
                className="tt-record-photo-btn"
                aria-label={`View ${p.label} photo full size`}
                ref={(el) => {
                  triggers.current[i] = el;
                }}
                onClick={() => go(i)}
              >
                {/* Signed, expiring URL that changes every render, so
                    next/image's optimiser cache can't help (or leak one). */}
                {/* eslint-disable-next-line @next/next/no-img-element -- stored photo, not a static asset */}
                <img src={p.url} alt={p.label} loading="lazy" />
              </button>
            ) : (
              <div
                className="tt-record-text tt-record-muted"
                role="img"
                aria-label={`${p.label} photo unavailable`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 120,
                  border: "1px dashed currentColor",
                }}
              >
                Photo unavailable
              </div>
            )}
            <figcaption>
              {p.label} · {p.time}
              {p.received ? (
                <span className="tt-record-received">
                  received {p.received}
                </span>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
      {open !== null && (
        <PhotoViewer
          photos={photos}
          viewable={viewable}
          index={open}
          onIndex={go}
          onClose={close}
        />
      )}
    </>
  );
}
