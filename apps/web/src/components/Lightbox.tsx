"use client";

import { useEffect } from "react";
import { Icon } from "@/components/Icon";

/** Full-screen, uncropped view of a captured photo. Closes on Esc, on the
 *  backdrop, or via the Close button — all keyboard-operable. Lightweight by
 *  design — no focus-trap dependency (demo). */
export function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(4,5,6,.86)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      {/* Backdrop is a real button so closing works by mouse AND keyboard. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          inset: 0,
          border: "none",
          background: "transparent",
          cursor: "zoom-out",
          padding: 0,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- captured data URL, not a static asset */}
      <img
        src={src}
        alt={alt}
        style={{
          position: "relative",
          maxWidth: "min(1100px, 96vw)",
          maxHeight: "92vh",
          objectFit: "contain",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.16)",
          boxShadow: "0 24px 80px rgba(0,0,0,.6)",
          pointerEvents: "none",
        }}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "fixed",
          top: 16,
          right: 18,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 11px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.16)",
          background: "rgba(20,22,26,.7)",
          color: "#fff",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        <Icon
          name="plus"
          size={14}
          stroke={1.8}
          style={{ transform: "rotate(45deg)" }}
        />
        Close
      </button>
    </div>
  );
}
