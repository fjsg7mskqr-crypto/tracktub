import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";

/**
 * Primary action button in the "Water" style — brand blue (#2563eb) fill, full
 * width by default, large touch target. Green is never used here (status only).
 */
export function FieldButton({
  children,
  variant = "primary",
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  const isPrimary = variant === "primary";
  return (
    <button
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        minHeight: 52,
        padding: "14px 20px",
        border: isPrimary
          ? "1px solid var(--field-accent)"
          : "1px solid rgba(8, 9, 10, 0.14)",
        borderRadius: 12,
        background: isPrimary ? "var(--field-accent)" : "var(--field-card)",
        color: isPrimary ? "#ffffff" : "var(--field-ink)",
        fontFamily: "var(--font-sans)",
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: "0.01em",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
