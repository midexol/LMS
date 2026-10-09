import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for the single-instance fallback limiter
// Automatically prunes expired entries to prevent memory leaks
const rateLimitStore = new Map<string, RateLimitEntry>();

// Garbage collection interval: runs every 5 minutes
const GC_INTERVAL_MS = 5 * 60 * 1000;
let lastGcTime = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastGcTime < GC_INTERVAL_MS) return;
  lastGcTime = now;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitOptions {
  limit: number;      // Maximum allowed requests within the window
  windowMs: number;   // Window duration in milliseconds
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * In-memory fixed-window counter. Only accurate within a single server instance,
 * so it is used for local development and as a fallback when Redis is unavailable.
 */
function checkRateLimitInMemory(identifier: string, options: RateLimitOptions): RateLimitResult {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New or expired window
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetInSeconds: Math.ceil(options.windowMs / 1000),
    };
  }

  // Active window
  const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetInSeconds,
    };
  }

  entry.count += 1;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - entry.count,
    resetInSeconds,
  };
}

/**
 * Shared fixed-window counter in Upstash Redis (REST API), so limits hold across
 * all serverless instances. INCR + PEXPIRE NX run in one pipeline round trip.
 */
async function checkRateLimitRedis(
  identifier: string,
  options: RateLimitOptions,
  redisUrl: string,
  redisToken: string
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`;
  const res = await fetch(`${redisUrl.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(options.windowMs), "NX"],
      ["PTTL", key],
    ]),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstash responded with ${res.status}`);
  }

  const [incr, , pttl] = (await res.json()) as Array<{ result?: number; error?: string }>;
  if (incr?.error || typeof incr?.result !== "number") {
    throw new Error(`Upstash INCR failed: ${incr?.error ?? "no result"}`);
  }

  const count = incr.result;
  const ttlMs = typeof pttl?.result === "number" && pttl.result > 0 ? pttl.result : options.windowMs;

  return {
    success: count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - count),
    resetInSeconds: Math.ceil(ttlMs / 1000),
  };
}

/**
 * Checks and increments rate limit for a specific identifier (IP, user ID, email, etc.)
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are set, otherwise in-memory.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60 * 1000 }
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      return await checkRateLimitRedis(identifier, options, redisUrl, redisToken);
    } catch (err) {
      // Degrade to per-instance limiting rather than blocking all traffic
      console.error("[RATE LIMIT] Redis unavailable, falling back to in-memory limiter.", err);
    }
  }

  return checkRateLimitInMemory(identifier, options);
}

/**
 * Extracts the real client IP from incoming Next.js Request headers.
 * Header trust is platform-specific: a header the platform does not overwrite
 * can be forged by the client to dodge rate limits.
 */
export function getClientIp(req: Request): string {
  const header = (name: string) => req.headers.get(name)?.split(",")[0].trim() || null;

  // Vercel overwrites x-real-ip / x-forwarded-for with the true client IP
  if (process.env.VERCEL) {
    return header("x-real-ip") || header("x-forwarded-for") || "127.0.0.1";
  }

  // Netlify sets x-nf-client-connection-ip at its edge; its x-forwarded-for may include client-supplied values
  const netlifyIp = header("x-nf-client-connection-ip");
  if (netlifyIp) return netlifyIp;

  // Self-hosted / local: only trustworthy behind a proxy that overwrites these headers
  return header("x-forwarded-for") || header("x-real-ip") || header("cf-connecting-ip") || "127.0.0.1";
}

/**
 * Creates a standard 429 Too Many Requests response with HTTP rate limit headers
 */
export function rateLimitResponse(
  result: RateLimitResult,
  customMessage?: string
): NextResponse {
  const message =
    customMessage ||
    `Too many requests. Please slow down and try again in ${result.resetInSeconds} second${
      result.resetInSeconds === 1 ? "" : "s"
    }.`;

  return NextResponse.json(
    { error: message, retryAfter: result.resetInSeconds },
    {
      status: 429,
      headers: {
        "Retry-After": result.resetInSeconds.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.resetInSeconds.toString(),
      },
    }
  );
}

// Pre-defined security rate limit configurations
export const RATE_LIMIT_RULES = {
  // Login: 5 attempts per 1 minute per IP
  LOGIN: { limit: 5, windowMs: 60 * 1000 },
  // Registration: 5 attempts per 15 minutes per IP (anti-bot account creation)
  REGISTER: { limit: 5, windowMs: 15 * 60 * 1000 },
  // Payment initiation: 10 attempts per 5 minutes per user/IP (anti-card testing)
  PAYMENT_INIT: { limit: 10, windowMs: 5 * 60 * 1000 },
  // Payment verification: 15 attempts per 5 minutes per IP
  PAYMENT_VERIFY: { limit: 15, windowMs: 5 * 60 * 1000 },
  // AI grading: each submission costs an AI call and sends an email (per user)
  GRADE: { limit: 10, windowMs: 10 * 60 * 1000 },
  // Tutor AI assistant (per user)
  AI_ASSISTANT: { limit: 15, windowMs: 10 * 60 * 1000 },
  // File upload URL requests (per user)
  UPLOAD: { limit: 30, windowMs: 10 * 60 * 1000 },
  // Discussion posts and replies (per user)
  DISCUSSION: { limit: 20, windowMs: 5 * 60 * 1000 },
  // Profile / password changes (per user)
  PROFILE: { limit: 10, windowMs: 15 * 60 * 1000 },
  // Public contact form (per IP)
  CONTACT: { limit: 5, windowMs: 60 * 60 * 1000 },
};
