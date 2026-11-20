"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecordPhoto = {
  label: string;
  /** Caption times, already shortened by the server component. */
  time: string;
  received: string | null;
  url: string | null;
};

const SWIPE_PX = 50;

/**
 * The report's Photos grid. A thumbnail with a signed URL is a button that
 * opens a full-screen, uncropped viewer (native <dialog>: focus trap, Esc,
 * focus return). Tiles without a URL stay plain "Photo unavailable" boxes.
 * Photo URLs expire after an hour, so a failed load offers a reload.
 */
export function RecordPhotos({ photos }: { photos: RecordPhoto[] }) {
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
                <img src={p.url} alt={`${p.label} photo`} loading="lazy" />
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

function PhotoViewer({
  photos,
  viewable,
  index,
  onIndex,
  onClose,
}: {
  photos: RecordPhoto[];
  viewable: number[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number; multi: boolean } | null>(null);
  const [failed, setFailed] = useState<Set<number>>(new Set());

  const pos = viewable.indexOf(index);
  const photo = photos[index];
  const prev = pos > 0 ? viewable[pos - 1] : null;
  const next = pos >= 0 && pos < viewable.length - 1 ? viewable[pos + 1] : null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" && prev !== null) {
      e.preventDefault();
      onIndex(prev);
    } else if (e.key === "ArrowRight" && next !== null) {
      e.preventDefault();
      onIndex(next);
    }
  };

  // Horizontal swipe moves between photos; a second finger (pinch) or an
  // already-zoomed page cancels it so native pinch-zoom stays untouched.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, multi: e.touches.length > 1 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touch.current && e.touches.length > 1) touch.current.multi = true;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start || start.multi) return;
    if ((window.visualViewport?.scale ?? 1) > 1.01) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    const to = dx < 0 ? next : prev;
    if (to !== null) onIndex(to);
  };

  const isFailed = failed.has(index);

  return (
    <dialog
      ref={ref}
      className="tt-photo-viewer"
      aria-label={`${photo.label} photo`}
      onKeyDown={onKeyDown}
      onClose={onClose}
      // The dialog itself is the backdrop; clicks on its children bubble
      // here with a different target.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tt-photo-viewer-top">
        <span className="tt-photo-viewer-pos" aria-live="polite">
          {pos + 1} of {viewable.length}
        </span>
        <button
          type="button"
          className="tt-photo-viewer-btn"
          aria-label="Close photo"
          onClick={onClose}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div
        className="tt-photo-viewer-stage"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {isFailed ? (
          <div className="tt-photo-viewer-error" role="alert">
            <p>This photo link expired. Reload the page to see it.</p>
            <button
              type="button"
              className="tt-photo-viewer-reload"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, sized by CSS
          <img
            key={index}
            className="tt-photo-viewer-img"
            src={photo.url ?? undefined}
            alt={`${photo.label} photo`}
            onError={() => setFailed((s) => new Set(s).add(index))}
          />
        )}
        <button
          type="button"
          className="tt-photo-viewer-btn tt-photo-viewer-prev"
          aria-label="Previous photo"
          disabled={prev === null}
          onClick={() => prev !== null && onIndex(prev)}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          className="tt-photo-viewer-btn tt-photo-viewer-next"
          aria-label="Next photo"
          disabled={next === null}
          onClick={() => next !== null && onIndex(next)}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <p className="tt-photo-viewer-caption">
        {photo.label} · {photo.time}
        {photo.received ? (
          <span className="tt-record-received">received {photo.received}</span>
        ) : null}
      </p>
    </dialog>
  );
}
