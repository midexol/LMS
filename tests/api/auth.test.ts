import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prismaMock, mailMock, cookieJar } from "../helpers/mocks";
import { call, makeRequest } from "../helpers/http";

/* Fake Privy server SDK: tests decide what Privy says about a token. */
const privy = vi.hoisted(() => ({
  verify: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@privy-io/server-auth", () => ({
  PrivyClient: class {
    verifyAuthToken = privy.verify;
    getUser = privy.getUser;
  },
}));

import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout, GET as logoutGet } from "@/app/api/auth/logout/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { POST as verifyEmail } from "@/app/api/auth/verify-email/route";
import { POST as resendVerification } from "@/app/api/auth/verify-email/resend/route";
import { POST as privyLogin } from "@/app/api/auth/privy/route";
import { verifySessionToken } from "@/lib/auth";

const HOUR = 60 * 60 * 1000;
let passwordHash: string;

beforeEach(async () => {
  passwordHash ??= await bcrypt.hash("correct-horse", 4);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

/* ───────────────────────────── register ───────────────────────────── */
describe("POST /api/auth/register", () => {
  const valid = { name: "Ada Obi", email: "Ada@Test.com ", password: "secret12", faculty: "Science", department: "Chemistry", phone: "0803 123 4567" };

  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }: any) => ({ id: "new_user_1", createdAt: new Date(), ...data }));
  });

  it("creates a student account, normalises input and never returns the password", async () => {
    const { status, body } = await call(register, "/api/auth/register", { body: valid });

    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.user).not.toHaveProperty("password");
    expect(body.user.email).toBe("ada@test.com");

    const data = prismaMock.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: "Ada Obi",
      email: "ada@test.com",
      role: "STUDENT",
      phone: "08031234567",
      faculty: "Science",
      department: "Chemistry",
      emailVerified: false,
    });
  });

  it("stores only a bcrypt hash of the password", async () => {
    await call(register, "/api/auth/register", { body: valid });
    const stored = prismaMock.user.create.mock.calls[0][0].data.password;
    expect(stored).not.toBe("secret12");
    expect(stored.startsWith("$2")).toBe(true);
    expect(await bcrypt.compare("secret12", stored)).toBe(true);
  });

  it("cannot be used to create an admin or tutor, whatever the request claims", async () => {
    for (const role of ["ADMIN", "SUPERADMIN", "TUTOR"]) {
      await call(register, "/api/auth/register", { body: { ...valid, email: `${role}@test.com`, role } });
    }
    for (const [args] of prismaMock.user.create.mock.calls) expect(args.data.role).toBe("STUDENT");
  });

  it("issues a 24-hour email verification token and emails a link on the configured domain", async () => {
    await call(register, "/api/auth/register", { body: valid, headers: { host: "evil.example.com" } });
    const data = prismaMock.user.create.mock.calls[0][0].data;
    expect(data.verificationToken).toMatch(/^[0-9a-f]{64}$/);
    const ttl = data.verificationTokenExpiry.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(23 * HOUR);
    expect(ttl).toBeLessThanOrEqual(24 * HOUR);

    const [to, mailData] = mailMock.sendVerificationEmail.mock.calls[0];
    expect(to).toBe("ada@test.com");
    expect(mailData.verifyUrl).toBe(`https://lms.test/verify-email?token=${data.verificationToken}`);
  });

  it("signs the new user in with httpOnly session and role cookies", async () => {
    await call(register, "/api/auth/register", { body: valid });
    expect(verifySessionToken(cookieJar.get("lms_user_id")!.value)?.userId).toBe("new_user_1");
    expect(cookieJar.options("lms_user_id")).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 604800 });
    expect(cookieJar.options("lms_user_role")).toMatchObject({ httpOnly: true });
    expect(cookieJar.get("lms_user_role")!.value).toBe("STUDENT");
  });

  it("marks session cookies Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await call(register, "/api/auth/register", { body: valid });
    expect(cookieJar.options("lms_user_id")).toMatchObject({ secure: true });
  });

  it("still succeeds if the verification email cannot be sent", async () => {
    mailMock.sendVerificationEmail.mockRejectedValue(new Error("SMTP down"));
    expect((await call(register, "/api/auth/register", { body: valid })).status).toBe(200);
  });

  it.each([
    ["a one-letter name", { name: "A" }, /at least 2/],
    ["a name over 80 characters", { name: "x".repeat(81) }, /80/],
    ["an invalid email", { email: "not-an-email" }, /valid email/],
    ["a missing email", { email: "" }, /valid email/],
    ["a missing password", { password: "" }, /Password is required/],
    ["a short password", { password: "12345" }, /at least 6/],
    ["a phone number with letters", { phone: "call-me-maybe" }, /phone/],
  ])("rejects %s", async (_label, patch, message) => {
    const { status, body } = await call(register, "/api/auth/register", { body: { ...valid, ...patch } });
    expect(status).toBe(400);
    expect(body.error).toMatch(message);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("accepts an empty phone (it is optional)", async () => {
    expect((await call(register, "/api/auth/register", { body: { ...valid, phone: "" } })).status).toBe(200);
    expect(prismaMock.user.create.mock.calls[0][0].data.phone).toBeNull();
  });

  it("rejects a duplicate email", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" });
    const { status, body } = await call(register, "/api/auth/register", { body: valid });
    expect(status).toBe(400);
    expect(body.error).toMatch(/already exists/);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rate-limits repeated sign-ups from one network (5 per 15 minutes)", async () => {
    const ip = "203.0.113.50";
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await call(register, "/api/auth/register", { body: { name: "x" }, ip })).status);
    expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
  });

  it("hides internal errors behind a generic message", async () => {
    prismaMock.user.create.mockRejectedValue(new Error('duplicate key value violates "User_pkey" at db.internal'));
    const { status, body } = await call(register, "/api/auth/register", { body: valid });
    expect(status).toBe(500);
    expect(body.error).toBe("Failed to register user.");
  });
});

