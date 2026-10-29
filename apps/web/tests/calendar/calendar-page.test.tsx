// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/auth";
import CalendarPage from "@/app/calendar/page";
import { fakeSupabase } from "../record/fake-supabase";
import { BANNED_WORDS } from "../record/fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentMembership: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const ok = (data: unknown) => ({ data, error: null });
// Mon Oct 26 2026, 11:00 Detroit.
const NOW = new Date("2026-10-26T15:00:00Z");
const DAY = 86_400_000;
const ago = (d: number) => new Date(NOW.getTime() - d * DAY).toISOString();
const sp = (q: Record<string, string> = {}) => ({
  searchParams: Promise.resolve(q),
});

const tub = (id: string, name: string) => ({
  id,
  name,
  client_id: null,
  drain_interval_days: null,
  filter_interval_days: null,
  client: null,
});
const locked = (
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

function setup(property: unknown[], turnover: unknown[] = []) {
  vi.mocked(createClient).mockResolvedValue(
    fakeSupabase({ property: ok(property), turnover: ok(turnover) }) as never
  );
}

const DATA = [
  locked("t1", "harbor", "2026-10-26T13:52:00Z", { share_token: "tok" }),
  locked("t0", "cedar", ago(84), { cleaning_steps: ["drained_refilled"] }),
  locked("t9", "pine", ago(58), { cleaning_steps: ["filter_replaced"] }),
];
const TUBS = [
  tub("harbor", "Harbor House"),
  tub("cedar", "Cedar Cabin"),
  tub("pine", "Pine Ridge"),
];

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

describe("/calendar", () => {
  it("defaults to this week, Monday first, logged + due only", async () => {
    setup(TUBS, DATA);
    const { container } = render(await CalendarPage(sp()));
    expect(screen.getByText("Oct 26 – Nov 1")).toBeTruthy();
    expect(screen.getByText("2 due · 1 logged")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Week" }).getAttribute("aria-current")
    ).toBe("page");

    const mon = screen.getByRole("region", { name: "Monday, Oct 26" });
    const logged = within(mon).getByRole("link", { name: /Harbor House/ });
    expect(logged.getAttribute("href")).toBe("/records/t1");
    expect(logged.textContent).toContain("Visit logged 9:52 AM · record sent");

    const wed = screen.getByRole("region", { name: "Wednesday, Oct 28" });
    const due = within(wed).getByRole("link", { name: /Pine Ridge/ });
    expect(due.getAttribute("href")).toBe("/tubs/pine");
    expect(due.textContent).toContain("Filter change due (every ~60 days)");

    const regions = screen.getAllByRole("region");
    expect(regions).toHaveLength(7);
    expect(regions[0].getAttribute("aria-label")).toBe("Monday, Oct 26");

    const text = container.textContent!.toLowerCase();
    for (const w of [...BANNED_WORDS, "booking", "guest", "check-in", "assign"])
      expect(text).not.toContain(w);
    expect(text).toContain("suggestions from your own history");
  });

  it("month view: grid with day links and footnote", async () => {
    setup(TUBS, DATA);
    render(await CalendarPage(sp({ view: "month", d: "2026-10-01" })));
    expect(screen.getByText("October 2026")).toBeTruthy();
    expect(screen.getByText("1 visit logged")).toBeTruthy();
    const today = screen.getByRole("link", {
      name: "Monday, Oct 26: 0 due, 1 logged",
    });
    expect(today.getAttribute("href")).toBe("/calendar?view=day&d=2026-10-26");
  });

  it("day view and junk params fall back safely", async () => {
    setup(TUBS, DATA);
    render(await CalendarPage(sp({ view: "day", d: "2026-99-99" })));
    expect(screen.getAllByText("Monday, Oct 26").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });

  it("brand-new account: every day says nothing due, no NaN", async () => {
    setup([]);
    const { container } = render(await CalendarPage(sp()));
    expect(screen.getAllByText("Nothing due")).toHaveLength(7);
    expect(screen.getByText("0 due · 0 logged")).toBeTruthy();
    expect(container.textContent).not.toMatch(/NaN|Invalid Date/);
  });

  it("tubs with no visits: nothing projected", async () => {
    setup(TUBS, []);
    render(await CalendarPage(sp()));
    expect(screen.getAllByText("Nothing due")).toHaveLength(7);
  });
});
