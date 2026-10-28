// People screen model (D29). Pure so the rules are unit-testable; the server
// actions in src/lib/actions/people.ts do the writes.

/** A login on the account. The admin (operator) always sees every property. */
export type Person = {
  userId: string;
  name: string;
  email: string;
  isAdmin: boolean;
  allProperties: boolean;
  propertyIds: string[];
};

/** An invite link not yet used. */
export type PendingInvite = {
  id: string;
  email: string | null;
  token: string;
  allProperties: boolean;
  propertyIds: string[];
};

export function countLabel(n: number): string {
  return n === 1 ? "1 property" : `${n} properties`;
}

export function accessLabel(
  p: Pick<Person, "isAdmin" | "allProperties" | "propertyIds">
): string {
  return p.isAdmin || p.allProperties
    ? "All properties"
    : countLabel(p.propertyIds.length);
}

export type AccessParse =
  | { ok: true; allProperties: boolean; propertyIds: string[] }
  | { ok: false; error: string };

/** Reads the access picker: `all` ("on") and repeated `property` ids. */
export function parseAccess(fd: FormData): AccessParse {
  if (fd.get("all") === "on")
    return { ok: true, allProperties: true, propertyIds: [] };
  const propertyIds = [
    ...new Set(
      fd
        .getAll("property")
        .filter((v): v is string => typeof v === "string" && v !== "")
    ),
  ];
  if (propertyIds.length === 0)
    return {
      ok: false,
      error: "Pick at least one property, or turn on All properties.",
    };
  return { ok: true, allProperties: false, propertyIds };
}