/* ───────────────────────────── login ───────────────────────────── */
describe("POST /api/auth/login", () => {
  const dbUser = () => ({ id: "u_1", name: "Ada", email: "ada@test.com", role: "STUDENT", password: passwordHash, emailVerified: true });

  it("signs in with the right password, sets cookies and records the login time", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser());
    const { status, body } = await call(login, "/api/auth/login", { body: { email: " ADA@test.com ", password: "correct-horse" } });

    expect(status).toBe(200);
    expect(body.user).toMatchObject({ id: "u_1", role: "STUDENT" });
    expect(body.user).not.toHaveProperty("password");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "ada@test.com" } });
    expect(prismaMock.user.update.mock.calls[0][0]).toMatchObject({ where: { id: "u_1" } });
    expect(prismaMock.user.update.mock.calls[0][0].data.lastLoginAt).toBeInstanceOf(Date);
    expect(verifySessionToken(cookieJar.get("lms_user_id")!.value)?.userId).toBe("u_1");
    expect(cookieJar.options("lms_user_id")).toMatchObject({ httpOnly: true });
  });

  it("returns the same error for an unknown email and a wrong password (no account enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const unknown = await call(login, "/api/auth/login", { body: { email: "nobody@test.com", password: "whatever1" } });
    prismaMock.user.findUnique.mockResolvedValue(dbUser());
    const wrong = await call(login, "/api/auth/login", { body: { email: "ada@test.com", password: "wrong-password" } });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(cookieJar.has("lms_user_id")).toBe(false);
  });

  it("does not accept a stored non-bcrypt value as a plain-text password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser(), password: "password123" });
    const { status } = await call(login, "/api/auth/login", { body: { email: "ada@test.com", password: "password123" } });
    expect(status).not.toBe(200);
    expect(cookieJar.has("lms_user_id")).toBe(false);
  });

  it("requires both email and password", async () => {
    expect((await call(login, "/api/auth/login", { body: { email: "a@test.com" } })).status).toBe(400);
    expect((await call(login, "/api/auth/login", { body: { password: "x" } })).status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("blocks brute-force guessing: 5 attempts per minute per IP", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser());
    const ip = "198.51.100.77";
    const statuses = [];
    for (let i = 0; i < 7; i++) statuses.push((await call(login, "/api/auth/login", { body: { email: "ada@test.com", password: "wrong" }, ip })).status);
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429, 429]);
  });

  it("a locked-out IP cannot log in even with the right password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser());
    const ip = "198.51.100.78";
    for (let i = 0; i < 5; i++) await call(login, "/api/auth/login", { body: { email: "ada@test.com", password: "wrong" }, ip });
    const { status } = await call(login, "/api/auth/login", { body: { email: "ada@test.com", password: "correct-horse" }, ip });
    expect(status).toBe(429);
    expect(cookieJar.has("lms_user_id")).toBe(false);
  });

  it("returns a generic error on database failure", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("connection refused 10.0.0.5:5432"));
    const { status, body } = await call(login, "/api/auth/login", { body: { email: "a@test.com", password: "x" } });
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("10.0.0.5");
  });
});

