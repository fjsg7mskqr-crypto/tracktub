// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { RecordView } from "@/components/record/RecordView";
import { buildRecord } from "@/components/record/record-model";
import { emptyRow, mockupRow } from "./fixtures";

vi.mock("@/lib/actions/proofEvent", () => ({ recordProofShare: vi.fn() }));

afterEach(cleanup);

const FOOTER =
  "Photos taken live in the TrackTub camera. Times stamped by TrackTub's server; the record was locked when submitted and can't be edited.";
const URL = "https://tracktub.com/proof/7Kq2tok";

/** D23: words the record must never use, anywhere. */
export const BANNED_WORDS = [
  "verified",
  "tamper-proof",
  "dispute-grade",
  "immutable",
];

describe("RecordView", () => {
  it("operator view has Send / Copy and the owner-preview note", () => {
    render(
      <RecordView
        visit={buildRecord(mockupRow())}
        audience="operator"
        shareUrl={URL}
      />
    );
    expect(screen.getByRole("button", { name: "Send to owner" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
    expect(
      screen.getByText("Below is exactly what the owner sees.")
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Cedar Cabin/ }).getAttribute("href")
    ).toBe("/tubs/prop-1");
  });

  it("owner view has no operator controls", () => {
    render(
      <RecordView
        visit={buildRecord(mockupRow())}
        audience="owner"
        shareUrl={URL}
      />
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(
      screen.queryByText("Below is exactly what the owner sees.")
    ).toBeNull();
  });

  it("prints the record facts", () => {
    render(
      <RecordView
        visit={buildRecord(mockupRow())}
        audience="owner"
        shareUrl={URL}
      />
    );
    expect(screen.getByText("Cedar Cabin")).toBeTruthy();
    expect(
      screen.getByText("Lakeview Rentals · Mon Oct 26, 2026")
    ).toBeTruthy();
    expect(
      screen.getByText("Serviced by Ethan N. · 9:42 – 10:58 AM")
    ).toBeTruthy();
    expect(screen.getByText("Locked 10:58 AM")).toBeTruthy();
    expect(screen.getByText("Found 9:45 AM")).toBeTruthy();
    expect(screen.getByText("Left 10:52 AM")).toBeTruthy();
    expect(screen.getByText("Before · 9:43 AM")).toBeTruthy();
    expect(screen.getByText("— Not drained")).toBeTruthy();
    expect(screen.getByText("✓ Cleaned filter")).toBeTruthy();
    expect(screen.getByText(FOOTER)).toBeTruthy();
    expect(
      screen.getByText(
        "In range when re-tested at 10:52 AM, before the visit was closed."
      )
    ).toBeTruthy();
    expect(screen.getByText(/Record TT-3F9A2C1E/)).toBeTruthy();
    expect(screen.getByText(/tracktub\.com\/proof\/7Kq2tok/)).toBeTruthy();
    expect(screen.queryByText("Partial")).toBeNull();
  });

  it("hides the owner flag when there is none and shows it when set", () => {
    const { unmount } = render(
      <RecordView visit={buildRecord(mockupRow())} audience="owner" />
    );
    expect(screen.queryByText("For the owner")).toBeNull();
    unmount();
    render(
      <RecordView
        visit={buildRecord(mockupRow({ owner_flag: "Cover strap fraying" }))}
        audience="owner"
      />
    );
    expect(screen.getByText("For the owner")).toBeTruthy();
    expect(screen.getByText("Cover strap fraying")).toBeTruthy();
  });

  it("empty visit renders, marked partial", () => {
    render(<RecordView visit={buildRecord(emptyRow())} audience="owner" />);
    expect(screen.getByText("Partial")).toBeTruthy();
    expect(
      screen.getByText(
        "Not logged: reading as found, reading as left, before photo, after photo, cover photo."
      )
    ).toBeTruthy();
    expect(screen.getByText("No reading logged.")).toBeTruthy();
    expect(screen.getByText("No photos.")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Invalid|NaN|undefined/);
  });

  it("shows next due when known", () => {
    render(
      <RecordView
        visit={buildRecord(mockupRow())}
        audience="owner"
        nextDue="Drain due Jan 24"
      />
    );
    expect(screen.getByText(/Drain due Jan 24 · Record TT-/)).toBeTruthy();
  });

  it("no banned words", () => {
    for (const row of [mockupRow({ owner_flag: "x" }), emptyRow()]) {
      for (const audience of ["operator", "owner"] as const) {
        const html = renderToStaticMarkup(
          <RecordView
            visit={buildRecord(row)}
            audience={audience}
            shareUrl={URL}
            nextDue="Drain due Jan 24"
          />
        ).toLowerCase();
        for (const word of BANNED_WORDS) expect(html).not.toContain(word);
      }
    }
  });
});
