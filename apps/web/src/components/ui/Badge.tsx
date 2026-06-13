import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "neutral" | "ok" | "brand" | "warn" | "danger";
export type StatusTone = "neutral" | "ok" | "warn" | "danger";

const BADGE_CLASS: Record<BadgeVariant, string> = {
  neutral: "",
  ok: "ok",
  brand: "brand",
  warn: "warn",
  danger: "danger",
};

const DOT_CLASS: Record<StatusTone, string> = {
  neutral: "",
  ok: "ok",
  warn: "warn",
  danger: "danger",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children?: ReactNode;
}

/** Maps to `.badge` (+ `.ok` / `.brand` / `.warn` / `.danger`). */
export function Badge({
  variant = "neutral",
  className,
  children,
  ...rest
}: BadgeProps) {
  const cls = ["badge", BADGE_CLASS[variant], className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

/** Small status dot (`.dot` + tone). */
export function Dot({
  tone = "neutral",
  className,
  ...rest
}: { tone?: StatusTone } & HTMLAttributes<HTMLSpanElement>) {
  const cls = ["dot", DOT_CLASS[tone], className].filter(Boolean).join(" ");
  return <span className={cls} aria-hidden="true" {...rest} />;
}
