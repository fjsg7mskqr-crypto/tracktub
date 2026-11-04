import { describe, it, expect } from "vitest";
import {
  boardOrder,
  boardState,
  careCountdown,
  focusCard,
  ringState,
  todaysRoute,
  tubProblem,
  visitProgress,
  type HomeDraft,
  type HomeTub,
  type HomeVisit,
} from "@/components/home/home-model";
import type { OpenItem } from "@/components/home/open-items";

const TZ = "America/Detroit";
// Wed Nov 4 2026, 11:00 Detroit (EST, UTC-5).
const NOW = new Date("2026-11-04T16:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const tub = (
  id: string,
  name: string,
  drain: number | null = null
): HomeTub => ({
  id,
  name,
  clientName: null,
  drainIntervalDays: drain,
  filterIntervalDays: null,
});
const CEDAR = tub("cedar", "Cedar Cabin");
const PINE = tub("pine", "Pine Lodge");
const ASPEN = tub("aspen", "Aspen A-Frame");
const RIDGE = tub("ridge", "Ridge House");

const OK = {
  total_alkalinity: 100,
  ph: 7.4,
  calcium_hardness: 200,
  sanitizer_ppm: 2,
};

let n = 0;
function visit(
  tubId: string,
  at: Date,
  over: Partial<HomeVisit> = {}
): HomeVisit {
  return {
    id: `v${++n}`,
    tubId,
    at,
    cleaningSteps: [],
    found: null,
    sent: false,
    left: null,
    ownerFlag: null,
    report: "not_sent",
    ...over,
  };
}
const item = (tubId: string, over: Partial<OpenItem> = {}): OpenItem => ({
  id: `i${++n}`,
  tubId,
  kind: "other",
  title: "Thing",
  note: null,
  openedAt: ago(2).toISOString(),
  openedVisitId: null,
  ...over,
});
const draft = (
  tubId: string,
  openedAt: Date,
  over: Partial<HomeDraft> = {}
): HomeDraft => ({
  id: `d-${tubId}`,
  tubId,
  openedAt,
  photoKinds: [],
  foundLogged: false,
  leftLogged: false,
  workCount: 0,
  ...over,
});

describe("ringState (next drain)", () => {
  it("no drain ever logged → an empty, neutral ring", () => {
    expect(ringState(CEDAR, [], NOW)).toEqual({
      tone: "none",
      days: null,
      fraction: 0,
      label: "No drain logged yet",
    });
  });

  it("blue with days left, emptying toward the drain", () => {
    const r = ringState(
      tub("c", "C", 90),
      [visit("c", ago(30), { cleaningSteps: ["drained_refilled"] })],
      NOW
    );
    expect(r.tone).toBe("blue");
    expect(r.days).toBe(60);
    expect(r.fraction).toBeCloseTo(60 / 90, 2);
    expect(r.label).toBe("Drain in 60 days");
  });

  it("amber within DUE_SOON_DAYS, red when overdue", () => {
    const soon = ringState(
      tub("c", "C", 90),
      [visit("c", ago(84), { cleaningSteps: ["drained_refilled"] })],
      NOW
    );
    expect(soon).toMatchObject({ tone: "amber", days: 6 });
    const seven = ringState(
      tub("c", "C", 90),
      [visit("c", ago(83), { cleaningSteps: ["drained_refilled"] })],
      NOW
    );
    expect(seven.tone).toBe("amber");
    const eight = ringState(
      tub("c", "C", 90),
      [visit("c", ago(82), { cleaningSteps: ["drained_refilled"] })],
      NOW
    );
    expect(eight.tone).toBe("blue");
    const over = ringState(
      tub("c", "C", 90),
      [visit("c", ago(95), { cleaningSteps: ["drained_refilled"] })],
      NOW
    );
    expect(over).toMatchObject({
      tone: "red",
      fraction: 0,
      label: "Drain 5 days overdue",
    });
  });
});

