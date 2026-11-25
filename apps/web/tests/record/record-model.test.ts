import { describe, expect, it } from "vitest";
import { buildRecord, receivedLabel } from "@/components/record/record-model";
import { emptyRow, mockupRow } from "./fixtures";

const TZ = "America/Detroit";

describe("buildRecord — the mockup visit", () => {
  const r = buildRecord(mockupRow(), TZ);

  it("heads the record with tub, client, date, operator and span", () => {
    expect(r.tub).toBe("Cedar Cabin");
    expect(r.client).toBe("Lakeview Rentals");
    expect(r.date).toBe("Mon Oct 26, 2026");
    expect(r.operator).toBe("Ethan N.");
    expect(r.span).toBe("9:42 – 10:58 AM");
  });

  it("is locked at the lock time, not the visit start", () => {
    expect(r.locked).toBe(true);
    expect(r.lockedAt).toBe("10:58 AM");
    const started = buildRecord(
      mockupRow({ submitted_at_server: "2026-10-26T13:42:00Z" }),
      TZ
    );
    expect(started.lockedAt).toBe("10:58 AM");
  });

  it("photos within 5 minutes of receipt show only the phone time", () => {
    expect(r.photos.map((p) => p.received)).toEqual([null, null, null]);
  });

  it("builds the water table in reading order", () => {
    expect(r.water.foundAt).toBe("9:45 AM");
    expect(r.water.leftAt).toBe("10:52 AM");
    expect(r.water.any).toBe(true);
    expect(r.water.lines.map((l) => l.label)).toEqual([
      "Alk",
      "pH",
      "Hard",
      "Cl",
    ]);
    expect(r.water.lines[1]).toEqual({
      field: "ph",
      label: "pH",
      found: "8.0",
      left: "7.5",
      target: "7.2–7.8",
      foundInRange: false,
      leftInRange: true,
    });
    expect(r.water.lines[3].found).toBe("0.5");
    expect(r.water.lines[0].target).toBe("80–120");
  });

  it("orders photos before → after → cover, with capture times", () => {
    expect(r.photos.map((p) => `${p.label} · ${p.time}`)).toEqual([
      "Before · 9:43 AM",
      "After · 10:54 AM",
      "Cover on · 10:56 AM",
    ]);
  });

  it("photo urls come from the signed-url map; unsigned ones are null", () => {
    expect(r.photos.map((p) => p.url)).toEqual([null, null, null]);
    const row = mockupRow();
    const signed = buildRecord(
      row,
      TZ,
      new Map([
        ["org/t/before.jpg", "https://x.test/sign/before.jpg?token=a"],
        ["org/t/cover.jpg", null],
      ])
    );
    expect(signed.photos.map((p) => p.url)).toEqual([
      "https://x.test/sign/before.jpg?token=a",
      null,
      null,
    ]);
  });

  it("lists work done, then the not-drained line", () => {
    expect(r.work).toEqual([
      { label: "Cleaned filter", done: true },
      { label: "Wiped down", done: true },
      { label: "Not drained", done: false },
    ]);
  });

  it("lists what was added", () => {
    expect(r.added).toEqual(["pH Down", "pH down · 2 oz", "Chlorine · 1.5 oz"]);
  });

  it("formats the record id and is complete", () => {
    expect(r.recordId).toMatch(/^TT-[0-9A-F]{8}$/);
    expect(r.recordId).toBe("TT-3F9A2C1E");
    expect(r.partial).toEqual([]);
    expect(r.shareToken).toBe("7Kq2tok");
  });
});

describe("buildRecord — time zone", () => {
  it("prints times in the zone the visit happened in, with its label", () => {
    const r = buildRecord(mockupRow({ time_zone: "America/Los_Angeles" }), TZ);
    expect(r.span).toBe("6:42 – 7:58 AM");
    expect(r.zoneLabel).toBe("PDT");
    expect(r.lockedAt).toBe("7:58 AM");
    expect(r.date).toBe("Mon Oct 26, 2026");
  });

  it("the visit's zone beats the viewer's", () => {
    const r = buildRecord(
      mockupRow({ time_zone: "America/Detroit" }),
      "America/Los_Angeles"
    );
    expect(r.span).toBe("9:42 – 10:58 AM");
    expect(r.zoneLabel).toBe("EDT");
  });

  it("falls back to the caller's zone when the visit has none", () => {
    expect(buildRecord(mockupRow(), "America/Denver").zoneLabel).toBe("MDT");
    expect(buildRecord(mockupRow({ time_zone: null }), TZ).zoneLabel).toBe(
      "EDT"
    );
  });

  it("ignores a stored zone that isn't a real one", () => {
    const r = buildRecord(mockupRow({ time_zone: "Mars/Olympus" }), TZ);
    expect(r.zoneLabel).toBe("EDT");
    expect(r.span).toBe("9:42 – 10:58 AM");
  });

  it("uses EST in winter", () => {
    const r = buildRecord(
      mockupRow({
        created_at: "2026-12-14T15:00:00Z",
        locked_at: "2026-12-14T16:10:00Z",
        time_zone: "America/Detroit",
      }),
      TZ
    );
    expect(r.zoneLabel).toBe("EST");
  });
});

