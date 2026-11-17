// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import PrivacyPage from "@/app/privacy/page";
import { dynamic } from "@/app/privacy/layout";
import { GuidesFrame } from "@/components/marketing/GuidesFrame";
import sitemap from "@/app/sitemap";
import { PRIVACY_OPERATOR } from "@/lib/privacy";
import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";

afterEach(cleanup);

describe("/privacy", () => {
  it("renders the operator line and a Privacy heading with no personal name", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" })
    ).toBeTruthy();
    expect(screen.getByText(PRIVACY_OPERATOR, { exact: false })).toBeTruthy();
    expect(PRIVACY_OPERATOR).toBe(
      "TrackTub is operated by TrackTub, a sole proprietorship."
    );
    expect(document.body.textContent).not.toMatch(/\[LEGAL ENTITY NAME\]/);
    expect(document.body.textContent).not.toMatch(/when the browser can/i);
  });

  it("renders dynamically (nonce CSP)", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("is in the sitemap; /terms is not", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.endsWith("/privacy"))).toBe(true);
    expect(urls.some((u) => u.includes("/terms"))).toBe(false);
  });

  it("is linked from the guides footer", () => {
    render(
      <GuidesFrame>
        <p>x</p>
      </GuidesFrame>
    );
    const footer = screen.getByRole("navigation", { name: "Footer" });
    expect(footer.querySelector('a[href="/privacy"]')).not.toBeNull();
  });

  it("is reachable signed-out in production without the admin gate", async () => {
    const res = await updateSession(
      new NextRequest("https://tracktub.com/privacy")
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("/terms is held", () => {
  it("is not linked from any source file and has no route", () => {
    const root = join(__dirname, "..", "src");
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (/\.(tsx?|mdx?)$/.test(e.name)) {
          if (/["'`]\/terms["'`/]/.test(readFileSync(full, "utf8")))
            hits.push(full);
        }
      }
    };
    walk(root);
    expect(hits).toEqual([]);
    expect(() => readdirSync(join(root, "app", "terms"))).toThrow();
  });
});
