import { describe, it, expect, afterEach, vi } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Waitlist submit must not depend on a per-build Server Action id. With a
// Server Action, a /landing tab opened before a deploy posts an id the new
// build doesn't know → "Failed to find Server Action" → 500 (seen on prod,
// 2026-09). A route handler at a fixed URL survives deploys.

async function post(
  body: unknown,
  opts: {
    insertError?: { code: string; message: string } | null;
    limited?: boolean;
  } = {},
) {
  vi.resetModules();
  const insert = vi.fn(async () => ({ error: opts.insertError ?? null }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({ from: () => ({ insert }) }),
  }));
  vi.doMock("@/lib/ratelimit", async () => {
    const actual =
      await vi.importActual<typeof import("@/lib/ratelimit")>(
        "@/lib/ratelimit",
      );
    return {
      ...actual,
      checkRateLimit: async () => ({ success: !opts.limited }),
    };
  });
  const { POST } = await import("@/app/landing/waitlist/route");
  const res = await POST(
    new Request("https://tracktub.com/landing/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { res, json: await res.json(), insert };
}

describe("POST /landing/waitlist", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/server");
    vi.doUnmock("@/lib/ratelimit");
    vi.resetModules();
  });

  it("persists a valid email and reports ok", async () => {
    const { res, json, insert } = await post({ email: "Host@Example.com" });
    expect(res.status).toBe(200);
    expect(json).toEqual({ status: "ok" });
    expect(insert).toHaveBeenCalledWith({
      email: "host@example.com",
      source: "landing",
    });
  });

  it("treats a duplicate signup as already-on-the-list", async () => {
    const { res, json } = await post(
      { email: "host@example.com" },
      { insertError: { code: "23505", message: "dup" } },
    );
    expect(res.status).toBe(200);
    expect(json).toEqual({ status: "already" });
  });

  it("rejects an invalid email with 400", async () => {
    const { res, json, insert } = await post({ email: "nope" });
    expect(res.status).toBe(400);
    expect(json.status).toBe("error");
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a malformed body with 400", async () => {
    const { res, json } = await post("not-an-object");
    expect(res.status).toBe(400);
    expect(json.status).toBe("error");
  });

  it("returns 429 when rate-limited", async () => {
    const { res, json } = await post(
      { email: "host@example.com" },
      { limited: true },
    );
    expect(res.status).toBe(429);
    expect(json.status).toBe("error");
  });

  it("returns 500 with a friendly message when the insert fails", async () => {
    const { res, json } = await post(
      { email: "host@example.com" },
      { insertError: { code: "XX000", message: "boom" } },
    );
    expect(res.status).toBe(500);
    expect(json).toEqual({
      status: "error",
      message: "Something went wrong — please try again.",
    });
  });
});

describe("landing has no Server Actions", () => {
  it("no file under src/app/landing declares 'use server'", () => {
    const dir = join(__dirname, "../src/app/landing");
    const walk = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
      );
    const offenders = walk(dir).filter((f) =>
      /^\s*["']use server["']/m.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
