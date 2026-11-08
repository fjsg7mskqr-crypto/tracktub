/** Normalize + validate a waitlist email. Returns the trimmed, lowercased
 *  address, or throws on anything that isn't a plausible email. Mirrors the
 *  `waitlist_insert` RLS check so client, server action, and DB agree. */
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.indexOf("@");
  const domain = at >= 0 ? email.slice(at + 1) : "";
  if (
    email.length < 3 ||
    email.length > 320 ||
    at < 1 ||
    !domain.includes(".") ||
    /\s/.test(email)
  ) {
    throw new Error("Invalid email address");
  }
  return email;
}
