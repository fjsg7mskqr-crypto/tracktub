// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth";
import RecordPage from "@/app/records/[id]/page";
import { fakeSupabase } from "./fake-supabase";
import { mockupRow } from "./fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentMembership: vi.fn() }));
vi.mock("@/lib/actions/proofEvent", () => ({ recordProofShare: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const params = (id = "t1") => ({ params: Promise.resolve({ id }) });

function withRow(row: unknown) {
  vi.mocked(createClient).mockResolvedValue(
    fakeSupabase({ turnover: { data: row, error: null } }) as never
  );
}

beforeEach(() => {
  vi.mocked(getCurrentMembership).mockResolvedValue({
    userId: "u1",
    email: "e@x.com",
    orgId: "o1",
    role: "operator",
  });
});
afterEach(cleanup);

describe("/records/[id]", () => {
  it("renders the operator record", async () => {
    withRow(mockupRow());
    render(await RecordPage(params()));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Cedar Cabin"
    );
    expect(screen.getByRole("button", { name: "Send to owner" })).toBeTruthy();
    expect(screen.getByText(/^https?:\/\/.+\/proof\/7Kq2tok$/)).toBeTruthy();
  });

  it("shows next due from the tub's history and the owner flag", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({
        turnover: [
          {
            data: mockupRow({ owner_flag: "Cover strap fraying" }),
            error: null,
          },
          {
            data: [
              {
                submitted_at_server: "2026-10-26T14:58:00Z",
                cleaning_steps: ["drained_refilled"],
              },
            ],
            error: null,
          },
        ],
      }) as never
    );
    render(await RecordPage(params()));
    expect(
      screen.getByText(/^Drain & refill due Jan 24 · Record TT-/)
    ).toBeTruthy();
    expect(screen.getByText("For the owner")).toBeTruthy();
    expect(screen.getByText("Cover strap fraying")).toBeTruthy();
  });

  it("no share token", async () => {
    withRow(mockupRow({ share_token: null }));
    render(await RecordPage(params()));
    expect(screen.getByText("No link yet.")).toBeTruthy();
  });

  it("missing record → notFound", async () => {
    withRow(null);
    await expect(RecordPage(params())).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("signed out → /login", async () => {
    vi.mocked(getCurrentMembership).mockResolvedValue(null);
    await expect(RecordPage(params())).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
