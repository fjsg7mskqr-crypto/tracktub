// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth";
import Home from "@/app/page";
import { fakeSupabase } from "../record/fake-supabase";
import { BANNED_WORDS } from "../record/fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentMembership: vi.fn() }));
vi.mock("@/lib/actions/visit", () => ({ startVisit: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

const ok = (data: unknown) => ({ data, error: null });
// Tue Oct 27 2026, 11:00 Detroit.
const NOW = new Date("2026-10-27T15:00:00Z");
const DAY = 86_400_000;
const ago = (d: number) => new Date(NOW.getTime() - d * DAY).toISOString();

const TUBS = [
  {
    id: "cedar",
    name: "Cedar Cabin",
    client_id: null,
    drain_interval_days: null,
    filter_interval_days: null,
    client: null,
  },
  {
    id: "harbor",
    name: "Harbor House",
    client_id: null,
    drain_interval_days: null,
    filter_interval_days: null,
    client: null,
  },
];

const turnover = (
  id: string,
  property_id: string,
  submitted_at_server: string,
  extra: Record<string, unknown> = {}
) => ({
  id,
  property_id,
  status: "submitted_locked",
  submitted_at_server,
  cleaning_steps: [],
  share_token: null,
  water: null,
  ...extra,
});

function setup(tables: Record<string, unknown>) {
  vi.mocked(createClient).mockResolvedValue(
    fakeSupabase({
      profile: ok({ full_name: "Ethan Novak" }),
      proof_event: ok([]),
      share_view: ok([]),
      ...(tables as Record<string, { data: unknown; error: null }>),
    }) as never
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(getCurrentMembership).mockResolvedValue({
    userId: "u1",
    email: "e@x.com",
    orgId: "o1",
    role: "operator",
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Home", () => {
  it("brand-new account: no tubs yet, add tub", async () => {
    setup({ property: ok([]) });
    render(await Home());
    expect(screen.getByText("Morning, Ethan")).toBeTruthy();
    expect(screen.getByText("Tuesday, Oct 27")).toBeTruthy();
    expect(screen.getByText("No tubs yet")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Add tub" }).getAttribute("href")
    ).toBe("/tubs/new");
  });

  it("tubs with no visits: nothing due, zeros, no NaN", async () => {
    setup({ property: ok(TUBS), turnover: ok([]) });
    const { container } = render(await Home());
    expect(screen.getByText("Nothing due this week.")).toBeTruthy();
    expect(screen.getByText("Nothing logged or due today")).toBeTruthy();
    expect(container.textContent).not.toMatch(/NaN|Invalid Date|undefined/);
  });

  it("today, attention worst first with Start / Continue, this week", async () => {
    setup({
      property: ok(TUBS),
      turnover: ok([
        turnover("t1", "cedar", ago(100), {
          cleaning_steps: ["drained_refilled"],
        }),
        turnover("t2", "harbor", "2026-10-27T13:52:00Z", {
          share_token: "tok",
        }),
        turnover("d1", "harbor", ago(0), { status: "draft" }),
        turnover("t3", "harbor", ago(100), {
          cleaning_steps: ["drained_refilled"],
        }),
      ]),
      proof_event: ok([
        { turnover_id: "t2", occurred_at: "2026-10-27T14:00:00Z" },
      ]),
      share_view: ok([
        { turnover_id: "t2", opened_at: "2026-10-27T14:30:00Z" },
      ]),
    });
    const { container } = render(await Home());

    expect(screen.getByText("Logged 9:52 AM · sent")).toBeTruthy();
    expect(screen.getByText("Drain due")).toBeTruthy();

    const titles = screen.getAllByText(/ — /).map((el) => el.textContent);
    expect(titles).toEqual([
      "Cedar Cabin — drain overdue",
      "Harbor House — drain overdue",
    ]);
    expect(
      screen.getByRole("button", { name: "Start visit at Cedar Cabin" })
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Continue visit at Harbor House" })
        .getAttribute("href")
    ).toBe("/visits/d1");

    const tile = (label: string) =>
      screen.getByText(label).parentElement?.textContent;
    expect(tile("visits logged")).toBe("1visits logged");
    expect(tile("records sent")).toBe("1records sent");
    expect(tile("opened by owners")).toBe("1opened by owners");

    const text = container.textContent!.toLowerCase();
    for (const w of BANNED_WORDS) expect(text).not.toContain(w);
    expect(text).not.toMatch(/NaN|invalid date/i);
  });
});
