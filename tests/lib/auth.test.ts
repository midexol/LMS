import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookieJar, prismaMock } from "../helpers/mocks";

// The global setup replaces getCurrentUser with a stub; these tests need the real one.
const auth = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
const { signSessionToken, verifySessionToken, getCurrentUser, SESSION_MAX_AGE_SECONDS } = auth;

const DAY = 24 * 60 * 60 * 1000;

describe("signSessionToken / verifySessionToken", () => {
  it("round-trips a user id", () => {
    const token = signSessionToken("user_abc");
    const result = verifySessionToken(token);
    expect(result?.userId).toBe("user_abc");
    expect(result?.issuedAt).toBeLessThanOrEqual(Date.now());
  });

  it("produces userId.issuedAt.signature", () => {
    const parts = signSessionToken("user_abc").split(".");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("user_abc");
    expect(Number(parts[1])).toBeGreaterThan(0);
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a tampered signature", () => {
    const token = signSessionToken("user_abc");
    const last = token.slice(-1) === "a" ? "b" : "a";
    expect(verifySessionToken(token.slice(0, -1) + last)).toBeNull();
  });

  it("rejects a token whose user id was swapped (impersonation attempt)", () => {
    const [, issuedAt, sig] = signSessionToken("user_abc").split(".");
    expect(verifySessionToken(`admin_1.${issuedAt}.${sig}`)).toBeNull();
  });

  it("rejects a token whose issue time was changed to dodge expiry", () => {
    const [id, issuedAt, sig] = signSessionToken("user_abc").split(".");
    expect(verifySessionToken(`${id}.${Number(issuedAt) + 1000}.${sig}`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const token = signSessionToken("user_abc");
    vi.stubEnv("SESSION_SECRET", "a_completely_different_secret");
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects the old unsigned format (a bare user id) so ids cannot be used as cookies", () => {
    expect(verifySessionToken("cm9abcdefghijklmnopqrstuv")).toBeNull();
    expect(verifySessionToken("cm9abcdefghijklmnopqrstuv.deadbeef")).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("a.b")).toBeNull();
    expect(verifySessionToken("a.b.c.d")).toBeNull();
    expect(verifySessionToken("user..sig")).toBeNull();
    expect(verifySessionToken("user.notanumber.zz")).toBeNull();
    expect(verifySessionToken(".1.abc")).toBeNull();
  });

  it("expires after 7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = signSessionToken("user_abc");

    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + 6 * DAY);
    expect(verifySessionToken(token)).not.toBeNull();

    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() + 7 * DAY + 1000);
    expect(verifySessionToken(token)).toBeNull();
    expect(SESSION_MAX_AGE_SECONDS).toBe(7 * 24 * 60 * 60);
  });

  it("rejects tokens dated in the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    const token = signSessionToken("user_abc");
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect(verifySessionToken(token)).toBeNull();
  });

  it("refuses to sign anything in production without a real SESSION_SECRET", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => signSessionToken("user_abc")).toThrow(/SESSION_SECRET/);
  });
});

describe("getCurrentUser", () => {
  const dbUser = {
    id: "user_1",
    name: "Ada",
    email: "ada@test.com",
    role: "STUDENT",
    faculty: "Science",
    department: "Chemistry",
    phone: "08031234567",
    emailVerified: true,
    sessionsValidAfter: null as Date | null,
  };

  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
  });

  it("returns null when there is no cookie", async () => {
    expect(await getCurrentUser()).toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns the user for a valid cookie and looks them up by id", async () => {
    cookieJar.set("lms_user_id", signSessionToken("user_1"));
    const user = await getCurrentUser();
    expect(user).toMatchObject({ id: "user_1", email: "ada@test.com", role: "STUDENT", emailVerified: true, phone: "08031234567" });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: "user_1" } });
  });

  it("never exposes the password hash", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, password: "$2a$12$secret" });
    cookieJar.set("lms_user_id", signSessionToken("user_1"));
    expect(await getCurrentUser()).not.toHaveProperty("password");
  });

  it("returns null for a forged cookie without touching the database", async () => {
    cookieJar.set("lms_user_id", "user_1.123.forged");
    expect(await getCurrentUser()).toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when the user no longer exists (deleted account)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    cookieJar.set("lms_user_id", signSessionToken("user_1"));
    expect(await getCurrentUser()).toBeNull();
  });

  it("revokes sessions issued before a password change", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    cookieJar.set("lms_user_id", signSessionToken("user_1"));

    vi.setSystemTime(new Date("2026-03-01T11:00:00Z"));
    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, sessionsValidAfter: new Date("2026-03-01T10:30:00Z") });
    expect(await getCurrentUser()).toBeNull();
  });

  it("keeps sessions issued after the revocation time", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, sessionsValidAfter: new Date("2026-03-01T09:00:00Z") });
    cookieJar.set("lms_user_id", signSessionToken("user_1"));
    expect(await getCurrentUser()).not.toBeNull();
  });

  it("fails closed (null) if the database is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.user.findUnique.mockRejectedValue(new Error("db down"));
    cookieJar.set("lms_user_id", signSessionToken("user_1"));
    expect(await getCurrentUser()).toBeNull();
  });
});
