import { customAlphabet } from "nanoid";

// 125 bits of entropy at length 21 with this 64-character alphabet —
// brute-forcing a slug is computationally infeasible. This is the real
// access control for the app (there is no password); rate limiting in
// lib/ratelimit.ts is a secondary defense for infrastructure cost/abuse,
// not the primary line of defense.
const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

const generate = customAlphabet(alphabet, 21);

export function generateSlug(): string {
  return generate();
}

// Loose shape validation only (used to reject obviously-malformed input
// before it hits the database) — never used as a security boundary.
const SLUG_PATTERN = /^[0-9A-Za-z_-]{10,32}$/;

export function isPlausibleSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
