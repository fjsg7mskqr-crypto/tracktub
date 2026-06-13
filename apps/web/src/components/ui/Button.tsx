import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "primary",
  secondary: "",
  ghost: "ghost",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full-width (`.btn.block`). */
  block?: boolean;
  /** Optional leading icon. */
  icon?: IconName;
  children?: ReactNode;
}

/** Maps 1:1 to `.btn` (+ `.primary` / `.ghost` / `.sm` / `.block`). */
export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  icon,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const cls = [
    "btn",
    VARIANT_CLASS[variant],
    size === "sm" ? "sm" : "",
    block ? "block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {icon ? <Icon name={icon} size={size === "sm" ? 15 : 16} /> : null}
      {children}
    </button>
  );
}