describe("buildRecord — edge cases", () => {
  it("empty visit renders dashes and lists everything missing", () => {
    const r = buildRecord(emptyRow(), TZ);
    expect(r.water.any).toBe(false);
    expect(r.water.foundAt).toBeNull();
    for (const l of r.water.lines) {
      expect(l.found).toBe("—");
      expect(l.left).toBe("—");
      expect(l.leftInRange).toBeNull();
    }
    expect(r.photos).toEqual([]);
    expect(r.added).toEqual([]);
    expect(r.work).toEqual([{ label: "Not drained", done: false }]);
    expect(r.partial).toEqual([
      "Reading as found",
      "Reading as left",
      "Before photo",
      "After photo",
      "Cover photo",
    ]);
    expect(JSON.stringify(r)).not.toMatch(/Invalid|NaN|undefined/);
  });

  it("a drained visit has no not-drained line", () => {
    const r = buildRecord(
      mockupRow({ cleaning_steps: ["drained_refilled", "water_topped"] }),
      TZ
    );
    expect(r.work).toEqual([
      { label: "Drained & refilled", done: true },
      { label: "Topped off", done: true },
    ]);
  });

  it("a draft is not locked", () => {
    const r = buildRecord(mockupRow({ status: "draft" }), TZ);
    expect(r.locked).toBe(false);
    expect(r.lockedAt).toBeNull();
    expect(r.span).toBe("9:42 AM – …");
  });

  it("a span across noon shows both periods", () => {
    const r = buildRecord(mockupRow({ locked_at: "2026-10-26T17:05:00Z" }), TZ);
    expect(r.span).toBe("9:42 AM – 1:05 PM");
  });

  it.each([
    [{ full_name: "Ethan Novak", email: "e@x.com" }, "Ethan N."],
    [{ full_name: "Cher", email: "e@x.com" }, "Cher"],
    [{ full_name: null, email: "e@x.com" }, "e@x.com"],
    [null, "—"],
  ])("operator %j → %s", (submitter, expected) => {
    expect(buildRecord(mockupRow({ submitter }), TZ).operator).toBe(expected);
  });

  it("missing client and property degrade to null / dash", () => {
    const r = buildRecord(mockupRow({ property: null }), TZ);
    expect(r.tub).toBe("—");
    expect(r.client).toBeNull();
  });

  it("a partial reading still counts as logged", () => {
    const water = { ...mockupRow().water!, ph: null, total_alkalinity: null };
    const r = buildRecord(mockupRow({ water }), TZ);
    expect(r.partial).toEqual([]);
    expect(r.water.lines[1].found).toBe("—");
  });

  it("skips photos without a stored file and falls back to receipt time", () => {
    const r = buildRecord(
      mockupRow({
        photos: [
          {
            slot: "issue",
            phase: "before",
            storage_path: "org/t/issue.jpg",
            captured_at: null,
            received_at: "2026-10-26T13:50:00Z",
            created_at: "2026-10-26T13:40:00Z",
          },
          {
            slot: "full_frame",
            phase: "before",
            storage_path: null,
            captured_at: null,
            received_at: "2026-10-26T13:43:00Z",
            created_at: "2026-10-26T13:43:00Z",
          },
        ],
      }),
      TZ
    );
    expect(r.photos.map((p) => `${p.label} · ${p.time}`)).toEqual([
      "Issue photo · 9:50 AM",
    ]);
    expect(r.partial).toContain("Before photo");
  });

  it("shows the owner flag when set", () => {
    expect(
      buildRecord(mockupRow({ owner_flag: "Cover strap fraying" }), TZ)
        .ownerFlag
    ).toBe("Cover strap fraying");
    expect(
      buildRecord(mockupRow({ owner_flag: "  " }), TZ).ownerFlag
    ).toBeNull();
  });
});

describe("receivedLabel — when to show the server receive time", () => {
  const phone = "2026-10-26T14:00:00Z";

  it.each([
    ["same instant", "2026-10-26T14:00:00Z"],
    ["4 minutes later", "2026-10-26T14:04:00Z"],
    ["exactly 5 minutes later", "2026-10-26T14:05:00Z"],
    ["5 minutes earlier", "2026-10-26T13:55:00Z"],
  ])("hidden when %s", (_, received) => {
    expect(receivedLabel(phone, received, TZ)).toBeNull();
  });

  it("shown past 5 minutes either way", () => {
    expect(receivedLabel(phone, "2026-10-26T14:05:01Z", TZ)).toBe("10:05 AM");
    expect(receivedLabel(phone, "2026-10-26T13:30:00Z", TZ)).toBe("9:30 AM");
  });

  it("adds the date when the receive day differs", () => {
    expect(receivedLabel(phone, "2026-10-27T15:10:00Z", TZ)).toBe(
      "Oct 27, 11:10 AM"
    );
  });

  it("hidden without a phone time (the photo already shows server time)", () => {
    expect(receivedLabel(null, "2026-10-26T14:30:00Z", TZ)).toBeNull();
  });

  it("flows into the record's photos", () => {
    const row = mockupRow();
    row.photos[0] = { ...row.photos[0], received_at: "2026-10-26T15:30:00Z" };
    const cover = buildRecord(row, TZ).photos.find(
      (p) => p.label === "Cover on"
    );
    expect(cover?.received).toBe("11:30 AM");
  });
});
