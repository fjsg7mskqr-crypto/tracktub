// Add tub form parsing (spec §4). Pure so the rules are unit-testable; the
// server action in src/app/tubs/new/actions.ts does the writes.

/** Client <select> value meaning "create a new client from the text field". */
export const NEW_CLIENT = "__new__";

export type AddTubInput = {
  name: string;
  clientId: string | null;
  newClientName: string | null;
  address: string | null;
  volumeGallons: number | null;
};

export type AddTubParse =
  { ok: true; value: AddTubInput } | { ok: false; error: string };

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function parseAddTub(fd: FormData): AddTubParse {
  const name = text(fd, "name");
  if (!name) return { ok: false, error: "Name is required." };

  const client = text(fd, "client");
  const newClientName = client === NEW_CLIENT ? text(fd, "new_client") : "";
  if (client === NEW_CLIENT && !newClientName)
    return { ok: false, error: "Client name is required." };

  const rawVolume = text(fd, "volume");
  let volumeGallons: number | null = null;
  if (rawVolume) {
    const n = Number(rawVolume);
    if (!Number.isInteger(n) || n < 1 || n > 5000)
      return { ok: false, error: "Volume must be 1–5000 gallons." };
    volumeGallons = n;
  }

  return {
    ok: true,
    value: {
      name,
      clientId: client && client !== NEW_CLIENT ? client : null,
      newClientName: newClientName || null,
      address: text(fd, "address") || null,
      volumeGallons,
    },
  };
}
