// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextRequest } from "next/server";

// Dev-only demo login (phone testing): one "Sign in to demo" button that signs
// in as the demo host. Production keeps Google only, and the route 404s.

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

async function get(url: string, host?: string) {
  vi.resetModules();
  const signInWithPassword = vi.fn(async () => ({ error: null }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => ({ auth: { signInWithPassword } }),
  }));
  const { GET } = await import("@/app/dev/login/route");
  const res = await GET(
    new NextRequest(url, { headers: host ? { host } : undefined })
  );
  return { res, signInWithPassword };
}

describe("/dev/login", () => {
  it("404s in production without signing in", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEMO_PASSWORD", "pw");
    const { res, signInWithPassword } = await get(
      "http://localhost:3001/dev/login"
    );
    expect(res.status).toBe(404);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in as the demo host — even when asked for the cleaner", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_PASSWORD", "pw");
    for (const url of [
      "http://localhost:3001/dev/login",
      "http://localhost:3001/dev/login?as=cleaner",
    ]) {
      const { signInWithPassword } = await get(url);
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "demo-host@tracktub.test",
        password: "pw",
      });
    }
  });

  it("redirects home on the LAN host the phone used", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEMO_PASSWORD", "pw");
    const { res } = await get(
      "http://localhost:3001/dev/login",
      "192.168.1.20:3001"
    );
    expect(res.headers.get("location")).toBe("http://192.168.1.20:3001/");
  });
});

describe("/login demo button", () => {
  async function renderLogin() {
    vi.resetModules();
    const { default: LoginPage } = await import("@/app/login/page");
    render(<LoginPage />);
  }

  it("dev: one 'Sign in to demo' button to /dev/login", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await renderLogin();
    expect(
      screen.getByRole("link", { name: "Sign in to demo" }).getAttribute("href")
    ).toBe("/dev/login");
    expect(screen.queryByText(/Sign in as/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toBeTruthy();
  });

  it("production: Google only", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await renderLogin();
    expect(screen.queryByRole("link")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Continue with Google" })
    ).toBeTruthy();
  });
});
