import type { Photo, PhotoSlot } from "@/lib/types";
import { PHOTO_SLOTS } from "@/lib/types";
import { slotTint } from "@/lib/format";
import { Icon, type IconName } from "@/components/Icon";

const SLOT_ICON: Record<PhotoSlot, IconName> = {
  wide: "camera",
  waterline: "droplet",
  panel: "gauge",
  cover: "shield",
};

export function PhotoThumb({ photo }: { photo: Photo }) {
  const meta = PHOTO_SLOTS.find((s) => s.slot === photo.slot);
  const label = meta?.label ?? photo.slot;
  const idx = PHOTO_SLOTS.findIndex((s) => s.slot === photo.slot) + 1;
  const hasIssue = photo.confirmedTags.length > 0;
  const [a, b] = slotTint(photo.slot);

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
      <div
        style={{
          position: "relative",
          aspectRatio: "4 / 3",
          borderRadius: 5,
          overflow: "hidden",
          display: "grid",
          placeItems: "center",
          color: "rgba(255,255,255,.92)",
          background: `linear-gradient(155deg, ${a}, ${b}), repeating-linear-gradient(180deg, rgba(255,255,255,.045) 0 1px, transparent 1px 9px)`,
          boxShadow: "inset 0 0 40px rgba(0,0,0,.35)",
        }}
      >
        <Icon name={SLOT_ICON[photo.slot]} size={30} stroke={1.4} style={{ opacity: 0.82 }} />
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
      </div>
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
    </figure>
  );
}
