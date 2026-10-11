import { describe, it, expect, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNgn, getAppUrl, normalizePhone } from "@/lib/utils";

describe("test harness safety", () => {
  it("never connects to a real database", () => {
    expect(process.env.DATABASE_URL).toContain("never_connect");
    // The mocked client exposes vi.fn() methods; the real PrismaClient would not.
    expect(vi.isMockFunction(prisma.user.findUnique)).toBe(true);
  });

  it("has no real third-party keys loaded", () => {
    for (const key of ["GEMINI_API_KEY", "OPENAI_API_KEY", "PAYSTACK_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
      expect(process.env[key], key).toBeUndefined();
    }
  });
});

describe("formatDate", () => {
  it("formats dates as 'Mon DD, YYYY'", () => {
    expect(formatDate(new Date(2026, 2, 5))).toBe("Mar 05, 2026");
    expect(formatDate(new Date(2026, 11, 25))).toBe("Dec 25, 2026");
  });

  it("accepts ISO strings", () => {
    expect(formatDate("2026-06-15T12:00:00")).toBe("Jun 15, 2026");
  });

  it("returns an empty string for missing or invalid input", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("not a date")).toBe("");
  });
});

describe("formatNgn", () => {
  it("formats Naira amounts with thousands separators and no decimals", () => {
    expect(formatNgn(1500)).toMatch(/1,500$/);
    expect(formatNgn(1500)).not.toMatch(/\./);
    expect(formatNgn(1234567)).toMatch(/1,234,567$/);
  });

  it("handles zero, null and NaN", () => {
    expect(formatNgn(0)).toMatch(/0$/);
    expect(formatNgn(null)).toBe("₦0");
    expect(formatNgn(undefined)).toBe("₦0");
    expect(formatNgn(NaN)).toBe("₦0");
  });
});

describe("getAppUrl", () => {
  it("returns the configured URL without a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.edu.ng/");
    expect(getAppUrl()).toBe("https://example.edu.ng");
  });

  it("falls back to localhost in development when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("refuses to guess in production", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});

describe("normalizePhone", () => {
  it("treats empty values as 'no phone'", () => {
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("   ")).toBeNull();
  });

  it("accepts Nigerian local and international formats and strips separators", () => {
    expect(normalizePhone("0803 123 4567")).toBe("08031234567");
    expect(normalizePhone("+234 803-123-4567")).toBe("+2348031234567");
    expect(normalizePhone("(0803) 1234567")).toBe("08031234567");
  });

  it("rejects letters, too-short and too-long numbers, and non-strings", () => {
    expect(normalizePhone("call me")).toBeUndefined();
    expect(normalizePhone("12345")).toBeUndefined();
    expect(normalizePhone("1".repeat(16))).toBeUndefined();
    expect(normalizePhone("0803abc4567")).toBeUndefined();
    expect(normalizePhone(8031234567)).toBeUndefined();
  });
});
