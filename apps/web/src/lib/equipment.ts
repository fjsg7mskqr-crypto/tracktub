// Equipment type labels and warranty display helpers (issue #151).

export type EquipmentType =
  | "tub_shell"
  | "pump"
  | "heater"
  | "cover"
  | "filter"
  | "control_pack"
  | "other";

export const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: "pump", label: "Pump" },
  { value: "heater", label: "Heater" },
  { value: "cover", label: "Cover" },
  { value: "filter", label: "Filter" },
  { value: "control_pack", label: "Control pack" },
  { value: "tub_shell", label: "Tub/Shell" },
  { value: "other", label: "Other" },
];

/**
 * The standard components shown as the "what's on this tub" checklist row
 * (issue #224). `other` is excluded — it's reached via "+ Add other / another".
 */
export const CHECKLIST_TYPES = EQUIPMENT_TYPES.filter((t) => t.value !== "other");

export function equipmentTypeLabel(type: EquipmentType): string {
  return EQUIPMENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

/** spill pill tone for warranty — green is success-only; expired = warn. */
export function warrantyTone(
  warrantyUntil: string | null,
  today: string
): "warn" | "neutral" | null {
  if (!warrantyUntil) return null;
  if (warrantyUntil < today) return "warn";
  return "neutral";
}

export function warrantyLabel(
  warrantyUntil: string | null,
  today: string
): string | null {
  if (!warrantyUntil) return null;
  if (warrantyUntil < today) return "Warranty expired";
  return `Warranty until ${formatShortDate(warrantyUntil)}`;
}

function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateOnly(isoDate: string | null): string {
  if (!isoDate) return "—";
  return formatShortDate(isoDate);
}
