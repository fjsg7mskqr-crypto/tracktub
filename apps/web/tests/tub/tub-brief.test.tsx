// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TubBrief } from "@/components/tub/TubBrief";
import { buildBrief } from "@/components/tub/brief";

afterEach(cleanup);

describe("TubBrief", () => {
  it("no visits: four tiles of —, never NaN or Invalid Date", () => {
    const { container } = render(
      <TubBrief
        tiles={buildBrief({
          tub: { drainIntervalDays: null, filterIntervalDays: null },
          visits: [],
          lastVisitOpened: null,
          now: new Date("2026-10-27T15:00:00Z"),
        })}
      />
    );
    expect(
      screen.getByRole("heading", { name: "Before you go in" })
    ).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getByText("No visits yet")).toBeTruthy();
    expect(container.textContent).not.toMatch(
      /NaN|Invalid Date|null|undefined/
    );
  });
});
