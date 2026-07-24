import { describe, it, expect } from "vitest";
import { buildTodayCards } from "@/lib/field/today";

describe("buildTodayCards", () => {
  it("marks a property with a draft turnover as resumable", () => {
    const cards = buildTodayCards({
      properties: [{ id: "p1", name: "Pine Chalet" }],
      turnovers: [{ id: "t1", propertyId: "p1", status: "draft", at: "2026-07-20T10:00:00Z" }],
    });
    expect(cards[0].inProgressTurnoverId).toBe("t1");
  });
  it("uses the latest submitted turnover for lastTurnoverAt and no resume", () => {
    const cards = buildTodayCards({
      properties: [{ id: "p1", name: "Pine Chalet" }],
      turnovers: [
        { id: "t1", propertyId: "p1", status: "submitted", at: "2026-07-18T10:00:00Z" },
        { id: "t2", propertyId: "p1", status: "submitted", at: "2026-07-20T10:00:00Z" },
      ],
    });
    expect(cards[0].lastTurnoverAt).toBe("2026-07-20T10:00:00Z");
    expect(cards[0].inProgressTurnoverId).toBeNull();
  });
  it("returns a card per property, sorted by name", () => {
    const cards = buildTodayCards({
      properties: [{ id: "p2", name: "Birch" }, { id: "p1", name: "Aspen" }],
      turnovers: [],
    });
    expect(cards.map((c) => c.propertyName)).toEqual(["Aspen", "Birch"]);
  });
});
