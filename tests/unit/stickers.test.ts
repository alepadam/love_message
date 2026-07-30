import { describe, expect, it } from "vitest";
import { isValidSticker, isValidCoordinate, STICKER_PALETTE } from "../../src/lib/stickers";

describe("isValidSticker", () => {
  it("accepts every sticker in the palette", () => {
    for (const sticker of STICKER_PALETTE) {
      expect(isValidSticker(sticker)).toBe(true);
    }
  });

  it("rejects arbitrary text", () => {
    expect(isValidSticker("hello")).toBe(false);
    expect(isValidSticker("🦄")).toBe(false); // not in the curated palette
  });

  it("rejects non-string input", () => {
    expect(isValidSticker(42)).toBe(false);
    expect(isValidSticker(null)).toBe(false);
    expect(isValidSticker(undefined)).toBe(false);
  });
});

describe("isValidCoordinate", () => {
  it("accepts values within 0-100", () => {
    expect(isValidCoordinate(0)).toBe(true);
    expect(isValidCoordinate(50.5)).toBe(true);
    expect(isValidCoordinate(100)).toBe(true);
  });

  it("rejects values outside 0-100", () => {
    expect(isValidCoordinate(-1)).toBe(false);
    expect(isValidCoordinate(100.1)).toBe(false);
  });

  it("rejects non-finite or non-number input", () => {
    expect(isValidCoordinate(NaN)).toBe(false);
    expect(isValidCoordinate(Infinity)).toBe(false);
    expect(isValidCoordinate("50")).toBe(false);
    expect(isValidCoordinate(null)).toBe(false);
  });
});
