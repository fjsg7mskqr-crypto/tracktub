import { Fragment } from "react";
import type { HTMLAttributes, ReactNode } from "react";

export interface KeyValueItem {
  label: ReactNode;
  value: ReactNode;
}

export interface KeyValueProps extends HTMLAttributes<HTMLDListElement> {
  items: KeyValueItem[];
}

/** Key/value record list — maps to `.kv` (dl/dt/dd). */
export function KeyValue({ items, className, ...rest }: KeyValueProps) {
  const cls = ["kv", className].filter(Boolean).join(" ");
  return (
    <dl className={cls} {...rest}>
      {items.map((it, i) => (
        <Fragment key={i}>
          <dt>{it.label}</dt>
          <dd>{it.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
