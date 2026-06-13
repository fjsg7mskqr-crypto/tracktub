import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import Link from "next/link";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Apply `.pad` (20px padding). Default true. */
  pad?: boolean;
  children?: ReactNode;
}

/** Maps to `.card` (+ `.pad`). */
export function Card({ pad = true, className, children, ...rest }: CardProps) {
  const cls = ["card", pad ? "pad" : "", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export interface CardLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  href: string;
  pad?: boolean;
  children?: ReactNode;
}

/** Hover-lift card link (`.card.card-link`). */
export function CardLink({
  href,
  pad = true,
  className,
  children,
  ...rest
}: CardLinkProps) {
  const cls = ["card", "card-link", pad ? "pad" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}
