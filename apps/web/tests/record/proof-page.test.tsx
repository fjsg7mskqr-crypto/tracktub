// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProofPage from "@/app/proof/[token]/page";
import { fakeSupabase } from "./fake-supabase";
import { BANNED_WORDS, mockupRow } from "./fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/actions/proofEvent", () => ({ recordProofShare: vi.fn() }));
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

describe("/proof/[token]", () => {
  it("records a view once for a locked turnover", async () => {
    const fake = client(mockupRow());
    render(await ProofPage(params("tok")));
    expect(fake.rpc).toHaveBeenCalledWith("proof_record", { p_token: "tok" });
    expect(fake.from).not.toHaveBeenCalled(); // anon touches no table
    const views = fake.rpc.mock.calls.filter(
      ([name]) => name === "record_share_view"
    );
    expect(views).toEqual([["record_share_view", { p_token: "tok" }]]);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Cedar Cabin"
    );
    expect(screen.getByText(/record$/).textContent).toBe("TrackTub record");
  });

  it("is the owner view: no operator controls", async () => {
    client(mockupRow());
    render(await ProofPage(params()));
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders when the view RPC errors", async () => {
    client(mockupRow(), () => Promise.reject(new Error("network")));
    render(await ProofPage(params()));
    expect(screen.getByText("Cedar Cabin")).toBeTruthy();
  });

  it("renders when the view RPC returns an error", async () => {
    client(mockupRow(), () =>
      Promise.resolve({ data: null, error: { message: "denied" } })
    );
    render(await ProofPage(params()));
    expect(screen.getByText("Cedar Cabin")).toBeTruthy();
  });

  it("unknown token → notFound, no view recorded", async () => {
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
