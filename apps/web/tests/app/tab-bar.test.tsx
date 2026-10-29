// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { activeTab, APP_TABS } from "@/lib/app-routes";
import { TabBar } from "@/components/app/TabBar";

vi.mock("next/navigation", () => ({ usePathname: () => "/tubs/9" }));

afterEach(cleanup);

describe("activeTab", () => {
  it.each([
    ["/", "/"],
    ["/tubs", "/tubs"],
    ["/tubs/123", "/tubs"],
    ["/calendar", "/calendar"],
    ["/reports", "/reports"],
    ["/visits/1", null],
  ])("%s → %s", (pathname, expected) => {
    expect(activeTab(pathname)).toBe(expected);
  });

  it("doesn't match a tab by bare prefix", () => {
    expect(activeTab("/tubsy")).toBeNull();
  });
});

describe("TabBar", () => {
  it("renders Home, Calendar, Tubs, Reports in order", () => {
    render(<TabBar />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Home",
      "Calendar",
      "Tubs",
      "Reports",
    ]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(
      APP_TABS.map((t) => t.href)
    );
  });

  it("marks only the active tab with aria-current='page'", () => {
    render(<TabBar />);
    const current = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe("Tubs");
  });
});
