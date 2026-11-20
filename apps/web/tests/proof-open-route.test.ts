import { describe, it, expect, vi } from "vitest";
import { BOT_UA_PATTERNS, isBotUserAgent } from "@/lib/open-filter";

const TOKEN = "a".repeat(32);
const CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

async function post(
  opts: {
    token?: string;
    ua?: string | null;
    headers?: Record<string, string>;
    userId?: string | null;
    turnoverId?: string | null;
    canRead?: boolean;
    limited?: boolean;
    bot?: boolean;
  } = {}
) {
  vi.resetModules();
  const rpc = vi.fn(async (name: string) =>
    name === "proof_record"
      ? { data: { id: opts.turnoverId ?? "t-1" }, error: null }
      : { data: null, error: null }
  );
  const maybeSingle = vi.fn(async () => ({
    data: opts.canRead ? { id: "t-1" } : null,
    error: null,
  }));
  const from = vi.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle }) }),
  }));
  const getClaims = vi.fn(async () => ({
    data: opts.userId ? { claims: { sub: opts.userId } } : null,
    error: null,
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({ rpc, from, auth: { getClaims } }),
  }));
  vi.doMock("botid/server", () => ({
    checkBotId: async () => ({ isBot: !!opts.bot }),
  }));
  vi.doMock("@/lib/ratelimit", async () => {
    const actual =
      await vi.importActual<typeof import("@/lib/ratelimit")>(
        "@/lib/ratelimit"
      );
    return {
      ...actual,
      checkRateLimit: async () => ({ success: !opts.limited }),
    };
  });
  const { POST } = await import("@/app/proof/[token]/open/route");
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.ua !== null) headers["user-agent"] = opts.ua ?? CHROME;
  const res = await POST(
    new Request("http://x/proof/t/open", { method: "POST", headers }),
    { params: Promise.resolve({ token: opts.token ?? TOKEN }) }
  );
  return { res, rpc, names: rpc.mock.calls.map(([n]) => n) };
}

describe("POST /proof/[token]/open", () => {
  it("normal browser + valid token records both opens once", async () => {
    const { res, names, rpc } = await post();
    expect(res.status).toBe(204);
    expect(names).toEqual(["record_share_view", "record_proof_open"]);
    expect(rpc).toHaveBeenCalledWith("record_share_view", { p_token: TOKEN });
    expect(rpc).toHaveBeenCalledWith("record_proof_open", {
      p_share_token: TOKEN,
    });
  });

  it.each(BOT_UA_PATTERNS.map((p) => [p]))(
    "ignores a %s user agent",
    async (p) => {
      const { res, rpc } = await post({
        ua: `Mozilla/5.0 (compatible; ${p}/2.1)`,
      });
      expect(res.status).toBe(204);
      expect(rpc).not.toHaveBeenCalled();
    }
  );

  it("ignores an empty / missing user agent", async () => {
    expect((await post({ ua: "" })).rpc).not.toHaveBeenCalled();
    expect((await post({ ua: null })).rpc).not.toHaveBeenCalled();
  });

  it.each([["purpose"], ["sec-purpose"]])(
    "ignores a %s: prefetch",
    async (h) => {
      const { res, rpc } = await post({ headers: { [h]: "prefetch" } });
      expect(res.status).toBe(204);
      expect(rpc).not.toHaveBeenCalled();
    }
  );

  it("short token → 204, no DB call", async () => {
    const { res, rpc } = await post({ token: "short" });
    expect(res.status).toBe(204);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("signed-in member of the visit's team is not counted", async () => {
    const { res, names } = await post({ userId: "u-1", canRead: true });
    expect(res.status).toBe(204);
    expect(names).toEqual(["proof_record"]);
  });

  it("signed-in user of another team IS counted", async () => {
    const { names } = await post({ userId: "u-2", canRead: false });
    expect(names).toEqual([
      "proof_record",
      "record_share_view",
      "record_proof_open",
    ]);
  });

  it("rate-limited and BotID-flagged requests record nothing", async () => {
    expect((await post({ limited: true })).rpc).not.toHaveBeenCalled();
    const bot = await post({ bot: true });
    expect(bot.res.status).toBe(403);
    expect(bot.rpc).not.toHaveBeenCalled();
  });
});

describe("isBotUserAgent", () => {
  it("lets real browsers through", () => {
    expect(isBotUserAgent(CHROME)).toBe(false);
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36"
      )
    ).toBe(false);
  });
});
