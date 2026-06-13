import type { HTMLAttributes, ReactNode } from "react";

export interface TileProps extends HTMLAttributes<HTMLDivElement> {
  /** The label (`.k` — mono caps). */
  label: ReactNode;
  /** The value (`.v` — large sans). */
  value: ReactNode;
  /** Optional sub-line (`.sub`). */
  sub?: ReactNode;
}

/** Stat tile — maps to `.tile` with `.k` / `.v` / `.sub`. */
export function Tile({ label, value, sub, className, ...rest }: TileProps) {
  const cls = ["tile", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
      {sub != null ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

/** Responsive auto-fit grid for tiles (`.tiles`). */
export function Tiles({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const cls = ["tiles", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
