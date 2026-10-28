import { describe, it, expect, vi, afterEach } from "vitest";
import { isValidInstructorKey } from "@/lib/instructorLink";

const KEY = "a-long-private-key-1234567890";

afterEach(() => vi.unstubAllEnvs());

describe("isValidInstructorKey", () => {
  it("accepts exactly the configured key", () => {
    vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", KEY);
    expect(isValidInstructorKey(KEY)).toBe(true);
  });

  it("rejects a wrong key, a near miss, an empty key and non-strings", () => {
    vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", KEY);
    for (const bad of ["wrong", KEY + "x", KEY.slice(0, -1), "", undefined, null, 123, ["a"], {}]) {
      expect(isValidInstructorKey(bad as unknown)).toBe(false);
    }
  });

  it("is off for everyone when no key is configured", () => {
    vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", "");
    expect(isValidInstructorKey("")).toBe(false);
    expect(isValidInstructorKey(KEY)).toBe(false);
  });

  it("refuses to switch on with a weak (short) key, even if it is typed correctly", () => {
    vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", "short");
    expect(isValidInstructorKey("short")).toBe(false);
  });
});
