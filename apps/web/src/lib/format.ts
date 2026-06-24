import type { IssueTag, PhotoSlot } from "./types";
import { ISSUE_TAGS } from "./types";

export function id(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function shareToken(): string {
  return (
    Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8)
  );
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  return `${weeks}w ago`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function tagLabel(tag: IssueTag): string {
  return ISSUE_TAGS.find((t) => t.tag === tag)?.label ?? tag;
}

// Deterministic placeholder gradient per photo slot (demo without real images).
const SLOT_TINT: Record<PhotoSlot, [string, string]> = {
  wide: ["#0e7490", "#155e63"],
  waterline: ["#0891b2", "#0e7490"],
  panel: ["#334155", "#1e293b"],
  cover: ["#475569", "#334155"],
  full_frame: ["#0e7490", "#155e63"],
  water_level: ["#0891b2", "#0e7490"],
  issue: ["#7f1d1d", "#450a0a"],
};

export function slotTint(slot: PhotoSlot): [string, string] {
  return SLOT_TINT[slot];
}
