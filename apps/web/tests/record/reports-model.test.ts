import { describe, expect, it } from "vitest";
import {
  buildSentList,
  historyVisits,
  parsePeriod,
  type SentEventRow,
} from "@/components/record/reports-model";

const event = (
  turnover_id: string,
  occurred_at: string,
  tub = "Cedar Cabin",
  client: string | null = "Lakeview Rentals"
): SentEventRow => ({
  turnover_id,
  occurred_at,
  turnover: {
    submitted_at_server: "2026-10-26T14:58:00Z",
    property: { name: tub, client: client ? { name: client } : null },
  },
});

describe("buildSentList", () => {
  it("one item per record at its first send, newest first, with opened", () => {
    const list = buildSentList(
      [
        event("a", "2026-10-26T15:30:00Z"),
        event("a", "2026-10-26T15:02:00Z"),
        event("b", "2026-10-27T12:00:00Z", "Pine Ridge", null),
      ],
      new Set(["a"])
    );
    expect(list).toEqual([
      {
        turnoverId: "b",
        title: "Pine Ridge · Oct 26",
        to: null,
        sentAt: "8:00 AM",
        opened: false,
      },
      {
        turnoverId: "a",
        title: "Cedar Cabin · Oct 26",
        to: "Lakeview Rentals",
        sentAt: "11:02 AM",
        opened: true,
      },
    ]);
  });

  it("drops events whose turnover isn't visible", () => {
    expect(
      buildSentList(
        [
          {
            turnover_id: "x",
            occurred_at: "2026-10-26T15:30:00Z",
            turnover: null,
          },
        ],
        new Set()
      )
    ).toEqual([]);
  });

  it("empty → empty", () => {
    expect(buildSentList([], new Set())).toEqual([]);
  });
});

describe("parsePeriod", () => {
  it.each([
    [undefined, "last6"],
    ["season", "season"],
    ["last6", "last6"],
    ["garbage", "last6"],
  ])("%s → %s", (input, expected) => {
    expect(parsePeriod(input)).toBe(expected);
  });
});

describe("historyVisits", () => {
  const v = (iso: string | null) => ({ submitted_at_server: iso, iso });
  const now = new Date("2026-10-27T12:00:00Z");

  it("last6 caps at six, newest first, drops unlocked", () => {
    const visits = [
      ...Array.from({ length: 8 }, (_, i) =>
        v(`2026-10-${String(10 + i).padStart(2, "0")}T12:00:00Z`)
      ),
      v(null),
    ];
    const out = historyVisits(visits, "last6", now);
    expect(out).toHaveLength(6);
    expect(out[0].iso).toBe("2026-10-17T12:00:00Z");
    expect(out[5].iso).toBe("2026-10-12T12:00:00Z");
  });

  it("season starts Jan 1 in the app zone", () => {
    const visits = [
      v("2026-01-01T06:00:00Z"), // Jan 1, 1:00 AM Detroit
      v("2026-01-01T03:00:00Z"), // Dec 31, 10:00 PM Detroit
      v("2025-08-01T12:00:00Z"),
    ];
    expect(historyVisits(visits, "season", now).map((x) => x.iso)).toEqual([
      "2026-01-01T06:00:00Z",
    ]);
  });

  it("season has no cap", () => {
    const visits = Array.from({ length: 9 }, (_, i) =>
      v(`2026-0${i + 1}-15T12:00:00Z`)
    );
    expect(historyVisits(visits, "season", now)).toHaveLength(9);
  });
});
