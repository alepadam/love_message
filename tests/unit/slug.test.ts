import { describe, expect, it } from "vitest";
import { generateSlug, isPlausibleSlug } from "../../src/lib/slug";

describe("generateSlug", () => {
  it("produces a 21-character slug", () => {
    expect(generateSlug()).toHaveLength(21);
  });

  it("produces slugs that pass its own plausibility check", () => {
    expect(isPlausibleSlug(generateSlug())).toBe(true);
  });

  it("produces different slugs on repeated calls", () => {
    const slugs = new Set(Array.from({ length: 50 }, () => generateSlug()));
    expect(slugs.size).toBe(50);
  });
});

describe("isPlausibleSlug", () => {
  it("rejects slugs that are too short", () => {
    expect(isPlausibleSlug("abc")).toBe(false);
  });

  it("rejects slugs with invalid characters", () => {
    expect(isPlausibleSlug("has a space here!!")).toBe(false);
  });

  it("accepts a well-formed slug", () => {
    expect(isPlausibleSlug("Ab3_-9xQ7kLmNoPqRs12")).toBe(true);
  });
});
