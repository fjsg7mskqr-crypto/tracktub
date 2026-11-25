import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
  }),
}));

import { getDeviceTimeZone, getTimeZone } from "@/lib/time-zone";
import { TIME_ZONE_COOKIE } from "@/lib/time";

beforeEach(() => jar.clear());

describe("getTimeZone", () => {
  it("returns the cookie's zone when it is valid", async () => {
    jar.set(TIME_ZONE_COOKIE, "America/Los_Angeles");
    expect(await getTimeZone()).toBe("America/Los_Angeles");
  });

  it("falls back to America/Detroit when missing", async () => {
    expect(await getTimeZone()).toBe("America/Detroit");
  });

  it.each(["Mars/Nowhere", "", "x".repeat(100)])(
    "falls back to America/Detroit for %j",
    async (value) => {
      jar.set(TIME_ZONE_COOKIE, value);
      expect(await getTimeZone()).toBe("America/Detroit");
    }
  );
});

describe("getDeviceTimeZone", () => {
  it("is the cookie's zone, or null (never a guessed Detroit)", async () => {
    expect(await getDeviceTimeZone()).toBeNull();
    jar.set(TIME_ZONE_COOKIE, "Nope/Nope");
    expect(await getDeviceTimeZone()).toBeNull();
    jar.set(TIME_ZONE_COOKIE, "America/Denver");
    expect(await getDeviceTimeZone()).toBe("America/Denver");
  });
});
