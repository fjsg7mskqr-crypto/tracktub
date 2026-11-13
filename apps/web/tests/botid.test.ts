import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "@/proxy";
import { BOTID_PROTECTED_ROUTES } from "@/lib/botid-routes";

// Vercel BotID gate (issue #43). BotID always reports "human" outside a Vercel
// production deployment, so the real verdict can't be exercised locally —
// checkBotId is mocked to cover each branch of the wrapper.

async function gate(checkBotId: () => Promise<unknown>) {
  vi.resetModules();
  vi.doMock("botid/server", () => ({ checkBotId }));
  const { rejectBots } = await import("@/lib/botid");
  return rejectBots("test");
}

const verdict = (isBot: boolean) => async () => ({
  isBot,
  isHuman: !isBot,
  isVerifiedBot: false,
  bypassed: false,
});

describe("rejectBots", () => {
  afterEach(() => {
    vi.doUnmock("botid/server");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns a 403 with a friendly, form-renderable body for a bot", async () => {
    const res = await gate(verdict(true));
    expect(res?.status).toBe(403);
    const body = await res!.json();
    expect(body.status).toBe("error");
    expect(body.message).not.toMatch(/captcha|bot/i);
  });

  it("passes a human through", async () => {
    expect(await gate(verdict(false))).toBeNull();
  });

  it("fails open (and logs) when BotID itself throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await gate(async () => {
      throw new Error("VERCEL_OIDC_TOKEN is not set");
    });
    expect(res).toBeNull();
    expect(log).toHaveBeenCalledOnce();
  });
});

describe("BotID wiring", () => {
  // Proxy runs before next.config rewrites; if it matched BotID's first-party
  // path, a signed-out visitor's challenge-script fetch would be auth-redirected
  // and stamped with frame-ancestors 'none' — protection silently dead.
  const matcher = new RegExp(`^${config.matcher[0]}$`);
  const prefix = "/149e9513-01fa-4fb0-aad4-566afd725d1b";

  it("proxy matcher skips BotID's challenge path but still covers the app", () => {
    expect(
      matcher.test(`${prefix}/2d206a39-8ed7-437e-a3be-862e0f06eea3/a-4-a/c.js`)
    ).toBe(false);
    expect(matcher.test("/landing")).toBe(true);
    expect(matcher.test("/landing/waitlist")).toBe(true);
  });

  it("every protected route calls rejectBots server-side", () => {
    // BotID's server check fails for routes the client doesn't protect, and a
    // client-protected route without a server check protects nothing.
    const files: Record<string, string> = {
      "/landing/waitlist": "src/app/landing/waitlist/route.ts",
    };
    for (const { path } of BOTID_PROTECTED_ROUTES) {
      const file = files[path];
      expect(file, `map ${path} to its route file`).toBeDefined();
      expect(readFileSync(join(__dirname, "..", file), "utf8")).toMatch(
        /rejectBots\(/
      );
    }
  });
});
