import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(__dirname, "..", "..", "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

// /t/[id] was replaced by /records/[id] (operator) and /visits/[id] (draft).
describe("retired /t/[id]", () => {
  it("has no route", () => {
    expect(existsSync(join(SRC, "app", "t"))).toBe(false);
  });

  it("nothing links to /t/", () => {
    const linking = files(SRC).filter((f) =>
      /["'`]\/t\/|`\/t\/\$\{/.test(readFileSync(f, "utf8"))
    );
    expect(linking).toEqual([]);
  });
});
