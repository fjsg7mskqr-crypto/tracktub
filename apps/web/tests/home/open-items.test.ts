import { describe, it, expect } from "vitest";
import {
  bringList,
  itemsChip,
  openItemTitle,
  recheckSuggestions,
  type OpenItem,
} from "@/components/home/open-items";

let n = 0;
const item = (over: Partial<OpenItem> = {}): OpenItem => ({
  id: `i${++n}`,
  tubId: "cedar",
  kind: "other",
  title: "Something",
  note: null,
  openedAt: "2026-11-01T15:00:00Z",
  openedVisitId: null,
  ...over,
});

const reading = (
  over: Partial<Record<string, number | null>> = {}
): Record<
  "total_alkalinity" | "ph" | "calcium_hardness" | "sanitizer_ppm",
  number | null
> => ({
  total_alkalinity: 100,
  ph: 7.4,
  calcium_hardness: 200,
  sanitizer_ppm: 4,
  ...over,
});

describe("openItemTitle", () => {
  it("uses the kind's label; Other uses the typed text", () => {
    expect(openItemTitle("filter_soak")).toBe("Filters soaking");
    expect(openItemTitle("recheck")).toBe("Re-check reading");
    expect(openItemTitle("part")).toBe("Part needed");
    expect(openItemTitle("other", "  Cover strap loose ")).toBe(
      "Cover strap loose"
    );
    expect(openItemTitle("other", "  ")).toBe("Other");
    expect(openItemTitle("recheck", "Re-check pH")).toBe("Re-check pH");
  });
});

describe("itemsChip", () => {
  it("nothing open → null", () => {
    expect(itemsChip([])).toBeNull();
  });
  it("one item names it; several count", () => {
    expect(itemsChip([item({ kind: "part" })])).toBe("Waiting on part");
    expect(itemsChip([item({ kind: "filter_soak" })])).toBe("Filters soaking");
    expect(itemsChip([item({ kind: "recheck" })])).toBe("Re-check");
    expect(itemsChip([item({ kind: "other" })])).toBe("1 open");
    expect(itemsChip([item(), item({ kind: "part" })])).toBe("2 open");
  });
});

describe("bringList (the Bring mapping)", () => {
  it("a calm tub with nothing open needs nothing", () => {
    expect(bringList([], reading())).toEqual([]);
    expect(bringList([], null)).toEqual([]);
  });

  it("pH high → pH down + test strips", () => {
    expect(bringList([], reading({ ph: 7.9 }))).toEqual([
      "pH down",
      "Test strips",
    ]);
  });

  it("maps each reading direction to its product, deduped, in test order", () => {
    expect(
      bringList(
        [],
        reading({
          total_alkalinity: 140,
          ph: 8.0,
          calcium_hardness: 100,
          sanitizer_ppm: 0.5,
        })
      )
    ).toEqual(["pH down", "Calcium increaser", "Chlorine", "Test strips"]);
    expect(bringList([], reading({ total_alkalinity: 60, ph: 7.0 }))).toEqual([
      "Alkalinity up",
      "pH up",
      "Test strips",
    ]);
  });

  it("high hardness or chlorine needs no product, just a re-test", () => {
    expect(
      bringList([], reading({ calcium_hardness: 400, sanitizer_ppm: 6 }))
    ).toEqual(["Test strips"]);
  });

  it("open items add what they need", () => {
    expect(
      bringList(
        [
          item({ kind: "part", note: "Jet cover" }),
          item({ kind: "recheck", title: "Re-check pH" }),
          item({ kind: "part", note: null }),
          item({ kind: "filter_soak" }),
        ],
        reading()
      )
    ).toEqual(["Test strips", "Part: Jet cover", "The part"]);
  });
});

describe("recheckSuggestions", () => {
  it("none until the as-left reading is logged and out of range", () => {
    expect(recheckSuggestions(null, [])).toEqual([]);
    expect(recheckSuggestions(reading(), [])).toEqual([]);
  });

  it("one per out-of-range field, with the as-left value", () => {
    expect(
      recheckSuggestions(reading({ ph: 7.9, sanitizer_ppm: 0.5 }), [])
    ).toEqual([
      { field: "ph", title: "Re-check pH", note: "Left at 7.9" },
      {
        field: "sanitizer_ppm",
        title: "Re-check Chlorine",
        note: "Left at 0.5",
      },
    ]);
  });

  it("skips a field already left open as a re-check", () => {
    expect(
      recheckSuggestions(reading({ ph: 7.9 }), [
        item({ kind: "recheck", title: "Re-check pH" }),
      ])
    ).toEqual([]);
  });
});
