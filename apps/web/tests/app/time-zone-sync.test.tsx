// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { TimeZoneSync } from "@/components/app/TimeZone";

function setDeviceZone(tz: string) {
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
    () =>
      ({
        resolvedOptions: () => ({ timeZone: tz }),
      }) as Intl.DateTimeFormat
  );
}

function clearCookie() {
  document.cookie = "tt_tz=; Path=/; Max-Age=0";
}

beforeEach(() => {
  refresh.mockClear();
  clearCookie();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  clearCookie();
});

describe("TimeZoneSync", () => {
  it("stores the device zone and refreshes once when the server drew another zone", () => {
    setDeviceZone("America/Los_Angeles");
    const { rerender } = render(<TimeZoneSync serverTz="America/Detroit" />);
    expect(document.cookie).toContain("tt_tz=America%2FLos_Angeles");
    expect(refresh).toHaveBeenCalledTimes(1);
    // A re-render (e.g. the refreshed tree still saying Detroit) never loops.
    rerender(<TimeZoneSync serverTz="America/Detroit" />);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("sets the cookie but does not refresh when the server already used the device zone", () => {
    setDeviceZone("America/Detroit");
    render(<TimeZoneSync serverTz="America/Detroit" />);
    expect(document.cookie).toContain("tt_tz=America%2FDetroit");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does nothing when the cookie already matches the device", () => {
    document.cookie = "tt_tz=America%2FDenver; Path=/";
    setDeviceZone("America/Denver");
    render(<TimeZoneSync serverTz="America/Denver" />);
    expect(refresh).not.toHaveBeenCalled();
  });
});
