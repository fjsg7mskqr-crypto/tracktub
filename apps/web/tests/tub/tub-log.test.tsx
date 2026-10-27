// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TubLog } from "@/components/tub/TubLog";
import type { LogVisit } from "@/components/tub/log";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/actions/visit", () => ({ startVisit: vi.fn() }));

afterEach(cleanup);

const NOW = new Date("2026-10-27T15:00:00Z");

function lv(id: string, over: Partial<LogVisit>): LogVisit {
  return {
    id,
    status: "submitted_locked",
    at: new Date("2026-10-17T18:10:00Z"),
    cleaningSteps: [],
    found: { ph: 7.9 },
    left: null,
    foundAt: null,
    leftAt: null,
    treatments: [],
    photos: [{ phase: "before", slot: "full_frame", capturedAt: null }],
    ...over,
  };
}

describe("TubLog", () => {
  it("no visits: 'No visits yet' + Start visit", () => {
    const { container } = render(<TubLog tubId="t1" visits={[]} now={NOW} />);
    expect(screen.getByText("No visits yet")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start visit" })).toBeTruthy();
    expect(container.textContent).not.toMatch(/NaN|Invalid Date/);
  });

  it("past visits link to their record, oldest first", () => {
    render(
      <TubLog
        tubId="t1"
        visits={[lv("a", {}), lv("b", { photos: [] })]}
        now={NOW}
      />
    );
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/records/a",
      "/records/b",
    ]);
    expect(screen.getByText("locked")).toBeTruthy();
    expect(screen.getByText("partial")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start visit" })).toBeTruthy();
  });

  it("an open visit shows its entries, Still to log and Continue visit", () => {
    render(
      <TubLog
        tubId="t1"
        visits={[
          lv("a", {}),
          lv("d", {
            status: "draft",
            at: new Date("2026-10-27T13:42:00Z"),
            foundAt: new Date("2026-10-27T13:45:00Z"),
            found: { ph: 8.0 },
            photos: [],
          }),
        ]}
        now={NOW}
      />
    );
    expect(screen.getByText(/Today · visit open since/)).toBeTruthy();
    expect(screen.getByText("pH 8.0")).toBeTruthy();
    expect(screen.getByText("Still to log")).toBeTruthy();
    expect(
      screen.getByText("Before photo · Work · Reading as left · After photos")
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Continue visit" }).getAttribute("href")
    ).toBe("/visits/d");
    expect(screen.queryByRole("button", { name: "Start visit" })).toBeNull();
  });
});
