import type { HTMLAttributes, ReactNode } from "react";

export interface MonoProps extends HTMLAttributes<HTMLSpanElement> {
  children?: ReactNode;
}

/**
 * Mono/data text helper (`.mono`, tabular figures). Reserve mono for data —
 * tokens, timestamps, IDs, counts — not UI chrome. `Data` is an alias that
 * reads clearly at call sites.
 */
export function Mono({ className, children, ...rest }: MonoProps) {
  const cls = ["mono", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

/** Semantic alias of {@link Mono} — use for displayed data values. */
export const Data = Mono;
