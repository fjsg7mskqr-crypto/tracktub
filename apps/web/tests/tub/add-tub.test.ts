import { describe, it, expect } from "vitest";
import { NEW_CLIENT, parseAddTub } from "@/components/tub/add-tub";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseAddTub", () => {
  it("requires a name", () => {
    expect(parseAddTub(form({ name: "  ", client: "" }))).toEqual({
      ok: false,
      error: "Name is required.",
    });
  });

  it("requires a name for a new client", () => {
    expect(
      parseAddTub(
        form({ name: "Cedar Cabin", client: NEW_CLIENT, new_client: " " })
      )
    ).toEqual({ ok: false, error: "Client name is required." });
  });

  it.each(["abc", "0", "5001", "12.5"])("rejects volume %s", (volume) => {
    expect(parseAddTub(form({ name: "Cedar Cabin", volume }))).toEqual({
      ok: false,
      error: "Volume must be 1–5000 gallons.",
    });
  });

  it("trims a valid form with an existing client", () => {
    expect(
      parseAddTub(
        form({
          name: " Cedar Cabin ",
          client: "c1",
          address: " 412 Shore Rd ",
          volume: "450",
        })
      )
    ).toEqual({
      ok: true,
      value: {
        name: "Cedar Cabin",
        clientId: "c1",
        newClientName: null,
        address: "412 Shore Rd",
        volumeGallons: 450,
      },
    });
  });

  it("new client, no address or volume", () => {
    expect(
      parseAddTub(
        form({
          name: "Pine Ridge",
          client: NEW_CLIENT,
          new_client: " Lakeview Rentals ",
          address: "",
          volume: "",
        })
      )
    ).toEqual({
      ok: true,
      value: {
        name: "Pine Ridge",
        clientId: null,
        newClientName: "Lakeview Rentals",
        address: null,
        volumeGallons: null,
      },
    });
  });

  it("no client chosen → none", () => {
    const r = parseAddTub(form({ name: "Solo" }));
    expect(r.ok && r.value.clientId).toBeNull();
  });
});
