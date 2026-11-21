// @vitest-environment jsdom
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { VisitOpenItem, VisitSnapshot } from "@/lib/visit";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const actions = vi.hoisted(() => ({
  saveWork: vi.fn(),
  saveAdded: vi.fn(),
  saveFlag: vi.fn(),
  saveNotes: vi.fn(),
  saveNextVisit: vi.fn(),
  logReading: vi.fn(),
  savePhoto: vi.fn(),
  finishVisit: vi.fn(),
  leaveOpenItem: vi.fn(),
  setOpenItemStatus: vi.fn(),
}));
vi.mock("@/lib/actions/visit", () => actions);

const compress = vi.hoisted(() => ({ compressPhoto: vi.fn() }));
vi.mock("@/lib/compress-photo", async (orig) => ({
  ...(await orig<typeof import("@/lib/compress-photo")>()),
  compressPhoto: compress.compressPhoto,
}));

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
    productSuggestions: [],
    notes: "",
    flag: null,
    openItems: [],
    nextVisit: null,
    scheduledHere: null,
    previous: null,
    ...over,
  };
}

// jsdom has no <dialog> modal support; mimic what browsers do.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

beforeEach(() => {
  for (const fn of Object.values(actions)) fn.mockReset();
  push.mockReset();
  compress.compressPhoto.mockReset();
  compress.compressPhoto.mockImplementation(async (f: File) => f);
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

  it("keeps loaded product suggestions after a save response", async () => {
    const productSuggestions = [
      { product: "Chlorine granules", amount: "3 oz" },
    ];
    actions.saveWork.mockResolvedValue(snap());
    render(<VisitScreen initial={snap({ productSuggestions })} />);
    fireEvent.click(screen.getByRole("button", { name: "Wiped down" }));
    await screen.findByText(/^Saved \d{1,2}:\d{2}/);
    expect(
      screen.getByRole("button", { name: "Chlorine granules" })
    ).toBeTruthy();
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

  it("each photo step is one tap: a label around a capture-only input, no sheet", () => {
    const { container } = render(<VisitScreen initial={snap()} />);
    const doc = container.ownerDocument;
    const inputs = doc.querySelectorAll("input[type=file]");
    expect(inputs).toHaveLength(3);
    for (const input of Array.from(inputs)) {
      expect(input.getAttribute("capture")).toBe("environment");
      expect(input.getAttribute("accept")).toBe("image/*");
      expect(input.closest("label")).toBeTruthy();
    }
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("captured photo uploads with the capture time", async () => {
    actions.savePhoto.mockResolvedValue(snap());
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const { container } = render(<VisitScreen initial={snap()} />);
    const input = container.ownerDocument.querySelectorAll(
      "input[type=file]"
    )[0] as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(actions.savePhoto).toHaveBeenCalled());
    const fd = actions.savePhoto.mock.calls[0][0] as FormData;
    expect(fd.get("kind")).toBe("before");
    expect(fd.get("visitId")).toBe("v1");
    expect(typeof fd.get("capturedAt")).toBe("string");
  });

  it("a photo that can't be processed is never uploaded; retake is right there", async () => {
    compress.compressPhoto.mockRejectedValue(new Error("nope"));
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const { container } = render(<VisitScreen initial={snap()} />);
    const input = container.ownerDocument.querySelectorAll(
      "input[type=file]"
    )[0] as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "Couldn't process that photo. Please retake it."
    );
    expect(alert.tagName).toBe("LABEL");
    expect(alert.querySelector("input[type=file][capture]")).toBeTruthy();
    expect(actions.savePhoto).not.toHaveBeenCalled();
    // A fresh capture clears the message and uploads.
    actions.savePhoto.mockResolvedValue(snap());
    compress.compressPhoto.mockImplementation(async (f: File) => f);
    fireEvent.change(alert.querySelector("input") as HTMLInputElement, {
      target: { files: [new File(["x"], "b.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(actions.savePhoto).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  const shot = (kind: "before" | "after" | "cover") => ({
    id: `ph-${kind}`,
    kind,
    storagePath: `u/${kind}.jpg`,
    url: `https://x.test/sign/${kind}.jpg`,
    capturedAt: "2026-10-27T09:45:00.000Z",
  });
  const previous = {
    visitId: "v0",
    visitedOn: "2026-10-20T09:00:00.000Z",
    found: null,
    notes: "",
    photos: [
      {
        id: "ph0",
        kind: "after" as const,
        storagePath: "u/old-after.jpg",
        url: "https://x.test/sign/old-after.jpg",
        capturedAt: null,
      },
    ],
  };
  const viewer = () => document.querySelector("dialog.tt-photo-viewer");

  it("a taken tile opens the viewer, not the camera; Retake lives in the viewer", async () => {
    actions.savePhoto.mockResolvedValue(snap());
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    render(<VisitScreen initial={snap({ photos: [shot("before")] })} />);
    const tile = screen.getByRole("button", { name: "View Before photo" });
    expect(tile.closest("label")).toBeNull();
    expect(tile.querySelector("input")).toBeNull();
    fireEvent.click(tile);
    const d = viewer() as HTMLDialogElement;
    expect(d.open).toBe(true);
    const retake = screen.getByText("Retake").closest("label")!;
    const input = retake.querySelector(
      "input[type=file][capture=environment][accept='image/*']"
    ) as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    expect(viewer()).toBeNull();
    await waitFor(() => expect(actions.savePhoto).toHaveBeenCalled());
    expect((actions.savePhoto.mock.calls[0][0] as FormData).get("kind")).toBe(
      "before"
    );
  });

  it("while uploading, the tile opens the viewer on the preview", async () => {
    let finish: (v: VisitSnapshot) => void = () => undefined;
    actions.savePhoto.mockReturnValue(new Promise((r) => (finish = r)));
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    render(<VisitScreen initial={snap({ photos: [shot("before")] })} />);
    fireEvent.click(screen.getByRole("button", { name: "View Before photo" }));
    fireEvent.change(document.querySelector("dialog input") as Element, {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(actions.savePhoto).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "View Before photo" }));
    expect(
      document.querySelector("img.tt-photo-viewer-img")?.getAttribute("src")
    ).toBe("blob:preview");
    expect(viewer()?.textContent).toContain("Saving…");
    expect(screen.getByText("Retake")).toBeTruthy();
    await act(async () => finish(snap()));
  });

  it("empty tiles and the failed row still open the camera directly", () => {
    render(<VisitScreen initial={snap({ photos: [shot("before")] })} />);
    const inputs = document.querySelectorAll("input[type=file]");
    expect(inputs).toHaveLength(2); // after + cover; before is a viewer button
    for (const input of Array.from(inputs)) {
      expect(input.closest("label")).toBeTruthy();
    }
    expect(viewer()).toBeNull();
  });

  it("prev/next walk this visit's photos in on-screen order; Esc closes and focus returns", async () => {
    render(
      <VisitScreen
        initial={snap({
          photos: [shot("cover"), shot("before"), shot("after")],
        })}
      />
    );
    const cover = () =>
      screen.getByRole("button", { name: "View Cover on photo" });
    fireEvent.click(screen.getByRole("button", { name: "View Before photo" }));
    const d = viewer() as HTMLDialogElement;
    expect(d.textContent).toContain("1 of 3");
    fireEvent.keyDown(d, { key: "ArrowRight" });
    expect(d.textContent).toContain("2 of 3");
    expect(d.querySelector("img")?.getAttribute("alt")).toBe(
      "After · full tub"
    );
    fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
    expect(d.textContent).toContain("3 of 3");
    // Retake always applies to the photo on screen (the cover, here).
    actions.savePhoto.mockResolvedValue(
      snap({ photos: [shot("cover"), shot("before"), shot("after")] })
    );
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
    fireEvent.change(d.querySelector("input") as Element, {
      target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
    });
    expect(viewer()).toBeNull();
    await waitFor(() => expect(actions.savePhoto).toHaveBeenCalled());
    expect((actions.savePhoto.mock.calls[0][0] as FormData).get("kind")).toBe(
      "after"
    );
    fireEvent.click(cover());
    act(() => (viewer() as HTMLDialogElement).close()); // what the browser does on Esc
    expect(viewer()).toBeNull();
    expect(document.activeElement).toBe(cover());
  });

  it("last visit's shot (tile and thumbnail) opens the viewer without Retake", () => {
    render(<VisitScreen initial={snap({ previous })} />);
    const past = screen.getByRole("button", {
      name: "View last visit's After · full tub photo",
    });
    fireEvent.click(past);
    expect(viewer()?.textContent).toContain("Last visit · Oct 20");
    expect(screen.queryByText("Retake")).toBeNull();
    act(() => (viewer() as HTMLDialogElement).close());
    expect(document.activeElement).toBe(past);
    const thumb = screen.getByLabelText(
      "Last visit's After · full tub photo — view"
    );
    expect(thumb.closest("label")).toBeNull();
    fireEvent.click(thumb);
    expect(viewer()?.textContent).toContain("Last visit · Oct 20");
    expect(screen.queryByText("Retake")).toBeNull();
    fireEvent.click(viewer() as Element);
    expect(viewer()).toBeNull();
  });

  it("no last-visit controls when there is no earlier photo", () => {
    render(<VisitScreen initial={snap()} />);
    expect(screen.queryByLabelText(/Last visit's .* photo — view/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /View last visit/ })
    ).toBeNull();
  });

  it("expired link: reload note promises a save only when everything is saved", () => {
    render(<VisitScreen initial={snap({ photos: [shot("before")] })} />);
    fireEvent.click(screen.getByRole("button", { name: "View Before photo" }));
    fireEvent.error(document.querySelector("img.tt-photo-viewer-img")!);
    expect(screen.getByRole("alert").textContent).toContain(
      "(your visit is saved)"
    );
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
  });

  it("expired link with unsaved notes uses the neutral wording", () => {
    render(<VisitScreen initial={snap({ photos: [shot("before")] })} />);
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "typed but not saved yet" },
    });
    fireEvent.click(screen.getByRole("button", { name: "View Before photo" }));
    fireEvent.error(document.querySelector("img.tt-photo-viewer-img")!);
    const note = screen.getByRole("alert").textContent ?? "";
    expect(note).toContain(
      "This photo link expired. Reload the page to see it."
    );
    expect(note).not.toContain("your visit is saved");
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

describe("VisitScreen — open items", () => {
  const item = (over: Partial<VisitOpenItem> = {}): VisitOpenItem => ({
    id: "t1",
    tubId: "p1",
    kind: "filter_soak",
    title: "Filters soaking",
    note: "Swap back in",
    openedAt: "2026-10-24T14:00:00.000Z",
    openedVisitId: "old",
    status: "open",
    ...over,
  });

  beforeEach(() => {
    actions.setOpenItemStatus.mockReset();
    actions.leaveOpenItem.mockReset();
  });

  it("shows the tub's open items at the top and settles one with a tap", async () => {
    actions.setOpenItemStatus.mockResolvedValue(
      snap({ openItems: [item({ status: "settled" })] })
    );
    render(<VisitScreen initial={snap({ openItems: [item()] })} />);
    expect(screen.getAllByRole("heading", { level: 2 })[0].textContent).toBe(
      "Left open last time · 1 to settle"
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Settled: Filters soaking" })
    );
    await waitFor(() =>
      expect(actions.setOpenItemStatus).toHaveBeenCalledWith(
        "v1",
        "t1",
        "settled"
      )
    );
    expect(
      screen
        .getByRole("checkbox", { name: "Settled: Filters soaking" })
        .getAttribute("aria-checked")
    ).toBe("true");
  });

  it("leaves an item for next time from a chip, with an optional note", async () => {
    actions.leaveOpenItem.mockResolvedValue(snap());
    render(<VisitScreen initial={snap()} />);
    fireEvent.click(screen.getByRole("button", { name: "Part needed" }));
    fireEvent.change(screen.getByLabelText("Note (optional)"), {
      target: { value: "Jet cover" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Leave it open" }));
    await waitFor(() =>
      expect(actions.leaveOpenItem).toHaveBeenCalledWith(
        "v1",
        "part",
        "",
        "Jet cover"
      )
    );
  });

  it("Other needs its text before it can be left", () => {
    render(<VisitScreen initial={snap()} />);
    fireEvent.click(screen.getByRole("button", { name: "Other" }));
    const leave = screen.getByRole("button", { name: "Leave it open" });
    expect((leave as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("What's left open"), {
      target: { value: "Cover strap loose" },
    });
    expect((leave as HTMLButtonElement).disabled).toBe(false);
  });

  it("suggests a one-tap re-check when the as-left reading is out of range", async () => {
    actions.leaveOpenItem.mockResolvedValue(snap());
    const left = {
      total_alkalinity: 100,
      ph: 7.9,
      calcium_hardness: 200,
      sanitizer_ppm: 4,
    };
    render(<VisitScreen initial={snap({ left })} />);
    fireEvent.click(screen.getByRole("button", { name: /Re-check pH/ }));
    await waitFor(() =>
      expect(actions.leaveOpenItem).toHaveBeenCalledWith(
        "v1",
        "recheck",
        "Re-check pH",
        "Left at 7.9"
      )
    );
  });

  it("open items never block finishing", async () => {
    actions.finishVisit.mockResolvedValue({ visitId: "v1" });
    render(<VisitScreen initial={snap({ openItems: [item()] })} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Finish & lock record" })
    );
    await waitFor(() => expect(actions.finishVisit).toHaveBeenCalledWith("v1"));
  });

  it("'Remind me next visit' turns the note into an open item and confirms", async () => {
    actions.leaveOpenItem.mockResolvedValue(snap());
    actions.saveNotes.mockResolvedValue(snap());
    render(
      <VisitScreen initial={snap({ notes: "Slight foaming, used vac" })} />
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Remind me next visit" })
    );
    await waitFor(() =>
      expect(actions.leaveOpenItem).toHaveBeenCalledWith(
        "v1",
        "other",
        "Slight foaming, used vac",
        ""
      )
    );
    expect(screen.getByText(/Will show at the next visit/)).toBeTruthy();
  });

  it("'Remind me next visit' is disabled while the note is empty", () => {
    render(<VisitScreen initial={snap()} />);
    const b = screen.getByRole("button", { name: "Remind me next visit" });
    expect((b as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows last visit's note at the top, and nothing when there is none", () => {
    const prev = {
      visitId: "v0",
      visitedOn: "2026-10-20T09:00:00.000Z",
      found: null,
      photos: [],
      notes: "Slight foaming, used vac",
    };
    const first = render(<VisitScreen initial={snap({ previous: prev })} />);
    const region = screen.getByRole("region", { name: "Last visit's note" });
    expect(region.textContent).toContain("Slight foaming, used vac");
    first.unmount();
    render(
      <VisitScreen initial={snap({ previous: { ...prev, notes: "" } })} />
    );
    expect(screen.queryByText("Last visit's note")).toBeNull();
  });

  it("puts Notes and Leave for next time right above Finish", () => {
    render(<VisitScreen initial={snap()} />);
    const order = Array.from(document.body.querySelectorAll("h3, button"))
      .map((e) => e.textContent ?? "")
      .filter((t) =>
        [
          "Leave for next time",
          "Remind me next visit",
          "Finish & lock record",
        ].includes(t)
      );
    expect(order).toEqual([
      "Remind me next visit",
      "Leave for next time",
      "Finish & lock record",
    ]);
  });

  describe("next visit (#401)", () => {
    const radio = (name: string) => screen.getByRole("radio", { name });

    it("defaults to None and offers the quick picks as 48px+ targets", () => {
      render(<VisitScreen initial={snap()} />);
      const group = screen.getByRole("radiogroup", { name: "When" });
      expect(
        Array.from(group.querySelectorAll("button")).map((b) => b.textContent)
      ).toEqual(["None", "In 2 days", "In 3 days", "In 1 week", "Pick a date"]);
      expect(radio("None").getAttribute("aria-checked")).toBe("true");
      expect(screen.queryByLabelText("Reason for the next visit")).toBeNull();
      expect((radio("In 2 days") as HTMLElement).style.minHeight).toBe("48px");
      expect(actions.saveNextVisit).not.toHaveBeenCalled();
    });

    it("a quick pick saves the day; the reason saves on blur", async () => {
      actions.saveNextVisit.mockResolvedValue(snap());
      render(<VisitScreen initial={snap()} />);
      fireEvent.click(radio("In 3 days"));
      expect(actions.saveNextVisit).toHaveBeenCalledTimes(1);
      const [vid, dueOn, reason] = actions.saveNextVisit.mock.calls[0];
      expect(vid).toBe("v1");
      expect(dueOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(reason).toBe("");

      const input = screen.getByLabelText("Reason for the next visit");
      expect(input.getAttribute("maxlength")).toBe("120");
      fireEvent.change(input, { target: { value: "Re-check foaming" } });
      fireEvent.blur(input);
      await waitFor(() =>
        expect(actions.saveNextVisit).toHaveBeenLastCalledWith(
          "v1",
          dueOn,
          "Re-check foaming"
        )
      );
      expect(screen.getByRole("status").textContent).toContain("Scheduled for");
    });

    it("Pick a date waits for a date, then saves it", () => {
      actions.saveNextVisit.mockResolvedValue(snap());
      render(<VisitScreen initial={snap()} />);
      fireEvent.click(radio("Pick a date"));
      expect(actions.saveNextVisit).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText("Next visit date"), {
        target: { value: "2099-01-05" },
      });
      expect(actions.saveNextVisit).toHaveBeenCalledWith(
        "v1",
        "2099-01-05",
        ""
      );
    });

    it("None clears a scheduled visit", () => {
      actions.saveNextVisit.mockResolvedValue(snap());
      render(
        <VisitScreen
          initial={snap({
            nextVisit: { dueOn: "2099-01-05", reason: "Re-check foaming" },
          })}
        />
      );
      expect(radio("Pick a date").getAttribute("aria-checked")).toBe("true");
      expect(
        (screen.getByLabelText("Reason for the next visit") as HTMLInputElement)
          .value
      ).toBe("Re-check foaming");
      fireEvent.click(radio("None"));
      expect(actions.saveNextVisit).toHaveBeenCalledWith("v1", null, "");
    });

    it("shows the scheduled reason in the brief at the next visit", () => {
      render(
        <VisitScreen
          initial={snap({
            scheduledHere: { dueOn: "2026-10-30", reason: "Re-check foaming" },
          })}
        />
      );
      const region = screen.getByRole("region", { name: "Scheduled re-check" });
      expect(region.textContent).toContain("Re-check foaming");
      expect(region.textContent).toContain("Fri, Oct 30");
    });

    it("has no brief section when nothing was scheduled", () => {
      render(<VisitScreen initial={snap()} />);
      expect(
        screen.queryByRole("region", { name: "Scheduled re-check" })
      ).toBeNull();
    });
  });
});
