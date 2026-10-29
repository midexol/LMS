import { describe, it, expect, vi, afterEach } from "vitest";
import { firstPasswordProblem, passwordRules, BREACHED_MESSAGE, MIN_PASSWORD_LENGTH, MAX_PASSWORD_BYTES } from "@/lib/passwordPolicy";
import { pwnedCount } from "@/lib/pwned";
import { checkNewPassword } from "@/lib/passwordCheck";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("password rules", () => {
  const ok = (p: string, ctx = {}) => firstPasswordProblem(p, ctx);

  it("accepts a long, unusual password", () => {
    expect(ok("purple-giraffe-teapot-47")).toBeNull();
    expect(ok("Tr0ub4dor&3-horse")).toBeNull();
  });

  it(`needs at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(ok("a1b2c3d4e")).toMatch(/at least 10/);
    expect(ok("a1b2c3d4e5")).toBeNull();
  });

  it("refuses anything longer than bcrypt can use (72 bytes), counting bytes not letters", () => {
    // varied letters, so the "simple pattern" rule does not fire first
    const filler = "Kq7vbn3rT5ys8wZ2pL9mX4hD6cF1gJ8uB3eN7aS5dH2fG9jK4lQ6zV1xC8";
    const seventyTwo = filler + "tY4wR7nM2pE5hB";
    expect(seventyTwo.length).toBe(72);
    expect(ok(seventyTwo)).toBeNull();
    expect(ok(seventyTwo + "q")).toMatch(/no more than 72/);
    expect(ok("é".repeat(37))).toMatch(/no more than 72/); // 74 bytes in 37 letters
    expect(MAX_PASSWORD_BYTES).toBe(72);
  });

  it("refuses common passwords, including with digits or symbols added to the end", () => {
    for (const bad of ["password", "Password123", "PASSWORD!!", "qwertyuiop", "iloveyou1", "welcome12345", "Academia2026"]) {
      expect(firstPasswordProblem(bad), bad).not.toBeNull();
    }
    expect(ok("Password123!")).toMatch(/common/);
    expect(ok("welcome2026")).toMatch(/common/);
    expect(ok("Academia2026")).toMatch(/common/);
  });

  it("refuses simple patterns", () => {
    expect(ok("aaaaaaaaaaaa")).toMatch(/pattern/);
    expect(ok("1234567890")).toMatch(/pattern/);
    expect(ok("abcdefghijkl")).toMatch(/pattern/);
    expect(ok("abcabcabcabc")).toMatch(/pattern/);
    expect(ok("0987654321")).toMatch(/pattern/);
  });

  it("refuses a password that contains the person's email name or own name", () => {
    expect(ok("adaobi-is-great-9", { email: "adaobi@example.com" })).toMatch(/name or email/);
    expect(ok("my-chukwuemeka-pass", { name: "Chukwuemeka Obi" })).toMatch(/name or email/);
    expect(ok("purple-giraffe-teapot-47", { email: "adaobi@example.com", name: "Chukwuemeka Obi" })).toBeNull();
    // short fragments are too common to forbid
    expect(ok("purple-giraffe-ada-47", { email: "ada@example.com", name: "Ada Obi" })).toBeNull();
  });

  it("says, rule by rule, which are met (for the live checklist)", () => {
    const rules = passwordRules("abc");
    expect(rules.find((r) => r.id === "length")!.ok).toBe(false);
    expect(rules.find((r) => r.id === "common")!.ok).toBe(true);
    expect(passwordRules("purple-giraffe-teapot-47").every((r) => r.ok)).toBe(true);
  });

  it("treats a missing or non-text password as a problem", () => {
    for (const bad of [undefined, null, "", 123456, {}]) expect(firstPasswordProblem(bad)).toBe("Password is required.");
  });
});

describe("data breach check (Have I Been Pwned, k-anonymity)", () => {
  // The SHA-1 of "password" is 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
  const PREFIX = "5BAA6";
  const SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";
  const reply = (text: string, ok = true) => vi.fn().mockResolvedValue({ ok, text: async () => text } as Response);

  it("sends only the first 5 characters of the fingerprint, never the password", async () => {
    vi.stubEnv("DISABLE_PWNED_CHECK", "false");
    const fetchFn = reply(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${SUFFIX}:10434004\r\n`);
    const count = await pwnedCount("password", fetchFn as unknown as typeof fetch);

    expect(count).toBe(10434004);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`https://api.pwnedpasswords.com/range/${PREFIX}`);
    expect(new URL(String(url)).pathname).not.toContain("password");
    expect(String(url)).not.toContain(SUFFIX);
    expect((init as RequestInit).headers).toMatchObject({ "Add-Padding": "true" });
  });

  it("reports 0 when the password is not in the list, and ignores padding rows", async () => {
    vi.stubEnv("DISABLE_PWNED_CHECK", "false");
    expect(await pwnedCount("password", reply(`AAAA:3\r\nBBBB:0\r\n`) as unknown as typeof fetch)).toBe(0);
    expect(await pwnedCount("password", reply(`${SUFFIX}:0\r\n`) as unknown as typeof fetch)).toBe(0);
  });

  it("returns null (could not check) when the service is down, slow, or switched off", async () => {
    vi.stubEnv("DISABLE_PWNED_CHECK", "false");
    expect(await pwnedCount("password", vi.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch)).toBeNull();
    expect(await pwnedCount("password", reply("", false) as unknown as typeof fetch)).toBeNull();
    vi.stubEnv("DISABLE_PWNED_CHECK", "true");
    const never = vi.fn();
    expect(await pwnedCount("password", never as unknown as typeof fetch)).toBeNull();
    expect(never).not.toHaveBeenCalled();
  });
});

describe("checkNewPassword (what every route runs)", () => {
  it("applies the rules first, and does not even ask the breach service about a password that already failed", async () => {
    vi.stubEnv("DISABLE_PWNED_CHECK", "false");
    const fetchFn = vi.fn();
    vi.stubGlobal("fetch", fetchFn);
    expect(await checkNewPassword("short")).toMatch(/at least 10/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("refuses a password found in a breach", async () => {
    vi.stubEnv("DISABLE_PWNED_CHECK", "false");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => `${"A".repeat(35)}:1\n` } as Response));
    // a made-up password whose real fingerprint is not in that fake list is accepted...
    expect(await checkNewPassword("purple-giraffe-teapot-47")).toBeNull();
    // ...and one whose suffix IS listed is refused
    const crypto = await import("crypto");
    const sha = crypto.createHash("sha1").update("purple-giraffe-teapot-47").digest("hex").toUpperCase();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => `${sha.slice(5)}:42\n` } as Response));
    expect(await checkNewPassword("purple-giraffe-teapot-47")).toBe(BREACHED_MESSAGE);
  });

  it("lets a good password through when the breach service is unreachable", async () => {
    vi.stubEnv("DISABLE_PWNED_CHECK", "false");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await checkNewPassword("purple-giraffe-teapot-47")).toBeNull();
  });
});
