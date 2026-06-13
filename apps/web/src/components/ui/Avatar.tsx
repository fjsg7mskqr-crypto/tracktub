import type { HTMLAttributes } from "react";

export type AvatarSize = "sm" | "md" | "lg";
export type AvatarVariant = "neutral" | "blue";

/** Derive up-to-two uppercase initials from a name or email. */
export function initialsOf(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return "?";
  // Email → use the local part.
  const base = raw.includes("@") ? raw.split("@")[0] : raw;
  const words = base.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Name or email — initials are derived from it. */
  name: string | null | undefined;
  size?: AvatarSize;
  variant?: AvatarVariant;
}

/** Initials avatar — maps to `.avatar` (+ size + `.blue`). */
export function Avatar({
  name,
  size = "md",
  variant = "neutral",
  className,
  ...rest
}: AvatarProps) {
  const cls = ["avatar", size, variant === "blue" ? "blue" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} aria-hidden="true" {...rest}>
      {initialsOf(name)}
    </span>
  );
}
