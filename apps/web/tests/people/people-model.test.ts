import { describe, it, expect } from "vitest";
import { accessLabel, parseAccess, type Person } from "@/lib/people";

function form(all: boolean, props: string[] = []): FormData {
  const fd = new FormData();
  if (all) fd.set("all", "on");
  for (const p of props) fd.append("property", p);
  return fd;
}

const person = (over: Partial<Person> = {}): Person => ({
  userId: "u1",
  name: "Sam",
  email: "sam@example.com",
  isAdmin: false,
  allProperties: true,
  propertyIds: [],
  ...over,
});

describe("accessLabel", () => {
  it("admin always sees all", () => {
    expect(accessLabel(person({ isAdmin: true, allProperties: false }))).toBe(
      "All properties"
    );
  });
  it("all properties", () => {
    expect(accessLabel(person())).toBe("All properties");
  });
  it("one property", () => {
    expect(
      accessLabel(person({ allProperties: false, propertyIds: ["a"] }))
    ).toBe("1 property");
  });
  it("several properties", () => {
    expect(
      accessLabel(
        person({ allProperties: false, propertyIds: ["a", "b", "c"] })
      )
    ).toBe("3 properties");
  });
});

describe("parseAccess", () => {
  it("all on ignores picks", () => {
    expect(parseAccess(form(true, ["a"]))).toEqual({
      ok: true,
      allProperties: true,
      propertyIds: [],
    });
  });
  it("narrowed keeps unique picks", () => {
    expect(parseAccess(form(false, ["a", "b", "a"]))).toEqual({
      ok: true,
      allProperties: false,
      propertyIds: ["a", "b"],
    });
  });
  it("narrowed with none is refused", () => {
    expect(parseAccess(form(false))).toEqual({
      ok: false,
      error: "Pick at least one property, or turn on All properties.",
    });
  });
});
