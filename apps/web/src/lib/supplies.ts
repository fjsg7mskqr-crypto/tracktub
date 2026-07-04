// Supply types, suggested items, and low-stock helpers (issue #152).

export interface Supply {
  id: string;
  name: string;
  unit: string | null;
  quantity: number | null;
  reorderAt: number | null;
  lastRestockedAt: string | null;
  notes: string | null;
}

/**
 * Suggested consumables offered in the add form's name field (free-text still
 * allowed). Ordered roughly by how often a hot-tub turnover touches them.
 */
export const SUGGESTED_SUPPLIES: string[] = [
  "Chlorine granules",
  "Bromine tablets",
  "pH Down",
  "pH Up",
  "Alkalinity increaser",
  "Calcium hardness increaser",
  "Shock / oxidizer",
  "Filter cartridge",
  "Test strips",
  "Clarifier",
  "Cover cleaner",
];

/**
 * Low when there's a threshold and on-hand quantity is at or below it. A missing
 * quantity or reorder point is treated as "not tracked" (never low) — a supply
 * you haven't set a threshold on shouldn't nag.
 */
export function isLow(supply: Pick<Supply, "quantity" | "reorderAt">): boolean {
  if (supply.reorderAt == null || supply.quantity == null) return false;
  return supply.quantity <= supply.reorderAt;
}

/** Count of at-or-below-threshold items in a list. */
export function countLow(items: Pick<Supply, "quantity" | "reorderAt">[]): number {
  return items.reduce((n, s) => (isLow(s) ? n + 1 : n), 0);
}

/** Human-readable on-hand summary, e.g. "3 lb" or "12 tabs" or "—" when untracked. */
export function quantityLabel(supply: Pick<Supply, "quantity" | "unit">): string {
  if (supply.quantity == null) return "—";
  const qty = formatQuantity(supply.quantity);
  return supply.unit ? `${qty} ${supply.unit}` : qty;
}

/** Trim trailing zeros so 3.0 reads "3" but 2.5 stays "2.5". */
export function formatQuantity(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export function formatDateOnly(isoDate: string | null): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
