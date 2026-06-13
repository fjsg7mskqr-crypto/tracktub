"use client";

import { useEffect } from "react";
import type { HTMLAttributes, ReactNode } from "react";

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  /** Auto-dismiss after N ms; calls `onDismiss` when elapsed. */
  duration?: number;
  onDismiss?: () => void;
  children?: ReactNode;
}

/** Fixed bottom-center toast — maps to `.toast`. */
export function Toast({
  duration,
  onDismiss,
  className,
  children,
  ...rest
}: ToastProps) {
  useEffect(() => {
    if (!duration || !onDismiss) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  const cls = ["toast", className].filter(Boolean).join(" ");
  return (
    <div className={cls} role="status" aria-live="polite" {...rest}>
      {children}
    </div>
  );
}
