// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { RecordView } from "@/components/record/RecordView";
import { buildRecord } from "@/components/record/record-model";
import { mockupRow } from "./fixtures";

vi.mock("@/lib/actions/proofEvent", () => ({ recordProofShare: vi.fn() }));

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
afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function setup(blank: string[] = []) {
  const row = mockupRow();
  const urls = new Map(
    row.photos.map((p) => [
      p.storage_path as string,
      blank.includes(p.storage_path as string)
        ? null
        : `https://img.test/${p.storage_path}`,
    ])
  );
  render(<RecordView visit={buildRecord(row, TZ, urls)} audience="owner" />);
  return screen.getAllByRole("button", { name: /^View .* photo full size$/ });
}

const viewer = () => document.querySelector("dialog.tt-photo-viewer");

const TZ = "America/Detroit";

describe("report photo viewer", () => {
  it("opens the tapped photo uncropped in a modal dialog", () => {
    const tiles = setup();
    expect(viewer()).toBeNull();
    fireEvent.click(tiles[0]);
    const d = viewer() as HTMLDialogElement;
    expect(d.open).toBe(true);
    const img = d.querySelector("img.tt-photo-viewer-img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(
      tiles[0].querySelector("img")!.getAttribute("src")
    );
    expect(d.textContent).toContain(`1 of ${tiles.length}`);
    expect(d.querySelector("p")?.textContent).toMatch(/·/);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("close button, Esc and backdrop close it and return focus", () => {
    const tiles = setup();
    const closers: Array<(d: HTMLDialogElement) => void> = [
      () =>
        fireEvent.click(screen.getByRole("button", { name: "Close photo" })),
      (d) => act(() => d.close()), // what the browser does on Esc
      (d) => fireEvent.click(d),
    ];
    for (const close of closers) {
      fireEvent.click(tiles[1]);
      close(viewer() as HTMLDialogElement);
      expect(viewer()).toBeNull();
      expect(document.activeElement).toBe(tiles[1]);
      expect(document.body.style.overflow).toBe("");
    }
  });

  it("moves with buttons and arrow keys, without wrapping", () => {
    const tiles = setup();
    const n = tiles.length;
    fireEvent.click(tiles[0]);
    const d = viewer() as HTMLDialogElement;
    const prev = screen.getByRole("button", { name: "Previous photo" });
    const next = screen.getByRole("button", { name: "Next photo" });
    expect((prev as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(next);
    expect(d.textContent).toContain(`2 of ${n}`);
    fireEvent.keyDown(d, { key: "ArrowRight" });
    expect(d.textContent).toContain(`3 of ${n}`);
    fireEvent.keyDown(d, { key: "ArrowLeft" });
    expect(d.textContent).toContain(`2 of ${n}`);
    fireEvent.keyDown(d, { key: "ArrowLeft" });
    fireEvent.keyDown(d, { key: "ArrowLeft" });
    expect(d.textContent).toContain(`1 of ${n}`);
    for (let i = 0; i < n + 2; i++) fireEvent.keyDown(d, { key: "ArrowRight" });
    expect(d.textContent).toContain(`${n} of ${n}`);
    expect((next as HTMLButtonElement).disabled).toBe(true);
  });

  it("swipes between photos", () => {
    const tiles = setup();
    fireEvent.click(tiles[0]);
    const stage = viewer()!.querySelector(".tt-photo-viewer-stage")!;
    fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(stage, {
      changedTouches: [{ clientX: 80, clientY: 105 }],
    });
    expect(viewer()!.textContent).toContain(`2 of ${tiles.length}`);
  });

  it("skips and does not button-ize photos without a link", () => {
    const row = mockupRow();
    const tiles = setup([row.photos[0].storage_path as string]);
    expect(tiles).toHaveLength(row.photos.length - 1);
    expect(screen.getAllByText("Photo unavailable")).toHaveLength(1);
    expect(
      screen.getByRole("img", { name: /photo unavailable$/ }).closest("button")
    ).toBeNull();
    fireEvent.click(tiles[0]);
    expect(viewer()!.textContent).toContain(`1 of ${tiles.length}`);
  });

  it("shows a reload prompt when the signed link has expired", () => {
    const tiles = setup();
    fireEvent.click(tiles[0]);
    fireEvent.error(viewer()!.querySelector("img.tt-photo-viewer-img")!);
    expect(
      screen.getByText("This photo link expired. Reload the page to see it.")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(viewer()!.querySelector("img.tt-photo-viewer-img")).toBeNull();
  });
});
