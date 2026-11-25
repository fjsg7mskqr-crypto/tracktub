/** "Nov 24, 9:42 AM EST" in `tz`; "—" when missing. */
export function formatDateTime(iso: string | null, tz: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
