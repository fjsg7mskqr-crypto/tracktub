import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Render the value in mono (`.input.mono`) — for tokens/IDs. */
  mono?: boolean;
}

/** Text input — maps to `.input`. */
export function Input({ mono = false, className, ...rest }: InputProps) {
  const cls = ["input", mono ? "mono" : "", className]
    .filter(Boolean)
    .join(" ");
  return <input className={cls} {...rest} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Multiline input — maps to `.textarea`. */
export function Textarea({ className, ...rest }: TextareaProps) {
  const cls = ["textarea", className].filter(Boolean).join(" ");
  return <textarea className={cls} {...rest} />;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children?: ReactNode;
}

/** Native select styled as `.input`. */
export function Select({ className, children, ...rest }: SelectProps) {
  const cls = ["input", className].filter(Boolean).join(" ");
  return (
    <select className={cls} {...rest}>
      {children}
    </select>
  );
}

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Use the legacy mono-caps `.label` (data-record look) instead of the
   *  de-teched sentence-case sans default. */
  eyebrow?: boolean;
  children?: ReactNode;
}

/**
 * Form label. Defaults to sentence-case sans (`.field-label`) per the
 * de-techify pass; pass `eyebrow` for the legacy mono-caps `.label`.
 */
export function Label({
  eyebrow = false,
  className,
  children,
  ...rest
}: LabelProps) {
  const cls = [eyebrow ? "label" : "field-label", className]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={cls} {...rest}>
      {children}
    </label>
  );
}
