import { describe, expect, it } from "vitest";
import { buildRecord } from "@/components/record/record-model";
import { emptyRow, mockupRow } from "./fixtures";

describe("buildRecord — the mockup visit", () => {
  const r = buildRecord(mockupRow());

  it("heads the record with tub, client, date, operator and span", () => {
    expect(r.tub).toBe("Cedar Cabin");
    expect(r.client).toBe("Lakeview Rentals");
    expect(r.date).toBe("Mon Oct 26, 2026");
    expect(r.operator).toBe("Ethan N.");
    expect(r.span).toBe("9:42 – 10:58 AM");
  });

  it("is locked at the submit time", () => {
    expect(r.locked).toBe(true);
    expect(r.lockedAt).toBe("10:58 AM");
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
    expect(r.photos[0].url).toContain("/storage/v1/object/public/photos/");
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

describe("buildRecord — edge cases", () => {
  it("empty visit renders dashes and lists everything missing", () => {
    const r = buildRecord(emptyRow());
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
      mockupRow({ cleaning_steps: ["drained_refilled", "water_topped"] })
    );
    expect(r.work).toEqual([
      { label: "Drained & refilled", done: true },
      { label: "Topped off", done: true },
    ]);
  });

  it("a draft is not locked", () => {
    const r = buildRecord(mockupRow({ status: "draft" }));
    expect(r.locked).toBe(false);
    expect(r.lockedAt).toBeNull();
    expect(r.span).toBe("9:42 AM – …");
  });

  it("a span across noon shows both periods", () => {
    const r = buildRecord(
      mockupRow({ submitted_at_server: "2026-10-26T17:05:00Z" })
    );
    expect(r.span).toBe("9:42 AM – 1:05 PM");
  });

  it.each([
    [{ full_name: "Ethan Novak", email: "e@x.com" }, "Ethan N."],
    [{ full_name: "Cher", email: "e@x.com" }, "Cher"],
    [{ full_name: null, email: "e@x.com" }, "e@x.com"],
    [null, "—"],
  ])("operator %j → %s", (submitter, expected) => {
    expect(buildRecord(mockupRow({ submitter })).operator).toBe(expected);
  });

  it("missing client and property degrade to null / dash", () => {
    const r = buildRecord(mockupRow({ property: null }));
    expect(r.tub).toBe("—");
    expect(r.client).toBeNull();
  });

  it("a partial reading still counts as logged", () => {
    const water = { ...mockupRow().water!, ph: null, total_alkalinity: null };
    const r = buildRecord(mockupRow({ water }));
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
            created_at: "2026-10-26T13:50:00Z",
          },
          {
            slot: "full_frame",
            phase: "before",
            storage_path: null,
            captured_at: null,
            created_at: "2026-10-26T13:43:00Z",
          },
        ],
      })
    );
    expect(r.photos.map((p) => `${p.label} · ${p.time}`)).toEqual([
      "Issue photo · 9:50 AM",
    ]);
    expect(r.partial).toContain("Before photo");
  });

  it("shows the owner flag when set", () => {
    expect(
      buildRecord(mockupRow({ owner_flag: "Cover strap fraying" })).ownerFlag
    ).toBe("Cover strap fraying");
    expect(buildRecord(mockupRow({ owner_flag: "  " })).ownerFlag).toBeNull();
  });
});
