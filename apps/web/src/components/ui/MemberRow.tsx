import type { ReactNode } from "react";
import { Avatar, type AvatarVariant } from "./Avatar";

export interface MemberRowProps {
  /** Display name (or email) — also seeds the avatar initials. */
  name: string;
  /** Secondary line (email, activity, assigned properties). */
  subtitle?: ReactNode;
  avatarVariant?: AvatarVariant;
  /** Trailing role badge / status. */
  badge?: ReactNode;
  /** Trailing actions (buttons). */
  actions?: ReactNode;
  className?: string;
}

/** Avatar · identity · role badge · actions — maps to `.memberrow`. */
export function MemberRow({
  name,
  subtitle,
  avatarVariant = "neutral",
  badge,
  actions,
  className,
}: MemberRowProps) {
  const cls = ["memberrow", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <Avatar name={name} variant={avatarVariant} />
      <div className="memberrow-id">
        <div className="memberrow-name">{name}</div>
        {subtitle != null ? (
          <div className="memberrow-sub">{subtitle}</div>
        ) : null}
      </div>
      {badge}
      {actions != null ? (
        <div className="memberrow-actions">{actions}</div>
      ) : null}
    </div>
  );
}
