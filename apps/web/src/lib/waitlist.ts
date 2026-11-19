/** Optional waitlist fields: who signed up and how many tubs they look after.
 *  Mirrors the CHECK constraints on public.waitlist (role, tub_count). */
export const WAITLIST_ROLES = [
  { value: "property_manager", label: "Property manager" },
  { value: "hot_tub_tech", label: "Hot tub tech" },
  { value: "host_owner", label: "Host or owner" },
  { value: "other", label: "Other" },
] as const;

export type WaitlistRole = (typeof WAITLIST_ROLES)[number]["value"];

export const MAX_TUB_COUNT = 1000;

/** Empty / missing → null (ok). A present value that isn't a known role → undefined (invalid). */
export function parseRole(raw: unknown): WaitlistRole | null | undefined {
  if (raw === undefined || raw === null || raw === "") return null;
  const hit = WAITLIST_ROLES.find((r) => r.value === raw);
  return hit ? hit.value : undefined;
}

/** Empty / missing → null (ok). A whole number 0–1000 (number or digit string) → that number.
 *  Anything else → undefined (invalid). */
export function parseTubCount(raw: unknown): number | null | undefined {
  if (raw === undefined || raw === null || raw === "") return null;
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string" && /^\d{1,4}$/.test(raw.trim())
        ? Number(raw.trim())
        : NaN;
  return Number.isInteger(n) && n >= 0 && n <= MAX_TUB_COUNT ? n : undefined;
}
