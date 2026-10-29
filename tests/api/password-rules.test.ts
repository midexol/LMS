import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { prismaMock } from "../helpers/mocks";
import { call } from "../helpers/http";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as instructorSignup } from "@/app/api/auth/instructor-signup/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { BREACHED_MESSAGE } from "@/lib/passwordPolicy";

const STRONG = "purple-giraffe-teapot-47";
const KEY = "a-long-private-key-1234567890";

beforeEach(() => {
  vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockImplementation(async ({ data }: any) => ({ id: "new_user", createdAt: new Date(), ...data }));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** Make the outside breach list say this password was seen `times` times (0 = never). */
function breachListSays(password: string, times: number) {
  vi.stubEnv("DISABLE_PWNED_CHECK", "false");
  const sha = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const text = times > 0 ? `${sha.slice(5)}:${times}\r\n` : `${"0".repeat(35)}:1\r\n`;
  const fetchFn = vi.fn().mockResolvedValue({ ok: true, text: async () => text } as Response);
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

describe("student sign-up enforces the password rules on the server", () => {
  const signup = (password: string, over: Record<string, unknown> = {}) =>
    call(register, "/api/auth/register", {
      body: { name: "Ada Obi", email: "ada@test.com", password, faculty: "Science", department: "Chemistry", ...over },
    });

  it("accepts a strong password", async () => {
    expect((await signup(STRONG)).status).toBe(200);
  });

  it.each([
    ["too short", "abc123", /at least 10/],
    ["common", "Password123!", /too common/],
    ["a simple pattern", "aaaaaaaaaaaa", /simple pattern/],
    ["longer than bcrypt reads", "x7".repeat(40), /no more than 72/],
  ])("refuses a password that is %s, and creates nothing", async (_why, password, message) => {
    const { status, body } = await signup(password);
    expect(status).toBe(400);
    expect(body.error).toMatch(message);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("refuses a password built from the person's own name or email", async () => {
    const { status, body } = await signup("chukwuemeka-is-47", { name: "Chukwuemeka Obi", email: "someone@test.com" });
    expect(status).toBe(400);
    expect(body.error).toMatch(/name or email/);
  });

  it("refuses a password that has appeared in a known data breach", async () => {
    const fetchFn = breachListSays(STRONG, 3861);
    const { status, body } = await signup(STRONG);
    expect(status).toBe(400);
    expect(body.error).toBe(BREACHED_MESSAGE);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    // and only the 5-character fingerprint prefix was sent out, never the password
    expect(String(fetchFn.mock.calls[0][0])).toMatch(/\/range\/[0-9A-F]{5}$/);
    expect(JSON.stringify(fetchFn.mock.calls)).not.toContain(STRONG);
  });

  it("accepts a password the breach list has never seen", async () => {
    breachListSays(STRONG, 0);
    expect((await signup(STRONG)).status).toBe(200);
  });

  it("still lets a good password through when the breach service is down", async () => {
    vi.stubEnv("DISABLE_PWNED_CHECK", "false");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await signup(STRONG)).status).toBe(200);
  });
});

describe("instructor sign-up (private link) enforces the same rules", () => {
  const join = (password: string) =>
    call(instructorSignup, "/api/auth/instructor-signup", {
      body: { key: KEY, name: "Dr Ade Bello", email: "ade@test.com", password, faculty: "Business Studies", department: "Marketing" },
    });

  it("refuses a weak, common or breached password", async () => {
    expect((await join("short")).status).toBe(400);
    expect((await join("Welcome2026")).status).toBe(400);
    breachListSays(STRONG, 12);
    expect((await join(STRONG)).body.error).toBe(BREACHED_MESSAGE);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe("password reset enforces the same rules", () => {
  const reset = (password: string) => call(resetPassword, "/api/auth/reset-password", { body: { token: "a".repeat(64), password } });

  beforeEach(() => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "chukwuemeka@test.com", name: "Chukwuemeka Obi" });
    prismaMock.user.update.mockResolvedValue({});
  });

  it("accepts a strong password and rejects weak, common and personal ones", async () => {
    expect((await reset(STRONG)).status).toBe(200);
    prismaMock.user.update.mockClear();
    expect((await reset("short")).status).toBe(400);
    expect((await reset("Password123!")).status).toBe(400);
    expect((await reset("chukwuemeka-forever-91")).status).toBe(400); // contains the account's own email name
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("refuses a breached password", async () => {
    breachListSays(STRONG, 1);
    const { status, body } = await reset(STRONG);
    expect(status).toBe(400);
    expect(body.error).toBe(BREACHED_MESSAGE);
  });
});
