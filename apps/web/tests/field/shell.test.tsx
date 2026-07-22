// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BottomTabBar } from "@/components/field/BottomTabBar";

afterEach(cleanup);

describe("BottomTabBar", () => {
  it("renders all four field tabs", () => {
    render(<BottomTabBar active="today" />);
    for (const label of ["Today", "Tubs", "History", "More"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it("marks the active tab with aria-current='page'", () => {
    render(<BottomTabBar active="history" />);
    const current = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("History");
  });

  it("does not mark inactive tabs as current", () => {
    render(<BottomTabBar active="today" />);
    const todayLink = screen.getByText("Today").closest("a");
    const tubsLink = screen.getByText("Tubs").closest("a");
    expect(todayLink?.getAttribute("aria-current")).toBe("page");
    expect(tubsLink?.getAttribute("aria-current")).toBeNull();
  });
});