/* ───────────────────────────── logout ───────────────────────────── */
describe("logout", () => {
  beforeEach(() => {
    cookieJar.set("lms_user_id", "token");
    cookieJar.set("lms_user_role", "STUDENT");
  });

  it("POST clears both cookies and reports where to go next", async () => {
    const { status, body } = await call(logout, "/api/auth/logout");
    expect(status).toBe(200);
    expect(body).toEqual({ success: true, redirectUrl: "/login" });
    expect(cookieJar.has("lms_user_id")).toBe(false);
    expect(cookieJar.has("lms_user_role")).toBe(false);
  });

  it("POST from a browser form redirects to /login", async () => {
    const { res } = await call(logout, "/api/auth/logout", { headers: { accept: "text/html" } });
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(cookieJar.has("lms_user_id")).toBe(false);
  });

  it("GET also logs out and redirects", async () => {
    const res = await logoutGet(makeRequest("/api/auth/logout", { method: "GET" }) as any);
    expect(res.status).toBe(303);
    expect(cookieJar.has("lms_user_id")).toBe(false);
  });
});

/* ───────────────────────────── password reset ───────────────────────────── */
describe("POST /api/auth/forgot-password", () => {
  it("requires an email", async () => {
    expect((await call(forgotPassword, "/api/auth/forgot-password", { body: { email: "  " } })).status).toBe(400);
  });

  it("gives the same generic answer whether or not the account exists (no enumeration)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const unknown = await call(forgotPassword, "/api/auth/forgot-password", { body: { email: "ghost@test.com" } });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: "ada@test.com", name: "Ada" });
    const known = await call(forgotPassword, "/api/auth/forgot-password", { body: { email: "ada@test.com" } });
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect(mailMock.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it("stores a 1-hour token and emails a link on OUR domain, ignoring a forged Host header", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", email: "ada@test.com", name: "Ada" });
    await call(forgotPassword, "/api/auth/forgot-password", { body: { email: "ada@test.com" }, headers: { host: "attacker.example", "x-forwarded-host": "attacker.example" } });

    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data.resetToken).toMatch(/^[0-9a-f]{64}$/);
    const ttl = data.resetTokenExpiry.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(59 * 60 * 1000);
    expect(ttl).toBeLessThanOrEqual(HOUR);

    const link = mailMock.sendPasswordResetEmail.mock.calls[0][1].resetUrl;
    expect(link).toBe(`https://lms.test/reset-password?token=${data.resetToken}`);
    expect(link).not.toContain("attacker");
  });

  it("allows only 3 requests per 15 minutes per IP", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const ip = "192.0.2.10";
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await call(forgotPassword, "/api/auth/forgot-password", { body: { email: "a@test.com" }, ip })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

describe("POST /api/auth/reset-password", () => {
  const token = "a".repeat(64);

  it("rejects a missing or short token and a short password", async () => {
    expect((await call(resetPassword, "/api/auth/reset-password", { body: { token: "short", password: "newpass1" } })).status).toBe(400);
    expect((await call(resetPassword, "/api/auth/reset-password", { body: { password: "newpass1" } })).status).toBe(400);
    expect((await call(resetPassword, "/api/auth/reset-password", { body: { token, password: "12345" } })).status).toBe(400);
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });

  it("looks the token up with an expiry check and rejects unknown or expired tokens", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const { status, body } = await call(resetPassword, "/api/auth/reset-password", { body: { token, password: "newpass1" } });
    expect(status).toBe(400);
    expect(body.error).toMatch(/invalid or has expired/);
    const where = prismaMock.user.findFirst.mock.calls[0][0].where;
    expect(where.resetToken).toBe(token);
    expect(where.resetTokenExpiry.gt).toBeInstanceOf(Date);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("sets the new password, burns the token and signs out every existing session", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1" });
    const { status } = await call(resetPassword, "/api/auth/reset-password", { body: { token, password: "newpass1" } });

    expect(status).toBe(200);
    const { where, data } = prismaMock.user.update.mock.calls[0][0];
    expect(where).toEqual({ id: "u1" });
    expect(await bcrypt.compare("newpass1", data.password)).toBe(true);
    expect(data.resetToken).toBeNull();
    expect(data.resetTokenExpiry).toBeNull();
    expect(data.sessionsValidAfter).toBeInstanceOf(Date);
  });
});

/* ───────────────────────────── email verification ───────────────────────────── */
describe("POST /api/auth/verify-email", () => {
  it("requires a token", async () => {
    expect((await call(verifyEmail, "/api/auth/verify-email", { body: {} })).status).toBe(400);
    expect((await call(verifyEmail, "/api/auth/verify-email", { body: { token: 123 } })).status).toBe(400);
  });

  it("rejects unknown or expired tokens", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const { status } = await call(verifyEmail, "/api/auth/verify-email", { body: { token: "abc" } });
    expect(status).toBe(400);
    expect(prismaMock.user.findFirst.mock.calls[0][0].where.verificationTokenExpiry.gt).toBeInstanceOf(Date);
  });

  it("verifies the user, clears the token and sends the welcome email", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", emailVerified: false });
    prismaMock.user.update.mockResolvedValue({ id: "u1", name: "Ada", email: "ada@test.com", faculty: "Sci", department: "Chem" });

    const { status, body } = await call(verifyEmail, "/api/auth/verify-email", { body: { token: " tok " } });

    expect(status).toBe(200);
    expect(body.user).toMatchObject({ id: "u1", emailVerified: true });
    expect(prismaMock.user.findFirst.mock.calls[0][0].where.verificationToken).toBe("tok");
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ emailVerified: true, verificationToken: null, verificationTokenExpiry: null });
    expect(mailMock.sendWelcomeEmail).toHaveBeenCalledWith("ada@test.com", expect.objectContaining({ userName: "Ada", dashboardUrl: "https://lms.test/my-courses" }));
  });

  it("is harmless to click twice", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", emailVerified: true });
    const { status, body } = await call(verifyEmail, "/api/auth/verify-email", { body: { token: "tok" } });
    expect(status).toBe(200);
    expect(body.alreadyVerified).toBe(true);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("still verifies if the welcome email fails", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", emailVerified: false });
    prismaMock.user.update.mockResolvedValue({ id: "u1", name: "A", email: "a@test.com" });
    mailMock.sendWelcomeEmail.mockRejectedValue(new Error("smtp"));
    expect((await call(verifyEmail, "/api/auth/verify-email", { body: { token: "tok" } })).status).toBe(200);
  });
});

