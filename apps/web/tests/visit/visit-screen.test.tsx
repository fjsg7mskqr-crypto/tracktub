// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { VisitSnapshot } from "@/lib/visit";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const actions = vi.hoisted(() => ({
  saveWork: vi.fn(),
  saveAdded: vi.fn(),
  saveFlag: vi.fn(),
  saveNotes: vi.fn(),
  logReading: vi.fn(),
  savePhoto: vi.fn(),
  finishVisit: vi.fn(),
}));
vi.mock("@/lib/actions/visit", () => actions);

import { VisitScreen } from "@/components/visit/VisitScreen";

function snap(over: Partial<VisitSnapshot> = {}): VisitSnapshot {
  return {
    visitId: "v1",
    propertyId: "p1",
    propertyName: "Cedar Cabin",
    status: "draft",
    openedAt: "2026-10-27T09:42:00.000Z",
    photos: [],
    found: null,
    foundAt: null,
    left: null,
    leftAt: null,
    work: [],
    added: [],
    notes: "",
    flag: null,
    previous: null,
    ...over,
  };
}

beforeEach(() => {
  for (const fn of Object.values(actions)) fn.mockReset();
  push.mockReset();
});
afterEach(cleanup);

describe("VisitScreen", () => {
  it("renders the five sections in order", () => {
    render(<VisitScreen initial={snap()} />);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    ).toEqual([
      "Before you touch it",
      "Reading as found",
      "The work",
      "Reading as left",
      "After",
    ]);
  });

  it("toggling a work chip saves the full list", async () => {
    actions.saveWork.mockResolvedValue(
      snap({ work: ["wiped", "filter_replaced"] })
    );
    render(<VisitScreen initial={snap({ work: ["wiped"] })} />);
    fireEvent.click(screen.getByRole("button", { name: "Replaced filter" }));
    await waitFor(() =>
      expect(actions.saveWork).toHaveBeenCalledWith("v1", [
        "wiped",
        "filter_replaced",
      ])
    );
    expect(
      screen
        .getByRole("button", { name: "Replaced filter" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("Saved hh:mm appears after a save", async () => {
    actions.saveWork.mockResolvedValue(snap({ work: ["wiped"] }));
    render(<VisitScreen initial={snap()} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiped down" }));
    expect(await screen.findByText(/^Saved \d{1,2}:\d{2}/)).toBeTruthy();
  });

  it("a failed save says so and keeps the change on screen", async () => {
    actions.saveWork.mockRejectedValue(new Error("offline"));
    render(<VisitScreen initial={snap()} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiped down" }));
    expect(await screen.findByText("Not saved")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Wiped down" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("camera input is capture-only", () => {
    const { container } = render(<VisitScreen initial={snap()} />);
    fireEvent.click(screen.getByRole("button", { name: /Before/ }));
    const inputs = container.ownerDocument.querySelectorAll("input[type=file]");
    expect(inputs).toHaveLength(1);
    expect(inputs[0].getAttribute("capture")).toBe("environment");
    expect(inputs[0].getAttribute("accept")).toBe("image/*");
  });

  it("finish is enabled with nothing logged and lists what is missing", async () => {
    actions.finishVisit.mockResolvedValue({ visitId: "v1" });
    render(<VisitScreen initial={snap()} />);
    expect(screen.getByText(/Will be marked partial/)).toBeTruthy();
    const finish = screen.getByRole("button", { name: "Finish & lock record" });
    expect((finish as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(finish);
    await waitFor(() => expect(actions.finishVisit).toHaveBeenCalledWith("v1"));
    await waitFor(() => expect(push).toHaveBeenCalled());
  });

  it("logged found reading shows chips and Edit reading", () => {
    render(
      <VisitScreen
        initial={snap({
          found: {
            total_alkalinity: 90,
            ph: 8.0,
            calcium_hardness: null,
            sanitizer_ppm: 0.5,
          },
          foundAt: "2026-10-27T09:45:00.000Z",
        })}
      />
    );
    expect(screen.getByText("pH 8.0")).toBeTruthy();
    expect(screen.getByText("Alk 90")).toBeTruthy();
    expect(screen.getByText("Hard —")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit reading" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Log reading as left" })
    ).toBeTruthy();
  });

  it("flag saves and shows", async () => {
    actions.saveFlag.mockResolvedValue(snap({ flag: "Cover strap torn" }));
    render(<VisitScreen initial={snap()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Flag something for the owner" })
    );
    fireEvent.change(screen.getByLabelText("For the owner"), {
      target: { value: " Cover strap torn " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save flag" }));
    await waitFor(() =>
      expect(actions.saveFlag).toHaveBeenCalledWith("v1", "Cover strap torn")
    );
    expect(await screen.findByText("Cover strap torn")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove flag" })).toBeTruthy();
  });
});
