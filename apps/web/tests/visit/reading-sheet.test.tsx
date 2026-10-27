// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReadingSheet } from "@/components/visit/ReadingSheet";
import {
  accept,
  bump,
  initSheet,
  toValues,
} from "@/components/visit/reading-sheet-state";
import type { ReadingValues, VisitSnapshot } from "@/lib/visit";

afterEach(cleanup);

const lastFound: ReadingValues = {
  total_alkalinity: 90,
  ph: 8.0,
  calcium_hardness: 190,
  sanitizer_ppm: 0.5,
};

function snapshot(over: Partial<VisitSnapshot> = {}): VisitSnapshot {
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
    previous: {
      visitId: "old",
      visitedOn: "2026-10-17T09:00:00.000Z",
      found: lastFound,
      photos: [],
    },
    ...over,
  };
}

describe("reading sheet state", () => {
  it("rounds to the step and never goes below zero", () => {
    let s = initSheet({ ...lastFound, ph: 7.2, sanitizer_ppm: 0 }, null);
    s = bump(s, "ph", 1);
    expect(s.ph.value).toBe(7.3);
    s = bump(s, "sanitizer_ppm", -1);
    expect(s.sanitizer_ppm.value).toBe(0);
  });

  it("logged values start set; missing ones start unset with the suggestion", () => {
    const s = initSheet(
      {
        total_alkalinity: 100,
        ph: null,
        calcium_hardness: null,
        sanitizer_ppm: null,
      },
      lastFound
    );
    expect(s.total_alkalinity).toEqual({
      value: 100,
      set: true,
      suggestion: 90,
    });
    expect(s.ph).toEqual({ value: null, set: false, suggestion: 8 });
  });

  it("accept sets a row at its suggestion; without one it is a no-op", () => {
    expect(accept(initSheet(null, lastFound), "ph").ph).toEqual({
      value: 8,
      set: true,
      suggestion: 8,
    });
    expect(accept(initSheet(null, null), "ph").ph.set).toBe(false);
  });

  it("toValues maps unset rows to null", () => {
    expect(toValues(initSheet(null, lastFound))).toEqual({
      total_alkalinity: null,
      ph: null,
      calcium_hardness: null,
      sanitizer_ppm: null,
    });
  });
});

describe("ReadingSheet", () => {
  it("untouched rows log as null", async () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    render(
      <ReadingSheet
        snapshot={snapshot()}
        initialKind="found"
        onLog={onLog}
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Raise pH" }));
    fireEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(onLog).toHaveBeenCalledWith("found", {
      total_alkalinity: null,
      ph: 8.1,
      calcium_hardness: null,
      sanitizer_ppm: null,
    });
  });

  it("tapping a value accepts the suggestion", () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    render(
      <ReadingSheet
        snapshot={snapshot()}
        initialKind="found"
        onLog={onLog}
        onClose={() => {}}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Use 90 for Alkalinity" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(onLog.mock.calls[0][1].total_alkalinity).toBe(90);
    expect(onLog.mock.calls[0][1].ph).toBeNull();
  });

  it("as left suggests this visit's found values", () => {
    render(
      <ReadingSheet
        snapshot={snapshot({
          found: { ...lastFound, ph: 7.6 },
          foundAt: "2026-10-27T09:45:00.000Z",
        })}
        initialKind="left"
        onLog={vi.fn()}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Use 7.6 for pH" })).toBeTruthy();
    expect(screen.getByText("found 7.6 · target 7.2–7.8")).toBeTruthy();
  });

  it("out-of-range value is amber", () => {
    render(
      <ReadingSheet
        snapshot={snapshot()}
        initialKind="found"
        onLog={vi.fn()}
        onClose={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Use 8.0 for pH" }));
    const value = screen.getByRole("button", { name: "Use 8.0 for pH" });
    expect(value.style.color).toBe("var(--tt-due-text)");
  });

  it("no previous visit → no suggestions", () => {
    const onLog = vi.fn().mockResolvedValue(undefined);
    render(
      <ReadingSheet
        snapshot={snapshot({ previous: null })}
        initialKind="found"
        onLog={onLog}
        onClose={() => {}}
      />
    );
    expect(screen.getAllByText("—")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Raise pH" }));
    fireEvent.click(screen.getByRole("button", { name: "Log it" }));
    expect(onLog.mock.calls[0][1].ph).toBe(7.6);
  });
});
