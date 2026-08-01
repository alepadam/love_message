import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN — see
// .env.example. Free tier on Upstash is enough for this app's traffic.
//
// These limiters are a defense against infrastructure cost and abuse
// (spam-overwriting a message, storage bloat from repeated uploads),
// not the app's primary access control — that's the slug's entropy
// (see lib/slug.ts). Both matter, but don't conflate them.
const redis = Redis.fromEnv();

// GET /api/space/[slug] — the Message tab polls this every ~8 seconds
// while open, so this needs real headroom: ~7-8 requests/minute just
// from one tab being open, times two people, potentially sharing one
// IP if they're on the same network/NAT. 60/min comfortably covers
// that plus normal tab-switching, while still making scripted
// slug-brute-forcing impractically slow.
export const spaceLookupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "ratelimit:lookup-space",
});

// GET /api/profiles/[slug] — only fetched on navigating to Account,
// not polled continuously, so a smaller budget is fine. Kept as its
// own limiter (not shared with space lookups) so browsing Account
// doesn't eat into the Message tab's polling budget, or vice versa.
export const profileLookupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:lookup-profile",
});

// GET /api/journal/[slug] — same reasoning as profiles: fetched on
// navigation, not polled, own independent budget.
export const journalLookupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:lookup-journal",
});

// POST /api/messages — guards against spam-overwriting a space's message.
export const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:write",
});

// POST /api/upload — guards against storage/bandwidth cost abuse.
export const uploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:upload",
});

// POST /api/pairing-code/redeem — the code is only 6 digits (1,000,000
// possibilities), so unlike the other limiters above, this one IS a
// meaningful part of the defense, not just a cost guard. Combined with
// the code's ~10 minute expiry and one-time use, this bounds how many
// guesses a single IP can make against a live code. It doesn't fully
// close the door against a distributed attacker spraying guesses from
// many IPs — that residual risk is accepted here because the code is
// only ever a temporary hand-off to the real secret (the slug), never
// the permanent access control itself.
export const pairingRedeemLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "5 m"),
  prefix: "ratelimit:pairing-redeem",
});

// Best-effort client identifier. Behind Vercel this header is reliably
// set; falls back to a constant bucket (fail open, shared limit) if
// ever missing rather than throwing.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return "unknown";
}
