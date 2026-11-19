// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Landing, { dynamic, metadata } from "@/app/landing/page";
import { FAQS } from "@/app/landing/content";

afterEach(cleanup);

describe("/landing (Round 6)", () => {
  it("stays dynamic under the nonce CSP (#281)", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("has the SEO title and a description built from the hero line", () => {
    expect(metadata.title).toBe(
      "Hot tub visit reports for property managers and techs | TrackTub"
    );
    expect(String(metadata.description)).toMatch(/^Photos and a water test/);
    expect(String(metadata.description)).toMatch(/property managers/);
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
  });

  it("renders the headlines with no trailing periods", () => {
    render(<Landing />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toBe("Show the tub was ready");
    for (const name of [
      "Checkout to check-in",
      "One step at a time",
      "One link. The whole visit",
      "Questions from pros",
      "Show your work",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeTruthy();
    }
  });

  it("puts the anonymous trust line near the hero and drops the old claims", () => {
    const { container } = render(<Landing />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/Built by a working hot tub tech/);
    // trust line sits before the first section after the hero
    expect(text.indexOf("Built by a working hot tub tech")).toBeLessThan(
      text.indexOf("Guests check out")
    );
    expect(text).not.toMatch(/camera roll/i);
    expect(text).not.toMatch(/Do I need to know water chemistry/);
    expect(text).not.toMatch(/Read receipts/);
    expect(text).not.toMatch(/Questions hosts ask/);
    expect(text).not.toMatch(/\bprove|proof of\b/i);
    const faqText = FAQS.map((f) => f.q + f.a).join(" ");
    expect(faqText).not.toMatch(/camera roll/i);
    expect(faqText).not.toMatch(/No\. The app opens/);
    expect(text).toMatch(/not the photo library/);
    expect(text).toMatch(/See when a report link is opened/);
    expect(text).toMatch(/What to add is your call/);
  });

  it("renders the waitlist form", () => {
    render(<Landing />);
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    expect(email.type).toBe("email");
    expect(email.required).toBe(true);
    expect(
      screen.getAllByRole("button", { name: "Get early access" }).length
    ).toBe(1);
    const role = screen.getByLabelText(/I’m a/) as HTMLSelectElement;
    expect(role.required).toBe(false);
    expect(Array.from(role.options).map((o) => o.value)).toEqual([
      "",
      "property_manager",
      "hot_tub_tech",
      "host_owner",
      "other",
    ]);
    const tubs = screen.getByLabelText(/How many tubs/) as HTMLInputElement;
    expect(tubs.required).toBe(false);
    expect(tubs.type).toBe("number");
  });

  it("links the footer destinations", () => {
    render(<Landing />);
    const footer = screen.getByRole("navigation", { name: "Footer" });
    const hrefs = Array.from(footer.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toEqual([
      "/guides",
      "https://x.com/tracktub",
      "/privacy",
      "mailto:tracktubapp@gmail.com",
    ]);
  });

  it("makes the phones row keyboard-focusable and emits FAQ JSON-LD", () => {
    const { container } = render(<Landing />);
    const row = screen.getByRole("region", {
      name: "App screens, scroll sideways",
    });
    expect(row.getAttribute("tabindex")).toBe("0");
    const ld = Array.from(
      container.querySelectorAll('script[type="application/ld+json"]')
    ).map((s) => JSON.parse(s.textContent ?? ""));
    expect(ld.map((d) => d["@type"])).toEqual([
      "SoftwareApplication",
      "FAQPage",
    ]);
  });

  it("FAQ: first item open, toggles one at a time", () => {
    render(<Landing />);
    const buttons = FAQS.map((f) =>
      screen.getByRole("button", { name: new RegExp(f.q.replace("?", "\\?")) })
    );
    expect(buttons[0].getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(FAQS[0].a).hasAttribute("hidden")).toBe(false);
    expect(screen.getByText(FAQS[1].a).hasAttribute("hidden")).toBe(true);

    fireEvent.click(buttons[1]);
    expect(buttons[1].getAttribute("aria-expanded")).toBe("true");
    expect(buttons[0].getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText(FAQS[1].a).hasAttribute("hidden")).toBe(false);

    fireEvent.click(buttons[1]);
    expect(buttons[1].getAttribute("aria-expanded")).toBe("false");
  });

  it("submits the waitlist form to /landing/waitlist", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ status: "ok" }, { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<Landing />);
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "host@example.com" },
    });
    fireEvent.submit(screen.getByLabelText("Email").closest("form")!);
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/landing/waitlist",
      expect.objectContaining({ method: "POST" })
    );
    vi.unstubAllGlobals();
  });
});
