// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth";
import ReportsPage from "@/app/reports/page";
import HistoryPage from "@/app/reports/history/page";
import { fakeSupabase } from "./fake-supabase";
import { BANNED_WORDS, emptyRow, mockupRow } from "./fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentMembership: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const ok = (data: unknown) => ({ data, error: null });
const sp = (q: Record<string, string> = {}) => ({
  searchParams: Promise.resolve(q),
});
const TUBS = [
  { id: "prop-1", name: "Cedar Cabin" },
  { id: "prop-2", name: "Pine Ridge" },
];

beforeEach(() => {
  vi.mocked(getCurrentMembership).mockResolvedValue({
    userId: "u1",
    email: "e@x.com",
    orgId: "o1",
    role: "operator",
  });
});
afterEach(cleanup);

describe("/reports", () => {
  it("nothing sent yet", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({ property: ok(TUBS), proof_event: ok([]) }) as never
    );
    render(await ReportsPage(sp()));
    expect(screen.getByText("Nothing sent yet.")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Build report" }).getAttribute("href")
    ).toBe("/reports/history?tub=prop-1&period=last6");
  });

  it("lists sent records with Opened", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({
        property: ok(TUBS),
        proof_event: ok([
          {
            turnover_id: "t1",
            occurred_at: "2026-10-26T15:02:00Z",
            turnover: {
              submitted_at_server: "2026-10-26T14:58:00Z",
              property: {
                name: "Cedar Cabin",
                client: { name: "Lakeview Rentals" },
              },
            },
          },
        ]),
        share_view: ok([{ turnover_id: "t1" }]),
      }) as never
    );
    render(await ReportsPage(sp({ tub: "prop-2", period: "season" })));
    const row = screen.getByRole("link", { name: /Cedar Cabin · Oct 26/ });
    expect(row.getAttribute("href")).toBe("/records/t1");
    expect(row.textContent).toContain("To Lakeview Rentals · 11:02 AM");
    expect(row.textContent).toContain("Opened");
    expect(
      screen.getByRole("link", { name: "Build report" }).getAttribute("href")
    ).toBe("/reports/history?tub=prop-2&period=season");
  });

  it("no tubs yet", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({ property: ok([]), proof_event: ok([]) }) as never
    );
    render(await ReportsPage(sp()));
    expect(screen.getByText("Add a tub first.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Build report" })).toBeNull();
  });
});

describe("/reports/history", () => {
  const tub = ok({
    id: "prop-1",
    name: "Cedar Cabin",
    client: { name: "Lakeview Rentals" },
  });

  it("one row per locked visit, linking to its record", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({
        property: tub,
        turnover: ok([mockupRow(), { ...emptyRow(), id: "t2" }]),
      }) as never
    );
    const { container } = render(
      await HistoryPage(sp({ tub: "prop-1", period: "last6" }))
    );
    expect(screen.getByText("TrackTub history report")).toBeTruthy();
    expect(screen.getByText("Lakeview Rentals · Last 6 visits")).toBeTruthy();
    const links = screen.getAllByRole("link", { name: /Mon Oct 26, 2026/ });
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/records/3f9a2c1e-7b44-4d1a-9e2b-0c5d6e7f8a9b",
      "/records/t2",
    ]);
    expect(container.textContent).toContain("pH 8.0 → 7.5");
    expect(container.textContent).toContain("3 photos");
    expect(container.textContent).toContain("Partial");
    const text = container.innerHTML.toLowerCase();
    for (const word of BANNED_WORDS) expect(text).not.toContain(word);
  });

  it("no visits in the period", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({ property: tub, turnover: ok([]) }) as never
    );
    render(await HistoryPage(sp({ tub: "prop-1", period: "season" })));
    expect(screen.getByText("No locked visits in this period.")).toBeTruthy();
  });

  it("unknown tub → notFound", async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeSupabase({ property: ok(null) }) as never
    );
    await expect(HistoryPage(sp({ tub: "nope" }))).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });
});
