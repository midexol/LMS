import { describe, it, expect, vi } from "vitest";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";
import { freshIp } from "../helpers/http";

const rule = { limit: 3, windowMs: 60_000 };
let n = 0;
const id = () => `test:${++n}:${Math.random()}`;

describe("in-memory rate limiter", () => {
  it("allows requests up to the limit then blocks", async () => {
    const key = id();
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await checkRateLimit(key, rule)).success);
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("reports remaining attempts and reset time", async () => {
    const key = id();
    const first = await checkRateLimit(key, rule);
    expect(first).toMatchObject({ success: true, limit: 3, remaining: 2, resetInSeconds: 60 });
    const second = await checkRateLimit(key, rule);
    expect(second.remaining).toBe(1);
    await checkRateLimit(key, rule);
    const blocked = await checkRateLimit(key, rule);
    expect(blocked).toMatchObject({ success: false, remaining: 0 });
    expect(blocked.resetInSeconds).toBeGreaterThan(0);
    expect(blocked.resetInSeconds).toBeLessThanOrEqual(60);
  });

  it("tracks each identifier separately", async () => {
    const a = id();
    const b = id();
    for (let i = 0; i < 3; i++) await checkRateLimit(a, rule);
    expect((await checkRateLimit(a, rule)).success).toBe(false);
    expect((await checkRateLimit(b, rule)).success).toBe(true);
  });

  it("starts a fresh window once the old one expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const key = id();
    for (let i = 0; i < 3; i++) await checkRateLimit(key, rule);
    expect((await checkRateLimit(key, rule)).success).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
    const again = await checkRateLimit(key, rule);
    expect(again.success).toBe(true);
    expect(again.remaining).toBe(2);
  });

  it("ships sensible rules for the sensitive endpoints", () => {
    expect(RATE_LIMIT_RULES.LOGIN).toEqual({ limit: 5, windowMs: 60_000 });
    expect(RATE_LIMIT_RULES.REGISTER.limit).toBe(5);
    expect(RATE_LIMIT_RULES.GRADE.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMIT_RULES.CONTACT.windowMs).toBe(60 * 60 * 1000);
  });
});

describe("Redis (Upstash) rate limiter", () => {
  const useRedis = () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok_123");
  };
  const redisReply = (count: number, pttl = 45_000) =>
    new Response(JSON.stringify([{ result: count }, { result: 1 }, { result: pttl }]), { status: 200 });

  it("uses one pipelined request and reads the shared counter", async () => {
    useRedis();
    const fetchMock = vi.fn().mockResolvedValue(redisReply(1));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit(id(), rule);
    expect(result).toMatchObject({ success: true, remaining: 2, resetInSeconds: 45 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://redis.test/pipeline");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok_123" });
    const commands = JSON.parse((init as RequestInit).body as string);
    expect(commands.map((c: string[]) => c[0])).toEqual(["INCR", "PEXPIRE", "PTTL"]);
  });

  it("blocks when the shared counter is over the limit", async () => {
    useRedis();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(redisReply(4)));
    const result = await checkRateLimit(id(), rule);
    expect(result).toMatchObject({ success: false, remaining: 0 });
  });

  it("falls back to the in-memory limiter when Redis errors", async () => {
    useRedis();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const key = id();
    expect((await checkRateLimit(key, rule)).success).toBe(true);
  });

  it("falls back when Redis answers with an error status", async () => {
    useRedis();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    const key = id();
    for (let i = 0; i < 3; i++) await checkRateLimit(key, rule);
    expect((await checkRateLimit(key, rule)).success).toBe(false); // memory limiter is now in charge
  });
});

describe("getClientIp", () => {
  const req = (headers: Record<string, string>) => new Request("http://x.test", { headers });

  it("on Vercel trusts x-real-ip and ignores a spoofed Netlify header", () => {
    vi.stubEnv("VERCEL", "1");
    expect(getClientIp(req({ "x-real-ip": "1.1.1.1", "x-nf-client-connection-ip": "6.6.6.6" }))).toBe("1.1.1.1");
  });

  it("on Vercel falls back to the first x-forwarded-for entry", () => {
    vi.stubEnv("VERCEL", "1");
    expect(getClientIp(req({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" }))).toBe("2.2.2.2");
  });

  it("on Netlify prefers x-nf-client-connection-ip over a client-supplied x-forwarded-for", () => {
    expect(getClientIp(req({ "x-nf-client-connection-ip": "4.4.4.4", "x-forwarded-for": "9.9.9.9" }))).toBe("4.4.4.4");
  });

  it("elsewhere uses x-forwarded-for, then x-real-ip, then cf-connecting-ip", () => {
    expect(getClientIp(req({ "x-forwarded-for": "5.5.5.5, 8.8.8.8" }))).toBe("5.5.5.5");
    expect(getClientIp(req({ "x-real-ip": "7.7.7.7" }))).toBe("7.7.7.7");
    expect(getClientIp(req({ "cf-connecting-ip": "8.8.4.4" }))).toBe("8.8.4.4");
  });

  it("defaults to localhost with no headers", () => {
    expect(getClientIp(req({}))).toBe("127.0.0.1");
  });

  it("test helper hands out unique IPs", () => {
    expect(freshIp()).not.toBe(freshIp());
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with Retry-After and rate-limit headers", async () => {
    const res = rateLimitResponse({ success: false, limit: 5, remaining: 0, resetInSeconds: 42 });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    const body = await res.json();
    expect(body.error).toMatch(/42 seconds/);
    expect(body.retryAfter).toBe(42);
  });

  it("uses singular wording for one second and accepts a custom message", async () => {
    const one = await rateLimitResponse({ success: false, limit: 1, remaining: 0, resetInSeconds: 1 }).json();
    expect(one.error).toMatch(/1 second\./);
    const custom = await rateLimitResponse({ success: false, limit: 1, remaining: 0, resetInSeconds: 9 }, "Slow down").json();
    expect(custom.error).toBe("Slow down");
  });
});
