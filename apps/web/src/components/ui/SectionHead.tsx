import type { HTMLAttributes, ReactNode } from "react";

export interface SectionHeadProps extends HTMLAttributes<HTMLDivElement> {
  /** Heading element to render the label as. Default `span`. */
  as?: "span" | "h2" | "h3";
  children: ReactNode;
}

/** Rule-trailing section header — maps to `.sectionhead`. */
export function SectionHead({
  as = "span",
  className,
  children,
  ...rest
}: SectionHeadProps) {
  const cls = ["sectionhead", className].filter(Boolean).join(" ");
  const Tag = as;
  return (
    <div className={cls} {...rest}>
      <Tag>{children}</Tag>
    </div>
  );
}
