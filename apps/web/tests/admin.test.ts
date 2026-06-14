import { describe, it, expect } from "vitest";
import { parseAdminEmails, isAdminEmail, appAccessDecision } from "@/lib/admin";

describe("parseAdminEmails", () => {
  it("returns [] for undefined / empty / whitespace", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails("  ,  , ")).toEqual([]);
  });

  it("splits, trims, and lowercases multiple entries", () => {
    expect(parseAdminEmails(" Ethan@NHS-LLC.com , b@x.io ")).toEqual([
      "ethan@nhs-llc.com",
      "b@x.io",
    ]);
  });
});

describe("isAdminEmail", () => {
  const raw = "ethan@nhs-llc.com, b@x.io";

  it("matches case-insensitively", () => {
    expect(isAdminEmail("ETHAN@nhs-llc.com", raw)).toBe(true);
    expect(isAdminEmail("b@x.io", raw)).toBe(true);
  });

  it("rejects non-listed, null, undefined, and empty allowlist", () => {
    expect(isAdminEmail("stranger@gmail.com", raw)).toBe(false);
    expect(isAdminEmail(null, raw)).toBe(false);
    expect(isAdminEmail(undefined, raw)).toBe(false);
    expect(isAdminEmail("ethan@nhs-llc.com", "")).toBe(false);
  });
});

describe("appAccessDecision (pre-launch gate matrix)", () => {
  const base = { isPublic: false, hasUser: false, isAdmin: false, enforceAdmin: true };

  it("always allows public paths", () => {
    for (const path of ["/landing", "/blog", "/login", "/auth/callback"]) {
      expect(appAccessDecision({ ...base, path, isPublic: true })).toBe("allow");
    }
  });

  it("sends a logged-out visitor on the root to /landing, deeper paths to /login", () => {
    expect(appAccessDecision({ ...base, path: "/" })).toBe("landing");
    expect(appAccessDecision({ ...base, path: "/team" })).toBe("login");
    expect(appAccessDecision({ ...base, path: "/insights" })).toBe("login");
  });

  it("bounces a signed-in NON-admin off protected paths in production", () => {
    expect(
      appAccessDecision({ ...base, path: "/team", hasUser: true, isAdmin: false }),
    ).toBe("landing");
  });

  it("lets a signed-in admin reach protected paths", () => {
    expect(
      appAccessDecision({ ...base, path: "/team", hasUser: true, isAdmin: true }),
    ).toBe("allow");
  });

  it("does NOT enforce the admin gate outside production (local dev open)", () => {
    expect(
      appAccessDecision({
        ...base,
        path: "/team",
        hasUser: true,
        isAdmin: false,
        enforceAdmin: false,
      }),
    ).toBe("allow");
  });
});