describe("tubProblem", () => {
  it("a calm tub has none", () => {
    expect(
      tubProblem(
        CEDAR,
        [visit("cedar", ago(2), { found: OK, left: OK })],
        NOW,
        TZ
      )
    ).toBeNull();
  });

  it("the as-left reading wins over as-found; chip names the value", () => {
    const fixed = visit("cedar", ago(2), {
      found: { ...OK, ph: 8.1 },
      left: OK,
    });
    expect(tubProblem(CEDAR, [fixed], NOW, TZ)).toBeNull();
    const p = tubProblem(
      CEDAR,
      [visit("cedar", ago(4), { found: OK, left: { ...OK, ph: 7.9 } })],
      NOW,
      TZ
    );
    expect(p).toMatchObject({
      kind: "reading",
      chip: "pH 7.9",
      chipWithDay: "pH 7.9 Sat",
    });
  });

  it("a reading a week old or more names its date, not a weekday", () => {
    const p = tubProblem(
      CEDAR,
      [visit("cedar", ago(7), { found: { ...OK, ph: 7.9 } })],
      NOW,
      TZ
    );
    expect(p?.chipWithDay).toBe("pH 7.9 Oct 28");
  });

  it("falls back to as-found when nothing was logged as left", () => {
    const p = tubProblem(
      CEDAR,
      [visit("cedar", ago(0), { found: { ...OK, sanitizer_ppm: 0.5 } })],
      NOW,
      TZ
    );
    expect(p).toMatchObject({ chip: "Cl 0.5", chipWithDay: "Cl 0.5" });
  });

  it("owner flag, then drain / filter overdue", () => {
    expect(
      tubProblem(
        CEDAR,
        [visit("cedar", ago(1), { found: OK, ownerFlag: "Cover torn" })],
        NOW,
        TZ
      )?.chip
    ).toBe("Owner flagged");
    expect(
      tubProblem(
        CEDAR,
        [
          visit("cedar", ago(95), {
            found: OK,
            cleaningSteps: ["drained_refilled"],
          }),
        ],
        NOW,
        TZ
      )?.chip
    ).toBe("Drain overdue");
    expect(
      tubProblem(
        CEDAR,
        [
          visit("cedar", ago(65), {
            found: OK,
            cleaningSteps: ["filter_replaced"],
          }),
        ],
        NOW,
        TZ
      )?.chip
    ).toBe("Filter overdue");
  });
});

