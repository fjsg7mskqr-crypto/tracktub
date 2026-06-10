import { describe, it, expect } from "vitest";
import { normalizeEmail } from "@/lib/email";

describe("normalizeEmail", () => {
  it("trims surrounding whitespace and lowercases", () => {
    expect(normalizeEmail("  Owner@Lakeside.CO ")).toBe("owner@lakeside.co");
  });

  it("accepts ordinary addresses", () => {
    expect(normalizeEmail("a@b.co")).toBe("a@b.co");
    expect(normalizeEmail("first.last+tag@host.example.com")).toBe(
      "first.last+tag@host.example.com",
    );
  });

  it("rejects a missing @ or a domain without a dot", () => {
    expect(() => normalizeEmail("nope")).toThrow();
    expect(() => normalizeEmail("a@b")).toThrow();
    expect(() => normalizeEmail("@host.com")).toThrow();
  });

  it("rejects empty, internal whitespace, or over-long input", () => {
    expect(() => normalizeEmail("")).toThrow();
    expect(() => normalizeEmail("a b@host.com")).toThrow();
    expect(() => normalizeEmail(`a@${"x".repeat(400)}.com`)).toThrow();
  });
});
