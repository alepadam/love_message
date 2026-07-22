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

// GET /api/space/[slug] — guards against slug brute-forcing scripts.
export const lookupLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "ratelimit:lookup",
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
