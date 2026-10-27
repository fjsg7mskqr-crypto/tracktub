import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The signed-in app's design tokens (spec "Visual system"). Lanes 2–5 build
 * against these names, so the values are pinned here verbatim.
 */

const CSS_PATH = join(__dirname, "..", "src", "app", "app-tokens.css");

const TOKENS: Record<string, string> = {
  "--tt-bg": "#08090A",
  "--tt-surface": "#131417",
  "--tt-raised": "#191B20",
  "--tt-text": "#EDEDEF",
  "--tt-text-2": "#A1A6AF",
  "--tt-text-3": "#8A8F98",
  "--tt-action": "#2563EB",
  "--tt-brand": "#3B82F6",
  "--tt-link": "#7FB0FF",
  "--tt-due": "#E8A33D",
  "--tt-due-text": "#F2B85C",
  "--tt-ok": "#34D399",
  "--tt-radius-card": "24px",
  "--tt-radius-tile": "20px",
  "--tt-tap": "44px",
};

describe("app tokens", () => {
  const css = readFileSync(CSS_PATH, "utf8").toLowerCase();

  it("defines the .tt-app scope with Archivo", () => {
    expect(css).toMatch(/\.tt-app\s*\{/);
    expect(css).toContain(
      "font-family: var(--font-archivo), system-ui, sans-serif"
    );
  });

  for (const [name, value] of Object.entries(TOKENS)) {
    it(`${name} is ${value}`, () => {
      expect(css).toContain(`${name}: ${value}`.toLowerCase() + ";");
    });
  }
});
