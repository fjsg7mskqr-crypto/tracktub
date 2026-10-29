import { describe, it, expect } from "vitest";
import {
  attentionList,
  calendarItems,
  weekCounts,
  type CareTub,
  type LoggedVisit,
} from "@/components/calendar/calendar-model";

const TZ = "America/Detroit";
// Tue Oct 27 2026, 11:00 Detroit.
const NOW = new Date("2026-10-27T15:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const tub = (id: string, name: string): CareTub => ({
  id,
  name,
  drainIntervalDays: null,
  filterIntervalDays: null,
});
const CEDAR = tub("cedar", "Cedar Cabin");
const PINE = tub("pine", "Pine Ridge");

let n = 0;
function visit(
  tubId: string,
  at: Date,
  steps: string[] = [],
  found: LoggedVisit["found"] = null,
  sent = false
): LoggedVisit {
  return { id: `v${++n}`, tubId, at, cleaningSteps: steps, found, sent };
}

describe("calendarItems", () => {
  it("a visit at 11 pm Detroit lands on the Detroit day", () => {
    const v = visit("cedar", new Date("2026-10-27T03:30:00Z"), [], null, true);
    const items = calendarItems([CEDAR], [v], NOW, TZ);
    expect(items.get("2026-10-26")?.[0]).toMatchObject({
      kind: "logged",
      href: `/records/${v.id}`,
      what: "Visit logged 11:30 PM · record sent",
      short: "Logged 11:30 PM · sent",
      sent: true,
    });
  });

  it("projects care due as a suggestion, linking the tub", () => {
    const items = calendarItems(
      [PINE],
      [visit("pine", ago(59), ["filter_replaced"])],
      NOW,
      TZ
    );
    expect(items.get("2026-10-28")?.[0]).toMatchObject({
      kind: "due",
      href: "/tubs/pine",
      what: "Filter change due (every ~60 days)",
      short: "Filter change due",
    });
  });

  it("overdue care sits on today", () => {
    const items = calendarItems(
      [CEDAR],
      [visit("cedar", ago(96), ["drained_refilled"])],
      NOW,
      TZ
    );
    expect(items.get("2026-10-27")?.[0].what).toBe(
      "Drain & refill due (every ~90 days) · 6 days over"
    );
  });

  it("no tubs or no visits → nothing", () => {
    expect(calendarItems([], [], NOW, TZ).size).toBe(0);
    expect(calendarItems([CEDAR], [], NOW, TZ).size).toBe(0);
  });
});

describe("attentionList", () => {
  const ph = (v: number) => ({ ph: v });

  it("worst first: overdue, then drift, then upcoming; skips far-off care", () => {
    const visits = [
      visit("cedar", ago(100), ["drained_refilled"], ph(7.9)),
      visit("cedar", ago(10), [], ph(8.0)),
      visit("cedar", ago(5), [], ph(7.9)),
      visit("pine", ago(57), ["filter_replaced"]),
      visit("pine", ago(30), ["drained_refilled"]),
    ];
    const items = attentionList([CEDAR, PINE], visits, NOW, TZ);
    expect(items.map((i) => i.title)).toEqual([
      "Cedar Cabin — drain overdue",
      "Cedar Cabin — pH arriving high",
      "Pine Ridge — filter change due Fri",
    ]);
    expect(items[0]).toMatchObject({
      detail: "100 days, you usually go 90",
      tone: "due",
    });
    expect(items[1].detail).toBe("7.9+ · 3 visits running");
    expect(items[2]).toMatchObject({
      detail: "57 days, you usually go 60",
      tone: "upcoming",
    });
  });

  it("no visits → []", () => {
    expect(attentionList([CEDAR], [], NOW, TZ)).toEqual([]);
  });
});

describe("weekCounts", () => {
  it("counts Monday–Sunday in the app zone, distinct records", () => {
    const counts = weekCounts(
      {
        visits: [
          visit("cedar", new Date("2026-10-26T05:00:00Z")), // Mon 1 am
          visit("cedar", new Date("2026-10-26T03:00:00Z")), // Sun 11 pm — last week
          visit("pine", ago(0)),
        ],
        sent: [
          { turnover_id: "a", occurred_at: "2026-10-26T15:00:00Z" },
          { turnover_id: "a", occurred_at: "2026-10-27T15:00:00Z" },
          { turnover_id: "b", occurred_at: "2026-10-20T15:00:00Z" },
        ],
        opened: [{ turnover_id: "a", opened_at: "2026-10-27T12:00:00Z" }],
      },
      NOW,
      TZ
    );
    expect(counts).toEqual({ logged: 2, sent: 1, opened: 1 });
  });
});
