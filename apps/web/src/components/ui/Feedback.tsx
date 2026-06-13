import type { HTMLAttributes, ReactNode } from "react";

export interface NoteProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "warn";
  children?: ReactNode;
}

/** Inline note panel — maps to `.note` (+ `.warn`). */
export function Note({
  variant = "default",
  className,
  children,
  ...rest
}: NoteProps) {
  const cls = ["note", variant === "warn" ? "warn" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

/** Centered empty-state copy — maps to `.empty`. */
export function EmptyState({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const cls = ["empty", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

/** Loading placeholder — maps to `.skeleton`. */
export function Skeleton({
  className,
  children = "Loading…",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const cls = ["skeleton", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
