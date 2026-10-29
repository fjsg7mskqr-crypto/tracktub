"use client";

import { useState } from "react";
import { photoPublicUrl } from "@/lib/supabase/storage";
import { PHOTO_KINDS, type PhotoKind, type VisitPhoto } from "@/lib/visit";

/**
 * Downscale to a 2048px long edge and re-encode as JPEG. Re-encoding through
 * a canvas also drops EXIF (location) before the photo leaves the phone.
 * Falls back to the original file when the browser can't decode it.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas
      .getContext("2d")
      ?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * Screen 8. Full-screen camera for one photo kind. The shutter opens the
 * phone's camera directly (`capture="environment"`) — never the camera roll.
 * Last visit's shot of the same kind sits bottom-left to frame against.
 */
export function CameraSheet({
  kind,
  lastShot,
  onCaptured,
  onClose,
}: {
  kind: PhotoKind;
  lastShot: VisitPhoto | null;
  onCaptured: (file: File, capturedAt: string) => void;
  onClose: () => void;
}) {
  const [framing, setFraming] = useState(true);
  const label = PHOTO_KINDS[kind].label;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Camera · ${label}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "#000000",
        color: "var(--tt-text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "calc(12px + env(safe-area-inset-top)) 16px 12px",
        }}
      >
        <button
          type="button"
          aria-label="Close camera"
          onClick={onClose}
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            border: 0,
            background: "rgba(255,255,255,0.12)",
            color: "var(--tt-text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{label}</span>
        <span style={{ width: 44 }} />
      </div>

      <div
        style={{
          flex: 1,
          margin: "0 12px",
          borderRadius: 28,
          background: "#16263F",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 24,
          textAlign: "center",
        }}
      >
        {lastShot && framing ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- storage URL, sized by CSS */}
            <img
              src={photoPublicUrl(lastShot.storagePath)}
              alt="Last visit's shot"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.35,
              }}
            />
            <button
              type="button"
              onClick={() => setFraming(false)}
              style={{
                position: "absolute",
                left: 14,
                bottom: 14,
                width: 92,
                height: 120,
                borderRadius: 16,
                border: "2px solid rgba(255,255,255,0.5)",
                background: `center / cover no-repeat url("${photoPublicUrl(lastShot.storagePath)}")`,
                display: "flex",
                alignItems: "flex-end",
                padding: 8,
                boxSizing: "border-box",
                fontFamily: "inherit",
                textAlign: "left",
                color: "#E3EAF6",
                fontSize: 11,
                lineHeight: 1.3,
              }}
            >
              Last visit
              <br />
              frame to match
            </button>
            <span
              style={{ position: "relative", fontSize: 15, color: "#E3EAF6" }}
            >
              Stand where last visit&apos;s shot was taken, then tap the
              shutter.
            </span>
          </>
        ) : (
          <span style={{ fontSize: 15, color: "#9FB3D6" }}>
            {lastShot
              ? "Tap the shutter to open the camera."
              : "No earlier photo to match. Get the whole tub in frame, then tap the shutter."}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px 32px calc(28px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            minWidth: 64,
            height: 44,
            border: 0,
            background: "transparent",
            color: "#C4C8CF",
            fontSize: 16,
            fontWeight: 500,
            fontFamily: "inherit",
            textAlign: "left",
            padding: 0,
          }}
        >
          Skip
        </button>
        <label
          aria-label="Take photo"
          style={{
            width: 76,
            height: 76,
            borderRadius: 999,
            border: "4px solid var(--tt-text)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <span
            style={{
              width: 58,
              height: 58,
              borderRadius: 999,
              background: "var(--tt-text)",
            }}
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onCaptured(file, new Date().toISOString());
            }}
            style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
          />
        </label>
        <span
          style={{
            minWidth: 64,
            textAlign: "right",
            fontSize: 12,
            lineHeight: 1.3,
            color: "var(--tt-text-3)",
          }}
        >
          Camera only
          <br />
          no uploads
        </span>
      </div>
    </div>
  );
}