describe("boardState + boardOrder (worst first)", () => {
  it("problem → open items → care due soon → calm; ties by soonest care, then name", () => {
    const visits = [
      visit("pine", ago(4), { found: OK, left: { ...OK, ph: 7.9 } }),
      visit("cedar", ago(1), {
        found: OK,
        cleaningSteps: ["drained_refilled"],
      }),
      visit("ridge", ago(85), {
        found: OK,
        cleaningSteps: ["drained_refilled"],
      }),
      visit("aspen", ago(1), { found: OK }),
    ];
    const items = [item("cedar"), item("cedar")];
    const states = [ASPEN, CEDAR, PINE, RIDGE].map((t) =>
      boardState(
        t,
        visits.filter((v) => v.tubId === t.id),
        items.filter((i) => i.tubId === t.id),
        NOW,
        TZ
      )
    );
    expect(states.map((s) => s.state)).toEqual([
      "calm",
      "open",
      "problem",
      "due",
    ]);
    expect(boardOrder(states).map((s) => s.tubId)).toEqual([
      "pine",
      "cedar",
      "ridge",
      "aspen",
    ]);
  });

  it("chips: problem red, open amber, due amber, verified balanced green, else muted", () => {
    const s = (t: HomeTub, v: HomeVisit[], i: OpenItem[] = []) =>
      boardState(t, v, i, NOW, TZ).chip;
    expect(
      s(PINE, [visit("pine", ago(1), { found: { ...OK, ph: 7.9 } })])
    ).toEqual({ text: "pH 7.9", tone: "alert" });
    expect(
      s(
        CEDAR,
        [visit("cedar", ago(1), { found: OK })],
        [item("cedar", { kind: "part" })]
      )
    ).toEqual({ text: "Waiting on part", tone: "due" });
    expect(
      s(RIDGE, [
        visit("ridge", ago(85), {
          found: OK,
          cleaningSteps: ["drained_refilled"],
        }),
      ])
    ).toEqual({ text: "Drain in 5d", tone: "due" });
    expect(s(ASPEN, [visit("aspen", ago(1), { found: OK, left: OK })])).toEqual(
      { text: "Balanced", tone: "ok" }
    );
    expect(s(ASPEN, [visit("aspen", ago(1))])).toEqual({
      text: "No reading",
      tone: "muted",
    });
    expect(s(ASPEN, [])).toEqual({ text: "No visits yet", tone: "muted" });
  });

  it("ties within a rank: soonest care first, tubs without care last, then name", () => {
    const visits = [
      visit("cedar", ago(1), { cleaningSteps: ["drained_refilled"] }),
      visit("pine", ago(30), { cleaningSteps: ["drained_refilled"] }),
    ];
    const states = [ASPEN, CEDAR, PINE].map((t) =>
      boardState(
        t,
        visits.filter((v) => v.tubId === t.id),
        [item(t.id)],
        NOW,
        TZ
      )
    );
    expect(boardOrder(states).map((s) => s.tubId)).toEqual([
      "pine",
      "cedar",
      "aspen",
    ]);
  });
});

describe("todaysRoute", () => {
  const base = { tubs: [ASPEN, CEDAR, PINE, RIDGE], now: NOW, tz: TZ };

  it("no visits, nothing due, nothing added → no route", () => {
    expect(todaysRoute({ ...base, visits: [], drafts: [], added: [] })).toEqual(
      []
    );
  });

  it("membership: visited today, draft open, care due/overdue today, hand-added", () => {
    const visits = [
      visit("cedar", new Date("2026-11-04T15:42:00Z"), { found: OK }), // 10:42 today
      visit("ridge", ago(91), {
        found: OK,
        cleaningSteps: ["drained_refilled"],
      }), // overdue
      visit("aspen", ago(3), { found: OK }), // nothing due
    ];
    const route = todaysRoute({
      ...base,
      visits,
      drafts: [draft("pine", ago(0.05))],
      added: ["aspen"],
    });
    expect(route.map((s) => [s.tubId, s.state, s.label])).toEqual([
      ["cedar", "done", "done 10:42 AM"],
      ["pine", "current", "in progress"],
      ["ridge", "todo", "Drain overdue"],
      ["aspen", "todo", "added"],
    ]);
    expect(route.find((s) => s.tubId === "aspen")?.added).toBe(true);
    expect(route.find((s) => s.tubId === "pine")?.draftId).toBe("d-pine");
  });

  it("a visit yesterday doesn't put a tub on today's route", () => {
    const visits = [
      visit("cedar", new Date("2026-11-04T04:00:00Z"), { found: OK }),
    ]; // 11 pm Nov 3
    expect(todaysRoute({ ...base, visits, drafts: [], added: [] })).toEqual([]);
  });

  it("order: done by time → in progress (newest draft current) → problem → overdue → due → added", () => {
    const visits = [
      visit("cedar", new Date("2026-11-04T17:00:00Z")),
      visit("aspen", new Date("2026-11-04T14:00:00Z")),
      // Pine: problem reading, and due today via the visit cadence.
      visit("pine", ago(4), { found: { ...OK, ph: 7.9 } }),
      visit("pine", ago(8)),
      visit("pine", ago(12)),
      visit("ridge", ago(90.2), { cleaningSteps: ["drained_refilled"] }), // overdue
    ];
    const extra = [tub("x", "Xeno"), tub("y", "Yarrow")];
    const route = todaysRoute({
      ...base,
      tubs: [...base.tubs, ...extra],
      visits,
      drafts: [draft("x", ago(0.2)), draft("y", ago(0.01))],
      added: ["pine"],
    });
    expect(route.map((s) => s.tubId)).toEqual([
      "aspen",
      "cedar",
      "y",
      "x",
      "pine",
      "ridge",
    ]);
    expect(route.map((s) => s.state)).toEqual([
      "done",
      "done",
      "current",
      "todo",
      "todo",
      "todo",
    ]);
    expect(route.find((s) => s.tubId === "pine")).toMatchObject({
      problem: true,
      label: "pH 7.9",
    });
  });

  it("no draft: the first not-done stop is current and reads 'up next'", () => {
    const visits = [
      visit("ridge", ago(91), { cleaningSteps: ["drained_refilled"] }),
    ];
    const route = todaysRoute({
      ...base,
      visits,
      drafts: [],
      added: ["aspen"],
    });
    expect(route.map((s) => [s.tubId, s.state, s.label])).toEqual([
      ["ridge", "current", "up next"],
      ["aspen", "todo", "added"],
    ]);
  });
});

