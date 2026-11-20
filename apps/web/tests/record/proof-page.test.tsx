// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import ProofPage from "@/app/proof/[token]/page";
import { fakeSupabase } from "./fake-supabase";
import { BANNED_WORDS, mockupRow } from "./fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@/lib/actions/proofEvent", () => ({ recordProofShare: vi.fn() }));
vi.stubGlobal(
  "fetch",
  vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
);
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const params = (token = "tok") => ({ params: Promise.resolve({ token }) });

// Anon reads no tables: the record comes from proof_record(token), which
// returns the visit (plus the tub's locked visits) or nothing. `rpc` overrides
// every other function (views, client name).
function client(
  row: unknown,
  rpc: Parameters<typeof fakeSupabase>[1] = () =>
    Promise.resolve({ data: null, error: null })
) {
  const fake = fakeSupabase({}, (name, args) =>
    name === "proof_record"
      ? Promise.resolve({
          data: row ? { ...(row as object), tub_visits: [] } : null,
          error: null,
        })
      : rpc(name, args)
  );
  vi.mocked(createClient).mockResolvedValue(fake as never);
  return fake;
}

afterEach(cleanup);

/** A service client whose storage signs every path it is given. */
function signer() {
  const createSignedUrls = vi.fn((paths: string[]) =>
    Promise.resolve({
      data: paths.map((path) => ({
        path,
        signedUrl: `https://x.test/storage/v1/object/sign/photos/${path}?token=t`,
        error: null,
      })),
      error: null,
    })
  );
  vi.mocked(createServiceClient).mockReturnValue({
    storage: { from: vi.fn(() => ({ createSignedUrls })) },
  } as never);
  return createSignedUrls;
}

describe("/proof/[token]", () => {
  it("renders the record and records NO open during server render", async () => {
    const fake = client(mockupRow());
    render(await ProofPage(params("tok")));
    expect(fake.rpc).toHaveBeenCalledWith("proof_record", { p_token: "tok" });
    expect(fake.from).not.toHaveBeenCalled(); // anon touches no table
    const names = fake.rpc.mock.calls.map(([name]) => name);
    expect(names).not.toContain("record_share_view");
    expect(names).not.toContain("record_proof_open");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Cedar Cabin"
    );
    expect(screen.getByText(/record$/).textContent).toBe("TrackTub record");
  });

  it("shows the photos through signed links, signed in one call", async () => {
    const sign = signer();
    client(mockupRow());
    const { container } = render(await ProofPage(params()));
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign.mock.calls[0][0]).toEqual(
      expect.arrayContaining(["org/t/before.jpg", "org/t/cover.jpg"])
    );
    const srcs = [...container.querySelectorAll("img")].map((i) => i.src);
    expect(srcs.length).toBeGreaterThan(0);
    for (const src of srcs) {
      expect(src).toContain("/storage/v1/object/sign/photos/");
      expect(src).not.toContain("/object/public/");
    }
  });

  it("without the service key: still 200, photos are placeholders", async () => {
    vi.mocked(createServiceClient).mockReturnValue(null);
    client(mockupRow());
    const { container } = render(await ProofPage(params()));
    expect(container.querySelectorAll("img").length).toBe(0);
    expect(screen.getAllByText("Photo unavailable").length).toBeGreaterThan(0);
    expect(screen.getByText("Cedar Cabin")).toBeTruthy();
  });

  it("a bad token never reaches the signer", async () => {
    const sign = signer();
    client(null);
    await expect(ProofPage(params("nope"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(sign).not.toHaveBeenCalled();
  });

  it("is the owner view: no operator controls", async () => {
    client(mockupRow());
    render(await ProofPage(params()));
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders when the client-name RPC errors", async () => {
    client(mockupRow(), () => Promise.reject(new Error("network")));
    render(await ProofPage(params()));
    expect(screen.getByText("Cedar Cabin")).toBeTruthy();
  });

  it("renders when the client-name RPC returns an error", async () => {
    client(mockupRow(), () =>
      Promise.resolve({ data: null, error: { message: "denied" } })
    );
    render(await ProofPage(params()));
    expect(screen.getByText("Cedar Cabin")).toBeTruthy();
  });

  it("unknown token → notFound, nothing recorded", async () => {
    const fake = client(null);
    await expect(ProofPage(params())).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
    expect(fake.rpc.mock.calls.map(([name]) => name)).toEqual(["proof_record"]);
  });

  it("no banned words", async () => {
    client(mockupRow({ owner_flag: "x" }));
    const { container } = render(await ProofPage(params()));
    const text = container.innerHTML.toLowerCase();
    for (const word of BANNED_WORDS) expect(text).not.toContain(word);
  });
});
