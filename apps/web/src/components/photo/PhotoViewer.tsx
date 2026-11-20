"use client";

import "./photo-viewer.css";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** One photo the viewer can show. Shared by the report and the visit screen. */
export type ViewerPhoto = {
  label: string;
  url: string | null;
  /** Caption time, already shortened. Omitted when the subtitle says it. */
  time?: string;
  received?: string | null;
  /** Second caption line, e.g. "Last visit · Nov 2". */
  subtitle?: string;
};

export const EXPIRED_NOTE =
  "This photo link expired. Reload the page to see it.";

const SWIPE_PX = 50;

/**
 * Full-screen, uncropped photo viewer (native <dialog>: focus trap, Esc).
 * `viewable` lists the indexes of `photos` that can be shown; prev/next skip
 * the rest. `renderAction` puts per-photo controls (e.g. Retake) at the
 * bottom. Photo URLs expire after an hour, so a failed load offers a reload.
 */
export function PhotoViewer({
  photos,
  viewable,
  index,
  onIndex,
  onClose,
  renderAction,
  expiredNote = EXPIRED_NOTE,
}: Readonly<{
  photos: ViewerPhoto[];
  viewable: number[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  renderAction?: (index: number) => ReactNode;
  expiredNote?: string;
}>) {
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

  // Dialog-level input (arrows, backdrop tap, swipe) is wired natively: the
  // dialog and stage are not controls, and touch listeners stay passive so
  // the browser's pinch-zoom is never blocked. A second finger (pinch) or an
  // already-zoomed page cancels a swipe.
  const latest = useRef({ prev, next, onIndex, onClose });
  useEffect(() => {
    latest.current = { prev, next, onIndex, onClose };
  });
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const { prev, next, onIndex } = latest.current;
      if (e.key === "ArrowLeft" && prev !== null) {
        e.preventDefault();
        onIndex(prev);
      } else if (e.key === "ArrowRight" && next !== null) {
        e.preventDefault();
        onIndex(next);
      }
    };
    // The dialog fills the screen, so a click on it (or the empty stage) is a
    // click outside the photo and controls.
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t === dialog || t.classList.contains("tt-photo-viewer-stage")) {
        latest.current.onClose();
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touch.current = {
        x: t.clientX,
        y: t.clientY,
        multi: e.touches.length > 1,
      };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touch.current && e.touches.length > 1) touch.current.multi = true;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const start = touch.current;
      touch.current = null;
      if (!start || start.multi) return;
      if ((window.visualViewport?.scale ?? 1) > 1.01) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
      const { prev, next, onIndex } = latest.current;
      const to = dx < 0 ? next : prev;
      if (to !== null) onIndex(to);
    };
    dialog.addEventListener("keydown", onKeyDown);
    dialog.addEventListener("click", onClick);
    dialog.addEventListener("touchstart", onTouchStart, { passive: true });
    dialog.addEventListener("touchmove", onTouchMove, { passive: true });
    dialog.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      dialog.removeEventListener("click", onClick);
      dialog.removeEventListener("touchstart", onTouchStart);
      dialog.removeEventListener("touchmove", onTouchMove);
      dialog.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const isFailed = failed.has(index);

  return (
    <dialog
      ref={ref}
      className="tt-photo-viewer"
      aria-label={`${photo.label} photo`}
      onClose={onClose}
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

      <div className="tt-photo-viewer-stage">
        {isFailed ? (
          <div className="tt-photo-viewer-error" role="alert">
            <p>{expiredNote}</p>
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
            alt={photo.label}
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

      {renderAction ? (
        <div className="tt-photo-viewer-actions">{renderAction(index)}</div>
      ) : null}

      <p className="tt-photo-viewer-caption">
        {photo.label}
        {photo.time ? ` · ${photo.time}` : null}
        {photo.subtitle ? (
          <span className="tt-photo-viewer-note">{photo.subtitle}</span>
        ) : null}
        {photo.received ? (
          <span className="tt-photo-viewer-note">
            received {photo.received}
          </span>
        ) : null}
      </p>
    </dialog>
  );
}