describe("focusCard", () => {
  it("Working on when the current stop has a draft", () => {
    const route = todaysRoute({
      tubs: [PINE],
      visits: [],
      drafts: [draft("pine", ago(0.1))],
      added: [],
      now: NOW,
      tz: TZ,
    });
    expect(focusCard(route)).toEqual({
      kind: "working",
      tubId: "pine",
      draftId: "d-pine",
    });
  });
  it("Up next when no draft", () => {
    const route = todaysRoute({
      tubs: [PINE],
      visits: [],
      drafts: [],
      added: ["pine"],
      now: NOW,
      tz: TZ,
    });
    expect(focusCard(route)).toEqual({
      kind: "next",
      tubId: "pine",
      draftId: null,
    });
  });
  it("hidden with no route, or with every stop done", () => {
    expect(focusCard([])).toBeNull();
    const route = todaysRoute({
      tubs: [PINE],
      visits: [visit("pine", ago(0.01))],
      drafts: [],
      added: [],
      now: NOW,
      tz: TZ,
    });
    expect(focusCard(route)).toBeNull();
  });
});

describe("visitProgress", () => {
  it("four steps: Before photo · Readings · Work · After (after + cover)", () => {
    expect(visitProgress(draft("p", NOW))).toEqual({
      done: 0,
      steps: [
        { key: "before", label: "Before", done: false },
        { key: "readings", label: "Readings", done: false },
        { key: "work", label: "Work", done: false },
        { key: "after", label: "After", done: false },
      ],
    });
    const p = visitProgress(
      draft("p", NOW, { photoKinds: ["before", "after"], foundLogged: true })
    );
    expect(p.done).toBe(2);
    expect(p.steps.map((s) => s.done)).toEqual([true, true, false, false]);
    const all = visitProgress(
      draft("p", NOW, {
        photoKinds: ["before", "after", "cover"],
        leftLogged: true,
        workCount: 1,
      })
    );
    expect(all.done).toBe(4);
  });
});

describe("careCountdown", () => {
  it("drain and filter, in words", () => {
    const visits = [
      visit("c", ago(56), { cleaningSteps: ["drained_refilled"] }),
      visit("c", ago(48), { cleaningSteps: ["filter_replaced"] }),
    ];
    expect(careCountdown(tub("c", "C", 90), visits, NOW)).toBe(
      "Drain in 34 days · filter in 12"
    );
    expect(careCountdown(CEDAR, [], NOW)).toBeNull();
    expect(
      careCountdown(
        tub("c", "C", 30),
        [visit("c", ago(31), { cleaningSteps: ["drained_refilled"] })],
        NOW
      )
    ).toBe("Drain 1 day overdue");
  });
});
