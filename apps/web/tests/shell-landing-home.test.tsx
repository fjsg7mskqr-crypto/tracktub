// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/components/app/AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}));

import { Shell } from "@/components/Shell";

afterEach(cleanup);

describe("Shell at / (#425)", () => {
  it("renders the landing page without app chrome when / is the landing page", () => {
    render(
      <Shell landingHome tz="America/Detroit">
        <p>landing</p>
      </Shell>
    );
    expect(screen.queryByTestId("app-shell")).toBeNull();
    expect(screen.getByText("landing")).toBeTruthy();
  });

  it("keeps the app shell at / for a signed-in user", () => {
    render(
      <Shell tz="America/Detroit">
        <p>home</p>
      </Shell>
    );
    expect(screen.getByTestId("app-shell")).toBeTruthy();
  });
});
