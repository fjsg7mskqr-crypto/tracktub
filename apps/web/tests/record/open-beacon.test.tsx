// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OpenBeacon } from "@/components/record/OpenBeacon";

const fetchMock = vi.fn(() => Promise.resolve(new Response(null)));
function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
}

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  setVisibility("visible");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<OpenBeacon>", () => {
  it("posts once, same-origin, with keepalive, when visible", () => {
    const { rerender } = render(<OpenBeacon token="abcdefghijklmnop" />);
    rerender(<OpenBeacon token="abcdefghijklmnop" />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/proof/abcdefghijklmnop/open",
      expect.objectContaining({ method: "POST", keepalive: true })
    );
  });

  it("waits while hidden, fires once when it becomes visible", () => {
    setVisibility("hidden");
    render(<OpenBeacon token="abcdefghijklmnop" />);
    expect(fetchMock).not.toHaveBeenCalled();
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never throws when fetch fails", () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("net")));
    expect(() => render(<OpenBeacon token="abcdefghijklmnop" />)).not.toThrow();
  });

  it("is nonce-safe: no inline script, runs only from the bundled client", () => {
    const src = readFileSync(
      join(__dirname, "../../src/components/record/OpenBeacon.tsx"),
      "utf8"
    );
    expect(src).not.toMatch(/dangerouslySetInnerHTML|<script/);
    const { container } = render(<OpenBeacon token="abcdefghijklmnop" />);
    expect(container.innerHTML).toBe("");
  });
});
