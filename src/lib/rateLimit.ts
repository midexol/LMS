import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Global in-memory storage for rate limits
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
 * Checks and increments rate limit for a specific identifier (IP, user ID, email, etc.)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 10, windowMs: 60 * 1000 }
): RateLimitResult {
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
 * Extracts the real client IP from incoming Next.js Request headers
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
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
};