describe("POST /api/auth/verify-email/resend", () => {
  it("requires an email", async () => {
    expect((await call(resendVerification, "/api/auth/verify-email/resend", { body: {} })).status).toBe(400);
  });

  it("answers identically for unknown, already-verified and unverified accounts", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const a = await call(resendVerification, "/api/auth/verify-email/resend", { body: { email: "x@test.com" } });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u", emailVerified: true });
    const b = await call(resendVerification, "/api/auth/verify-email/resend", { body: { email: "x@test.com" } });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u", email: "x@test.com", name: "X", emailVerified: false });
    const c = await call(resendVerification, "/api/auth/verify-email/resend", { body: { email: "x@test.com" } });
    expect(a.body).toEqual(b.body);
    expect(b.body).toEqual(c.body);
    expect(mailMock.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("issues a fresh 24-hour token and links to our domain", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u", email: "x@test.com", name: "X", emailVerified: false });
    await call(resendVerification, "/api/auth/verify-email/resend", { body: { email: "x@test.com" } });
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data.verificationToken).toMatch(/^[0-9a-f]{64}$/);
    expect(mailMock.sendVerificationEmail.mock.calls[0][1].verifyUrl).toBe(`https://lms.test/verify-email?token=${data.verificationToken}`);
  });

  it("allows only 3 resends per 15 minutes per IP", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const ip = "192.0.2.99";
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await call(resendVerification, "/api/auth/verify-email/resend", { body: { email: "a@test.com" }, ip })).status);
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});

