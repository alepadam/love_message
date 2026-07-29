import { randomInt } from "crypto";

// Node's crypto.randomInt (not Math.random) — this feeds an
// access-granting system, even though the code is short-lived and
// one-time-use. 6 digits, zero-padded (so "042817" stays 6 characters).
export function generatePairingCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

const CODE_PATTERN = /^[0-9]{6}$/;

export function isPlausibleCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}
