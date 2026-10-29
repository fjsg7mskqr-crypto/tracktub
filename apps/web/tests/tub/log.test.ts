import { describe, it, expect } from "vitest";
import {
  draftEntries,
  isPartial,
  stillToLog,
  visitEnd,
  visitHeadline,
  type LogVisit,
} from "@/components/tub/log";

const T = (hhmm: string) => new Date(`2026-10-27T${hhmm}:00Z`);

function lv(over: Partial<LogVisit> = {}): LogVisit {
  return {
    id: "v1",
    status: "submitted_locked",
    at: T("13:30"),
    cleaningSteps: [],
    found: null,
    left: null,
    foundAt: null,
    leftAt: null,
    treatments: [],
    photos: [],
    ...over,
  };
}

describe("visitHeadline", () => {
  it("out-of-range found values, left in range, work, photos", () => {
    expect(
      visitHeadline(
        lv({
          found: {
            total_alkalinity: 70,
            ph: 7.9,
            calcium_hardness: 200,
            sanitizer_ppm: 0.5,
          },
          left: {
            total_alkalinity: 100,
            ph: 7.5,
            calcium_hardness: 200,
            sanitizer_ppm: 2,
          },
          cleaningSteps: ["filters_cleaned"],
          treatments: ["Alk up 4 oz", "pH down 2 oz"],
          photos: [
            { phase: "before", slot: "full_frame", capturedAt: T("13:31") },
            { phase: "after", slot: "full_frame", capturedAt: T("14:10") },
            { phase: "after", slot: "cover", capturedAt: T("14:15") },
          ],
        })
      )
    ).toBe(
      "Found Alk 70, pH 7.9, Cl 0.5 · left all in range · filters cleaned · Alk up 4 oz, pH down 2 oz · 3 photos"
    );
  });

  it("unset rows: no reading, never null/NaN", () => {
    const line = visitHeadline(lv({ found: { ph: null }, left: { ph: null } }));
    expect(line).toBe("No reading · no photos");
    expect(line).not.toMatch(/null|NaN|undefined/);
  });

  it("found in range, left out of range, one photo", () => {
    expect(
      visitHeadline(
        lv({
          found: { ph: 7.5 },
          left: { ph: 8.0 },
          photos: [{ phase: "before", slot: "full_frame", capturedAt: null }],
        })
      )
    ).toBe("Found in range · left pH 8.0 · 1 photo");
  });
});

describe("isPartial", () => {
  it("true without photos or without a found reading", () => {
    expect(isPartial(lv({ found: { ph: 7.5 } }))).toBe(true);
    expect(
      isPartial(
        lv({
          photos: [{ phase: "before", slot: "full_frame", capturedAt: null }],
        })
      )
    ).toBe(true);
  });

  it("false with a found reading and a photo", () => {
    expect(
      isPartial(
        lv({
          found: { ph: 7.5 },
          photos: [{ phase: "before", slot: "full_frame", capturedAt: null }],
        })
      )
    ).toBe(false);
  });
});

describe("visitEnd", () => {
  it("is the latest entry time; null with no timed entries", () => {
    expect(visitEnd(lv())).toBeNull();
    expect(
      visitEnd(
        lv({
          foundAt: T("13:40"),
          leftAt: T("14:05"),
          photos: [{ phase: "after", slot: "cover", capturedAt: T("14:15") }],
        })
      )
    ).toEqual(T("14:15"));
  });
});

describe("stillToLog / draftEntries", () => {
  const draft = lv({
    status: "draft",
    found: { ph: 8.0, sanitizer_ppm: 0.5, total_alkalinity: 90 },
    foundAt: T("09:45"),
    photos: [{ phase: "before", slot: "full_frame", capturedAt: T("09:43") }],
  });

  it("lists what's missing, in visit order", () => {
    expect(stillToLog(draft)).toEqual([
      "Work",
      "Reading as left",
      "After photos",
    ]);
    expect(stillToLog(lv({ status: "draft" }))).toEqual([
      "Before photo",
      "Reading as found",
      "Work",
      "Reading as left",
      "After photos",
    ]);
  });

  it("after photos need both full tub and cover on", () => {
    expect(
      stillToLog(
        lv({
          photos: [{ phase: "after", slot: "full_frame", capturedAt: null }],
        })
      )
    ).toContain("After photos");
  });

  it("entries are oldest first, untimed work last, chips flag out-of-range", () => {
    const entries = draftEntries({
      ...draft,
      cleaningSteps: ["wiped"],
      treatments: ["pH down 2 oz"],
    });
    expect(entries.map((e) => e.title)).toEqual([
      "Photo · before",
      "Reading · as found",
      "Work",
    ]);
    expect(entries[1].chips).toEqual([
      { text: "Alk 90", out: false },
      { text: "pH 8.0", out: true },
      { text: "Cl 0.5", out: true },
    ]);
    expect(entries[2]).toMatchObject({
      at: null,
      text: "wiped down · pH down 2 oz",
    });
  });

  it("an empty draft has no entries", () => {
    expect(draftEntries(lv({ status: "draft" }))).toEqual([]);
  });
});
