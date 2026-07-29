import { describe, expect, it } from "vitest";
import { generatePairingCode, isPlausibleCode } from "../../src/lib/pairing-code";

describe("generatePairingCode", () => {
  it("produces a 6-character numeric code", () => {
    const code = generatePairingCode();
    expect(code).toHaveLength(6);
    expect(/^[0-9]{6}$/.test(code)).toBe(true);
  });

  it("zero-pads codes below 100000", () => {
    // Run enough times that a small code is very likely to appear.
    const codes = Array.from({ length: 200 }, () => generatePairingCode());
    expect(codes.every((code) => code.length === 6)).toBe(true);
  });

  it("produces its own valid codes", () => {
    expect(isPlausibleCode(generatePairingCode())).toBe(true);
  });
});

describe("isPlausibleCode", () => {
  it("rejects codes that are too short or too long", () => {
    expect(isPlausibleCode("12345")).toBe(false);
    expect(isPlausibleCode("1234567")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(isPlausibleCode("12a456")).toBe(false);
    expect(isPlausibleCode("      ")).toBe(false);
  });

  it("accepts a well-formed 6-digit code", () => {
    expect(isPlausibleCode("042817")).toBe(true);
  });
});
