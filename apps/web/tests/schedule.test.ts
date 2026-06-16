import { describe, it, expect } from "vitest";
import {
  mergeScheduledWithMaintenance,
  type PersistedItem,
  type ComputedMaintenance,
} from "@/lib/schedule";

describe("mergeScheduledWithMaintenance", () => {
  const persisted: PersistedItem[] = [
    { id: "p1", kind: "custom", scheduledFor: "2026-06-20", maintenanceTaskId: null },
    { id: "p2", kind: "maintenance", scheduledFor: "2026-06-22", maintenanceTaskId: "t1" },
  ];

  it("includes all persisted items as-is", () => {
    const out = mergeScheduledWithMaintenance(persisted, []);
    expect(out.map((i) => i.id)).toEqual(["p1", "p2"]);
  });

  it("adds a computed maintenance occurrence as a virtual item", () => {
    const computed: ComputedMaintenance[] = [
      { maintenanceTaskId: "t2", title: "Filter clean", dueDate: "2026-06-25" },
    ];
    const out = mergeScheduledWithMaintenance([], computed);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      virtual: true,
      kind: "maintenance",
      scheduledFor: "2026-06-25",
      maintenanceTaskId: "t2",
      title: "Filter clean",
    });
    expect(out[0].id).toBeNull();
  });

  it("suppresses a computed occurrence already covered by a persisted row", () => {
    const computed: ComputedMaintenance[] = [
      { maintenanceTaskId: "t1", title: "Cover check", dueDate: "2026-06-22" }, // same task+date as p2
      { maintenanceTaskId: "t1", title: "Cover check", dueDate: "2026-07-22" }, // different date → kept
    ];
    const out = mergeScheduledWithMaintenance(persisted, computed);
    const virtual = out.filter((i) => i.virtual);
    expect(virtual).toHaveLength(1);
    expect(virtual[0].scheduledFor).toBe("2026-07-22");
  });

  it("a null-task persisted row suppresses nothing", () => {
    const p: PersistedItem[] = [
      { id: "p1", kind: "custom", scheduledFor: "2026-06-25", maintenanceTaskId: null },
    ];
    const computed: ComputedMaintenance[] = [
      { maintenanceTaskId: "t9", title: "x", dueDate: "2026-06-25" },
    ];
    const out = mergeScheduledWithMaintenance(p, computed);
    expect(out.filter((i) => i.virtual)).toHaveLength(1);
  });
});
