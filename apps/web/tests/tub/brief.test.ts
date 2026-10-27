import { describe, it, expect } from "vitest";
import { buildBrief } from "@/components/tub/brief";
import type { HistoryVisit } from "@/lib/tub-history";

const NOW = new Date("2026-10-27T15:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);
const TUB = { drainIntervalDays: null, filterIntervalDays: null };

const v = (
  daysAgo: number,
  ph: number | null,
  steps: string[] = []
): HistoryVisit => ({
  at: ago(daysAgo),
  cleaningSteps: steps,
  found: { ph },
});

describe("buildBrief", () => {
  it("no visits: four plain tiles, no NaN / Invalid / null", () => {
    const tiles = buildBrief({
      tub: TUB,
      visits: [],
      lastVisitOpened: null,
      now: NOW,
    });
    expect(tiles.map((t) => t.label)).toEqual([
      "Since drain",
      "pH on arrival",
      "On this filter",
      "Since last visit",
    ]);
    expect(tiles.map((t) => t.value)).toEqual(["—", "—", "—", "—"]);
    expect(tiles.every((t) => t.tone === "plain")).toBe(true);
    expect(tiles[3].note).toBe("No visits yet");
    expect(JSON.stringify(tiles)).not.toMatch(/NaN|Invalid|null|undefined/);
  });

  it("matches the mockup case", () => {
    const tiles = buildBrief({
      tub: TUB,
      visits: [
        v(9, 7.9),
        v(18, 8.0, ["filter_replaced"]),
        v(32, 7.9),
        v(41, 7.5, []),
        v(84, 7.4, ["drained_refilled"]),
      ],
      lastVisitOpened: true,
      now: NOW,
    });
    expect(tiles[0]).toEqual({
      value: "84d",
      label: "Since drain",
      note: "Usually every 90",
      tone: "due",
    });
    expect(tiles[1]).toEqual({
      value: "7.9",
      label: "pH on arrival",
      note: "High 3 visits running",
      tone: "due",
    });
    expect(tiles[2]).toMatchObject({
      value: "18d",
      note: "Usually every 60",
      tone: "plain",
    });
    expect(tiles[3]).toEqual({
      value: "9d",
      label: "Since last visit",
      note: "Record opened by owner",
      tone: "plain",
    });
  });

  it("pH in range shows the target; one low reading isn't a streak", () => {
    expect(
      buildBrief({
        tub: TUB,
        visits: [v(2, 7.5)],
        lastVisitOpened: false,
        now: NOW,
      })[1]
    ).toMatchObject({ value: "7.5", note: "Target 7.2–7.8", tone: "plain" });
    const low = buildBrief({
      tub: TUB,
      visits: [v(2, 7.0), v(9, 7.5)],
      lastVisitOpened: false,
      now: NOW,
    });
    expect(low[1]).toMatchObject({
      value: "7.0",
      note: "Low on arrival",
      tone: "due",
    });
    expect(low[3].note).toBe("Not opened yet");
  });

  it("last visit without pH → —", () => {
    expect(
      buildBrief({
        tub: TUB,
        visits: [v(2, null)],
        lastVisitOpened: null,
        now: NOW,
      })[1].value
    ).toBe("—");
  });

  it("uses the tub's own interval", () => {
    const tiles = buildBrief({
      tub: { drainIntervalDays: 120, filterIntervalDays: 30 },
      visits: [v(84, 7.5, ["drained_refilled", "filter_replaced"])],
      lastVisitOpened: null,
      now: NOW,
    });
    expect(tiles[0]).toMatchObject({
      note: "Usually every 120",
      tone: "plain",
    });
    expect(tiles[2]).toMatchObject({ note: "Usually every 30", tone: "due" });
  });
});
