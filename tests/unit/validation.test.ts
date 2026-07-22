import { describe, expect, it } from "vitest";
import {
  validateMessageContent,
  validateDirection,
  validateAttachment,
  MAX_MESSAGE_LENGTH,
} from "../../src/lib/validation";

describe("validateMessageContent", () => {
  it("rejects empty content", () => {
    expect(validateMessageContent("   ").ok).toBe(false);
  });

  it("rejects non-string content", () => {
    expect(validateMessageContent(42).ok).toBe(false);
  });

  it("accepts normal content", () => {
    expect(validateMessageContent("hello").ok).toBe(true);
  });

  it("rejects content over the max length", () => {
    const tooLong = "a".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(validateMessageContent(tooLong).ok).toBe(false);
  });

  it("accepts content at exactly the max length", () => {
    const exact = "a".repeat(MAX_MESSAGE_LENGTH);
    expect(validateMessageContent(exact).ok).toBe(true);
  });
});

describe("validateDirection", () => {
  it("accepts a_to_b and b_to_a", () => {
    expect(validateDirection("a_to_b").ok).toBe(true);
    expect(validateDirection("b_to_a").ok).toBe(true);
  });

  it("rejects anything else", () => {
    expect(validateDirection("sideways").ok).toBe(false);
    expect(validateDirection(undefined).ok).toBe(false);
  });
});

function makeFile(type: string, sizeBytes: number): File {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], "test-file", { type });
}

describe("validateAttachment", () => {
  it("rejects disallowed mime types", () => {
    const file = makeFile("application/zip", 1000);
    expect(validateAttachment(file).ok).toBe(false);
  });

  it("accepts a small jpeg", () => {
    const file = makeFile("image/jpeg", 1000);
    expect(validateAttachment(file).ok).toBe(true);
  });

  it("rejects an oversized image", () => {
    const file = makeFile("image/png", 6 * 1024 * 1024);
    expect(validateAttachment(file).ok).toBe(false);
  });

  it("allows a PDF up to 10MB but not beyond", () => {
    const okFile = makeFile("application/pdf", 9 * 1024 * 1024);
    const tooBig = makeFile("application/pdf", 11 * 1024 * 1024);
    expect(validateAttachment(okFile).ok).toBe(true);
    expect(validateAttachment(tooBig).ok).toBe(false);
  });
});
