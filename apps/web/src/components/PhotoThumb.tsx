"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { Photo, PhotoSlot } from "@/lib/types";
import { PHOTO_SLOTS } from "@/lib/types";
import { slotTint } from "@/lib/format";
import { Icon, type IconName } from "@/components/Icon";
import { Lightbox } from "@/components/Lightbox";

const SLOT_ICON: Record<PhotoSlot, IconName> = {
  wide: "camera",
  waterline: "droplet",
  panel: "gauge",
  cover: "shield",
  full_frame: "camera",
  water_level: "droplet",
  issue: "alert",
};

export function PhotoThumb({
  photo,
  enlargeable = false,
}: {
  photo: Photo;
  /** When set and a real image is present, the tile opens a full-size lightbox. */
  enlargeable?: boolean;
}) {
  const meta = PHOTO_SLOTS.find((s) => s.slot === photo.slot);
  const label = meta?.label ?? photo.slot;
  const idx = PHOTO_SLOTS.findIndex((s) => s.slot === photo.slot) + 1;
  const hasIssue = photo.confirmedTags.length > 0;
  const [a, b] = slotTint(photo.slot);
  const hasImage = photo.dataUrl != null;
  const canEnlarge = enlargeable && hasImage;
  const [open, setOpen] = useState(false);

  const frameStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    aspectRatio: "4 / 3",
    borderRadius: 5,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    color: "rgba(255,255,255,.92)",
    background: `linear-gradient(155deg, ${a}, ${b}), repeating-linear-gradient(180deg, rgba(255,255,255,.045) 0 1px, transparent 1px 9px)`,
    boxShadow: "inset 0 0 40px rgba(0,0,0,.35)",
  };

  const frameInner = (
    <>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- captured data URL, not a static asset
        <img
          src={photo.dataUrl as string}
          alt={`${label} photo`}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <Icon
          name={SLOT_ICON[photo.slot]}
          size={30}
          stroke={1.4}
          style={{ opacity: 0.82 }}
        />
      )}
      {hasIssue && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            display: "inline-flex",
            color: "#fff",
            background: "var(--urgent)",
            borderRadius: 5,
            padding: "2px 4px",
          }}
        >
          <Icon name="alert" size={13} stroke={1.8} />
        </span>
      )}
    </>
  );

  return (
    <figure
      style={{
        margin: 0,
        background: "var(--surface-2)",
        border: `1px solid ${hasIssue ? "var(--urgent-line)" : "var(--border)"}`,
        borderRadius: 9,
        padding: 6,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {canEnlarge ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Enlarge ${label} photo`}
          style={{
            ...frameStyle,
            appearance: "none",
            padding: 0,
            border: "none",
            font: "inherit",
            cursor: "zoom-in",
          }}
        >
          {frameInner}
        </button>
      ) : (
        <div style={frameStyle}>{frameInner}</div>
      )}

      <figcaption
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          padding: "5px 2px 1px",
        }}
      >
        <span>{label}</span>
        <span>{String(idx).padStart(2, "0")}</span>
      </figcaption>

      {canEnlarge && open && (
        <Lightbox
          src={photo.dataUrl as string}
          alt={`${label} photo`}
          onClose={() => setOpen(false)}
        />
      )}
    </figure>
  );
}
