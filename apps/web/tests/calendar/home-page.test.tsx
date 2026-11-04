// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership, getSessionUser } from "@/lib/auth";
import Home from "@/app/(home)/page";
import { fakeSupabase } from "../record/fake-supabase";
import { BANNED_WORDS } from "../record/fixtures";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  getCurrentMembership: vi.fn(),
  getSessionUser: vi.fn(),
}));
vi.mock("@/lib/actions/visit", () => ({ startVisit: vi.fn() }));
vi.mock("@/lib/actions/home", () => ({
  addToToday: vi.fn(),
  removeFromToday: vi.fn(),
  settleOpenItem: vi.fn(),
}));
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

const visit = (
  id: string,
  property_id: string,
  submitted_at_server: string,
  extra: Record<string, unknown> = {}
) => ({
  id,
  property_id,
  submitted_at_server,
  cleaning_steps: [],
  share_token: null,
  owner_flag: null,
  water: null,
  shares: [],
  views: [],
  ...extra,
});

const draft = (
  id: string,
  property_id: string,
  created_at: string,
  extra: Record<string, unknown> = {}
) => ({
  id,
  property_id,
  created_at,
  cleaning_steps: [],
  photos: [],
  water: null,
  ...extra,
});

/** Locked visits, then drafts: Home reads turnover twice. */
const turnovers = (visits: unknown[], drafts: unknown[] = []) => [
  ok(visits),
  ok(drafts),
];

function setup(tables: Record<string, unknown>) {
  vi.mocked(createClient).mockResolvedValue(
    fakeSupabase({
      profile: ok({ full_name: "Ethan Novak" }),
      task: ok([]),
      route_stop: ok([]),
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
  vi.mocked(getSessionUser).mockResolvedValue({ id: "u1", email: "e@x.com" });
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
    expect(
      screen
        .getByRole("link", { name: "People and account" })
        .getAttribute("href")
    ).toBe("/people");
  });

  it("tubs with no visits: no route yet, zeros, calm tiles, no NaN", async () => {
    setup({ property: ok(TUBS), turnover: turnovers([]) });
    const { container } = render(await Home());
    expect(screen.getByText(/Nothing on today's route/)).toBeTruthy();
    const summary = (label: string) =>
      screen.getByText(label).parentElement?.textContent;
    expect(summary("needs you")).toBe("0needs you");
    expect(summary("left open")).toBe("0left open");
    expect(summary("tubs")).toBe("2tubs");
    expect(screen.getAllByText("No visits yet")).toHaveLength(2);
    expect(container.textContent).not.toMatch(/NaN|Invalid Date|undefined/);
  });

  it("between stops: route, Up next with Bring, worst-first board", async () => {
    setup({
      property: ok(TUBS),
      turnover: turnovers([
        // Cedar: drained 100 days ago (overdue), left pH 7.9.
        visit("t1", "cedar", ago(100), {
          cleaning_steps: ["drained_refilled"],
        }),
        visit("t0", "cedar", ago(3), {
          water: {
            total_alkalinity: 100,
            ph: 7.6,
            calcium_hardness: 200,
            sanitizer_ppm: 2,
            left_total_alkalinity: 100,
            left_ph: 7.9,
            left_calcium_hardness: 200,
            left_sanitizer_ppm: 2,
          },
          shares: [{ kind: "share_copied" }],
          views: [{ id: "sv1" }],
        }),
        // Harbor: visited today 9:52 AM, drained recently, balanced.
        visit("t2", "harbor", "2026-10-27T13:52:00Z", {
          cleaning_steps: ["drained_refilled"],
          water: {
            total_alkalinity: 100,
            ph: 7.4,
            calcium_hardness: 200,
            sanitizer_ppm: 2,
          },
        }),
      ]),
      task: ok([
        {
          id: "i1",
          property_id: "cedar",
          kind: "filter_soak",
          title: "Filters soaking",
          note: "Swap back in",
          created_at: ago(3),
          opened_visit_id: "t0",
        },
      ]),
    });
    const { container } = render(await Home());

    expect(screen.getByText("1 of 2 done")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Harbor House, done 9:52 AM" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Cedar Cabin, up next, needs attention",
      })
    ).toBeTruthy();

    const card = screen.getByRole("region", { name: "Up next" });
    expect(card.textContent).toContain("Cedar Cabin");
    expect(card.textContent).toContain("pH 7.9 Sat");
    expect(card.textContent).toContain("last visit 3 days ago");
    expect(card.textContent).toContain("Bring: pH down, Test strips");
    expect(card.textContent).toContain("Drain 10 days overdue");
    expect(
      screen.getAllByRole("checkbox", { name: "Settle: Filters soaking" })
    ).toHaveLength(2); // focus card + tile
    expect(screen.getByRole("button", { name: "Start visit" })).toBeTruthy();

    const tiles = screen
      .getAllByRole("article")
      .map((a) => a.getAttribute("aria-label"));
    expect(tiles).toEqual(["Cedar Cabin", "Harbor House"]);
    const cedar = screen.getByRole("article", { name: "Cedar Cabin" });
    expect(cedar.textContent).toContain("on today's route");
    expect(cedar.textContent).toContain("Host opened report");
    const harbor = screen.getByRole("article", { name: "Harbor House" });
    expect(harbor.textContent).toContain("Balanced");
    expect(
      screen.getByRole("img", { name: "Drain 10 days overdue" })
    ).toBeTruthy();

    const summary = (label: string) =>
      screen.getByText(label).parentElement?.textContent;
    expect(summary("needs you")).toBe("1needs you");
    expect(summary("left open")).toBe("1left open");

    const text = container.textContent!.toLowerCase();
    for (const w of BANNED_WORDS) expect(text).not.toContain(w);
    expect(text).not.toMatch(/NaN|invalid date/i);
  });

  it("mid-visit: Working on with progress and Resume", async () => {
    setup({
      property: ok(TUBS),
      turnover: turnovers(
        [],
        [
          draft("d1", "harbor", "2026-10-27T14:34:00Z", {
            photos: [{ phase: "before", slot: "full_frame" }],
          }),
        ]
      ),
      route_stop: ok([{ property_id: "cedar" }]),
    });
    render(await Home());

    const card = screen.getByRole("region", {
      name: "Working on · started 10:34 AM",
    });
    expect(card.textContent).toContain("Harbor House");
    expect(card.textContent).toContain("1 of 4 steps");
    expect(card.textContent).toContain("Before ✓");
    expect(
      screen.getByRole("link", { name: "Resume visit" }).getAttribute("href")
    ).toBe("/visits/d1");
    expect(
      screen.getByRole("button", { name: "Cedar Cabin, added" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Remove from today: Cedar Cabin" })
    ).toBeTruthy();
  });
});
