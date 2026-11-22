import { NextRequest } from "next/server";

/**
 * In-memory sliding-window / fixed-window rate limiter with TTL expiration.
 *
 * NOTE FOR PRODUCTION:
 * In multi-instance, serverless, or edge environments, memory is not shared between processes.
 * Production deployments should replace this in-memory Map with a distributed key-value store
 * such as Upstash Redis (@upstash/ratelimit) or Cloudflare Rate Limiting.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean up expired entries to avoid memory leaks
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  rateLimitStore.forEach((record, key) => {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  });
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number; // in seconds
  resetAt: number;
}

/**
 * Checks and increments the rate limit count for a given identifier key.
 *
 * @param key Unique identifier (e.g. `login:192.168.1.1:user@example.com`)
 * @param limit Maximum allowed requests within the window
 * @param windowMs Time window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      retryAfter: 0,
      resetAt: now + windowMs,
    };
  }

  if (record.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfter,
      resetAt: record.resetAt,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - record.count),
    retryAfter: 0,
    resetAt: record.resetAt,
  };
}

/**
 * Extracts the real client IP address safely from standard proxy headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();
  return "127.0.0.1";
}
