"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { FieldButton } from "@/components/field/FieldButton";
import { FieldScreenHeader } from "@/components/field/FieldScreenHeader";
import { saveGuidedPhotoAction, type DraftSnapshot } from "@/lib/actions/turnover";
import { photoPublicUrl } from "@/lib/supabase/storage";
import type { CapturePhase, PhotoSlot } from "@/lib/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * A single full-screen, one-anchor capture step in the "Water" style. The whole
 * job is one photo: a big camera control (native capture), an obvious retake,
 * and a blue "Next" gated on a photo that is actually stored server-side.
 *
 * Every capture persists immediately via `saveGuidedPhotoAction` (the same
 * access-checked action the console wizard uses), so backgrounding or reloading
 * mid-flow loses nothing — the parent recomputes the resume step from the
 * returned snapshot.
 */
export function CaptureAnchor({
  propertyId,
  turnoverId,
  slot,
  phase,
  title,
  hint,
  stepLabel,
  storedPath,
  onSaved,
  onNext,
  onBack,
  nextLabel = "Next",
}: {
  propertyId: string;
  turnoverId: string;
  slot: PhotoSlot;
  phase: CapturePhase;
  title: string;
  hint: string;
  stepLabel: string;
  storedPath: string | null;
  onSaved: (snapshot: DraftSnapshot) => void;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Revoke the object URL when it is replaced or the step unmounts.
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const storedPreview = storedPath ? photoPublicUrl(storedPath) : null;
  const preview = localPreview ?? storedPreview;
  const hasPhoto = !!storedPath || status === "saved";

  function openPicker() {
    setError(null);
    fileRef.current?.click();
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return blobUrl;
    });
    setStatus("saving");
    setError(null);

    const fd = new FormData();
    fd.append("propertyId", propertyId);
    fd.append("turnoverId", turnoverId);
    fd.append("slot", slot);
    fd.append("phase", phase);
    fd.append("file", file);
    fd.append("capturedAt", new Date().toISOString());

    try {
      const snapshot = await saveGuidedPhotoAction(fd);
      setStatus("saved");
      onSaved(snapshot);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Could not save that photo — try again."
      );
    }
  }

  return (
    <main
      style={{
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        minHeight: "100dvh",
      }}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
      />

      <FieldScreenHeader eyebrow={stepLabel} title={title} hint={hint} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {preview ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={title}
              style={{
                width: "100%",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                borderRadius: 18,
                border: "1px solid rgba(8, 9, 10, 0.06)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  color:
                    status === "saving"
                      ? "var(--field-muted)"
                      : status === "error"
                        ? "#ef4444"
                        : "var(--field-ok)",
                }}
              >
                {status === "saving"
                  ? "Saving…"
                  : status === "error"
                    ? "Save failed"
                    : "Captured"}
              </span>
              <button
                type="button"
                onClick={openPicker}
                style={{
                  appearance: "none",
                  background: "transparent",
                  border: "1px solid rgba(8, 9, 10, 0.14)",
                  borderRadius: 12,
                  padding: "10px 18px",
                  minHeight: 44,
                  fontFamily: "var(--font-sans)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--field-ink)",
                  cursor: "pointer",
                }}
              >
                Retake
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            aria-label={`Capture: ${title}`}
            style={{
              appearance: "none",
              font: "inherit",
              width: "100%",
              aspectRatio: "4 / 3",
              border: "2px dashed rgba(37, 99, 235, 0.35)",
              borderRadius: 18,
              background: "var(--field-card)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "var(--field-accent)",
            }}
          >
            <span style={{ display: "grid", gap: 8, placeItems: "center" }}>
              <svg
                width={44}
                height={44}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                Tap to take the photo
              </span>
            </span>
          </button>
        )}

        {error && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "#ef4444",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FieldButton
          type="button"
          onClick={onNext}
          disabled={!hasPhoto || status === "saving"}
          style={{
            opacity: !hasPhoto || status === "saving" ? 0.5 : 1,
            cursor: !hasPhoto || status === "saving" ? "default" : "pointer",
          }}
        >
          {nextLabel}
        </FieldButton>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              appearance: "none",
              background: "transparent",
              border: "none",
              padding: "8px",
              minHeight: 44,
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--field-muted)",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        )}
      </div>
    </main>
  );
}
