// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BottomTabBar } from "@/components/field/BottomTabBar";

afterEach(cleanup);

/**
 * These assertions were written against four tabs (Today / Tubs / History /
 * More). Three of those had no routes and 404'd in production for six weeks,
 * so they were removed on 2026-09-03 — see `tests/nav-route-coverage.test.ts`.
 * The active-tab behaviour is still worth asserting, so it is kept and
 * rewritten against the tabs that actually exist, rather than deleted.
 */
describe("BottomTabBar", () => {
  it("renders only tabs that have routes behind them", () => {
    render(<BottomTabBar active="today" />);
    expect(screen.getByText("Today")).toBeTruthy();
    for (const gone of ["Tubs", "History", "More"]) {
      expect(screen.queryByText(gone)).toBeNull();
    }
  });

  it("marks the active tab with aria-current='page'", () => {
    render(<BottomTabBar active="today" />);
    const current = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("Today");
  });

  it("points the active tab at its real route", () => {
    render(<BottomTabBar active="today" />);
    const todayLink = screen.getByText("Today").closest("a");
    expect(todayLink?.getAttribute("href")).toBe("/field/today");
    expect(todayLink?.getAttribute("aria-current")).toBe("page");
  });
});