/* ───────────────────────────── Privy sign-in ───────────────────────────── */
describe("POST /api/auth/privy", () => {
  const bearer = (t = "good-token") => ({ authorization: `Bearer ${t}` });

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "app_id");
    vi.stubEnv("PRIVY_APP_SECRET", "app_secret");
    privy.verify.mockReset();
    privy.getUser.mockReset();
    privy.verify.mockResolvedValue({ userId: "did:privy:abc" });
    privy.getUser.mockResolvedValue({ email: { address: "Ada@Test.com" }, google: { name: "Ada Obi" } });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }: any) => ({ id: "privy_user", ...data }));
    prismaMock.user.update.mockImplementation(async ({ data, where }: any) => ({ id: where.id, role: "STUDENT", email: "ada@test.com", ...data }));
  });

  it("refuses requests with no token, so a spoofed email in the body is useless", async () => {
    const { status } = await call(privyLogin, "/api/auth/privy", { body: { email: "admin@lms.com" } });
    expect(status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(cookieJar.has("lms_user_id")).toBe(false);
  });

  it("refuses a token Privy does not accept", async () => {
    privy.verify.mockRejectedValue(new Error("invalid signature"));
    const { status } = await call(privyLogin, "/api/auth/privy", { headers: bearer("forged"), body: { email: "admin@lms.com" } });
    expect(status).toBe(401);
    expect(cookieJar.has("lms_user_id")).toBe(false);
  });

  it("takes the identity from Privy, never from the request body", async () => {
    await call(privyLogin, "/api/auth/privy", { headers: bearer(), body: { email: "admin@lms.com", name: "Mallory" } });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "ada@test.com" } });
    expect(prismaMock.user.create.mock.calls[0][0].data).toMatchObject({ email: "ada@test.com", name: "Ada Obi" });
    expect(privy.verify).toHaveBeenCalledWith("good-token");
    expect(privy.getUser).toHaveBeenCalledWith("did:privy:abc");
  });

  it("creates a verified STUDENT account for a new Privy user and signs them in", async () => {
    const { status, body } = await call(privyLogin, "/api/auth/privy", { headers: bearer() });
    expect(status).toBe(200);
    expect(prismaMock.user.create.mock.calls[0][0].data).toMatchObject({ role: "STUDENT", emailVerified: true });
    expect(body.user).not.toHaveProperty("password");
    expect(verifySessionToken(cookieJar.get("lms_user_id")!.value)?.userId).toBe("privy_user");
  });

  it("signs an existing user in without creating a duplicate, keeping their role", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "tutor_9", role: "TUTOR", email: "ada@test.com" });
    prismaMock.user.update.mockResolvedValue({ id: "tutor_9", role: "TUTOR", email: "ada@test.com" });
    await call(privyLogin, "/api/auth/privy", { headers: bearer() });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(cookieJar.get("lms_user_role")!.value).toBe("TUTOR");
  });

  it("supports wallet-only users with a derived identifier", async () => {
    privy.getUser.mockResolvedValue({ wallet: { address: "0xABCDEF1234567890" } });
    await call(privyLogin, "/api/auth/privy", { headers: bearer() });
    expect(prismaMock.user.create.mock.calls[0][0].data).toMatchObject({
      email: "0xabcdef1234567890@wallet.privy",
      name: "Student 0xABCD",
    });
  });

  it("rejects Privy users that have neither an email nor a wallet", async () => {
    privy.getUser.mockResolvedValue({});
    expect((await call(privyLogin, "/api/auth/privy", { headers: bearer() })).status).toBe(400);
  });

  it("reports a configuration problem instead of silently trusting anyone", async () => {
    vi.resetModules();
    vi.stubEnv("PRIVY_APP_SECRET", "");
    const fresh = await import("@/app/api/auth/privy/route");
    const { status } = await call(fresh.POST, "/api/auth/privy", { headers: bearer() });
    expect(status).toBe(500);
    expect(cookieJar.has("lms_user_id")).toBe(false);
  });
});
