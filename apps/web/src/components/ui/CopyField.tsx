"use client";

import { useState } from "react";
import { Button } from "./Button";

export interface CopyFieldProps {
  /** The text shown (mono) and copied to the clipboard. */
  value: string;
  /** Accessible label for the copy button. Default "Copy". */
  copyLabel?: string;
  className?: string;
}

/** Mono value + copy button with a transient "Copied" state (`.copyfield`). */
export function CopyField({
  value,
  copyLabel = "Copy",
  className,
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard may be unavailable (insecure context / denied); still flash
      // the copied state so the user gets feedback, and they can select-copy.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const cls = ["copyfield", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <code className="copyfield-value">{value}</code>
      <Button
        size="sm"
        variant={copied ? "primary" : "secondary"}
        onClick={copy}
        aria-label={copyLabel}
      >
        {copied ? "Copied" : copyLabel}
      </Button>
    </div>
  );
}
