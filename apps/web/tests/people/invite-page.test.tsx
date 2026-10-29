// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/server";
import InvitePage from "@/app/invite/[token]/page";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/actions/invite", () => ({ acceptInviteAction: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

function preview(over: Record<string, unknown>) {
  vi.mocked(createClient).mockResolvedValue({
    rpc: vi.fn(() =>
      Promise.resolve({
        data: {
          role: "staff",
          org_name: "Cascade Stays",
          inviter_name: "Ethan Novak",
          all_properties: true,
          property_names: [],
          expires_at: "2026-11-11T12:00:00Z",
          ...over,
        },
        error: null,
      })
    ),
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
  } as never);
}

const params = { params: Promise.resolve({ token: "tok" }) };

afterEach(cleanup);

describe("/invite/[token]", () => {
  it("all properties: says so and lists none", async () => {
    preview({});
    render(await InvitePage(params));
    expect(
      screen.getByText("You'll see every property on Cascade Stays.")
    ).toBeTruthy();
    expect(screen.queryByText("Properties you'll see")).toBeNull();
    expect(screen.getByText("See the tubs and run visits")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Continue with Google" })
        .getAttribute("href")
    ).toBe("/login?next=/invite/tok");
  });

  it("narrowed: lists the chosen properties", async () => {
    preview({ all_properties: false, property_names: ["Cedar Cabin"] });
    render(await InvitePage(params));
    expect(screen.getByText("Properties you'll see")).toBeTruthy();
    expect(screen.getByText("Cedar Cabin")).toBeTruthy();
    expect(screen.queryByText(/every property/)).toBeNull();
  });

  it("missing invite is a not-found", async () => {
    vi.mocked(createClient).mockResolvedValue({
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    } as never);
    await expect(InvitePage(params)).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
