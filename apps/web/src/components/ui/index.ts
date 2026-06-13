// TrackTub design system — typed React components that codify the shipped
// `globals.css` language (issue #96). Source of truth for tokens stays
// `globals.css` + `branding/`. Mono is reserved for data; UI chrome is sans.

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Badge, Dot } from "./Badge";
export type { BadgeProps, BadgeVariant, StatusTone } from "./Badge";

export { Card, CardLink } from "./Card";
export type { CardProps, CardLinkProps } from "./Card";

export { Tile, Tiles } from "./Tile";
export type { TileProps } from "./Tile";

export { KeyValue } from "./KeyValue";
export type { KeyValueItem, KeyValueProps } from "./KeyValue";

export { SectionHead } from "./SectionHead";
export type { SectionHeadProps } from "./SectionHead";

export { Input, Textarea, Select, Label } from "./Input";
export type {
  InputProps,
  TextareaProps,
  SelectProps,
  LabelProps,
} from "./Input";

export { Note, EmptyState, Skeleton } from "./Feedback";
export type { NoteProps } from "./Feedback";

export { Toast } from "./Toast";
export type { ToastProps } from "./Toast";

export { Mono, Data } from "./Text";
export type { MonoProps } from "./Text";

export { Avatar, initialsOf } from "./Avatar";
export type { AvatarProps, AvatarSize, AvatarVariant } from "./Avatar";

export { SegmentedControl } from "./SegmentedControl";
export type {
  SegmentedControlProps,
  SegmentedOption,
} from "./SegmentedControl";

export { CopyField } from "./CopyField";
export type { CopyFieldProps } from "./CopyField";

export { MemberRow } from "./MemberRow";
export type { MemberRowProps } from "./MemberRow";

export { Modal } from "./Modal";
export type { ModalProps } from "./Modal";
