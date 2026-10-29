import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prismaMock, cookieJar } from "../helpers/mocks";
import { call, loginAs } from "../helpers/http";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as setup } from "@/app/api/auth/2fa/setup/route";
import { POST as enable } from "@/app/api/auth/2fa/enable/route";
import { POST as disable } from "@/app/api/auth/2fa/disable/route";
import { verifySessionToken } from "@/lib/auth";
import { decryptSecret, encryptSecret, generateBackupCodes, generateSecret, totpCode } from "@/lib/totp";

let passwordHash: string;
beforeEach(async () => {
  passwordHash ??= await bcrypt.hash("correct-horse", 4);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

/** An admin whose account has two-step sign-in on, with the secret and backup codes it would have stored. */
let adminCounter = 0;
function adminWithTwoStep(over: Record<string, unknown> = {}) {
  adminCounter += 1; // a fresh account each time, so one test's code attempts never count against another's
  const secret = generateSecret();
  const backup = generateBackupCodes();
  const user = {
    id: `admin_2fa_${adminCounter}`, name: "Boss", email: "boss@test.com", role: "ADMIN", password: passwordHash,
    emailVerified: true, createdAt: new Date(),
    totpEnabled: true, totpSecret: encryptSecret(secret), totpLastStep: null, totpBackupCodes: JSON.stringify(backup.hashes),
    ...over,
  };
  return { user, secret, backup };
}

describe("sign-in for an account with two-step sign-in on", () => {
  const post = (body: unknown) => call(login, "/api/auth/login", { body });

  it("a correct password alone is not enough: it asks for the code and starts no session", async () => {
    const { user } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);
    const { status, body } = await post({ email: "boss@test.com", password: "correct-horse" });

    expect(status).toBe(401);
    expect(body.code).toBe("TOTP_REQUIRED");
    expect(body).not.toHaveProperty("user");
    expect(cookieJar.get("lms_user_id")).toBeUndefined();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("signs in with the right password and the current code, and remembers the code was used", async () => {
    const { user, secret } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);
    const { status, body } = await post({ email: "boss@test.com", password: "correct-horse", code: totpCode(secret) });

    expect(status).toBe(200);
    expect(body.user.role).toBe("ADMIN");
    expect(verifySessionToken(cookieJar.get("lms_user_id")!.value)?.userId).toBe(user.id);
    expect(prismaMock.user.update.mock.calls[0][0].data.totpLastStep).toBeTypeOf("number");
  });

  it("refuses a wrong code, and never starts a session for it", async () => {
    const { user, secret } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);
    const wrong = totpCode(secret) === "000000" ? "111111" : "000000";
    const { status, body } = await post({ email: "boss@test.com", password: "correct-horse", code: wrong });

    expect(status).toBe(401);
    expect(body.code).toBe("TOTP_INVALID");
    expect(cookieJar.get("lms_user_id")).toBeUndefined();
  });

  it("refuses a code that was already used (no replaying one that was seen or shoulder-surfed)", async () => {
    const { user, secret } = adminWithTwoStep();
    const code = totpCode(secret);
    prismaMock.user.findUnique.mockResolvedValue(user);
    await post({ email: "boss@test.com", password: "correct-horse", code });
    const usedStep = prismaMock.user.update.mock.calls[0][0].data.totpLastStep;

    prismaMock.user.findUnique.mockResolvedValue({ ...user, totpLastStep: usedStep });
    const again = await post({ email: "boss@test.com", password: "correct-horse", code });
    expect(again.status).toBe(401);
  });

  it("accepts a backup code once, then it is gone", async () => {
    const { user, backup } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);
    const first = await post({ email: "boss@test.com", password: "correct-horse", code: backup.plain[2] });
    expect(first.status).toBe(200);
    const left = JSON.parse(prismaMock.user.update.mock.calls[0][0].data.totpBackupCodes);
    expect(left).toHaveLength(7);

    prismaMock.user.findUnique.mockResolvedValue({ ...user, totpBackupCodes: JSON.stringify(left) });
    const again = await post({ email: "boss@test.com", password: "correct-horse", code: backup.plain[2] });
    expect(again.status).toBe(401);
  });

  it("a wrong password is refused before any code is even asked for", async () => {
    const { user } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);
    const { status, body } = await post({ email: "boss@test.com", password: "nope", code: "123456" });
    expect(status).toBe(401);
    expect(body.code).toBeUndefined();
  });

  it("limits code guessing per account, however many networks the guesses come from", async () => {
    const { user, secret } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);
    const wrong = totpCode(secret) === "000000" ? "111111" : "000000";
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await post({ email: "boss@test.com", password: "correct-horse", code: wrong })).status);
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429, 429]);
  });

  it("accounts without two-step sign-in are unaffected", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "s1", name: "Ada", email: "ada@test.com", role: "STUDENT", password: passwordHash, emailVerified: true, totpEnabled: false, totpSecret: null, createdAt: new Date() });
    const { status } = await post({ email: "ada@test.com", password: "correct-horse" });
    expect(status).toBe(200);
  });
});

describe("turning two-step sign-in on", () => {
  it("every step needs a signed-in user", async () => {
    loginAs(null);
    for (const route of [setup, enable, disable]) {
      expect((await call(route, "/api/auth/2fa/x", { body: {} })).status).toBe(401);
    }
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("setup makes a secret, stores it encrypted and NOT yet active, and hands it to the user once", async () => {
    loginAs("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue({ totpEnabled: false });
    const { status, body } = await call(setup, "/api/auth/2fa/setup", { body: {} });

    expect(status).toBe(200);
    expect(body.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(body.otpauthUrl).toContain(`secret=${body.secret}`);
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data.totpEnabled).toBe(false);
    expect(data.totpSecret).not.toContain(body.secret);
    expect(decryptSecret(data.totpSecret)).toBe(body.secret);
  });

  it("setup refuses when it is already on", async () => {
    loginAs("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue({ totpEnabled: true });
    expect((await call(setup, "/api/auth/2fa/setup", { body: {} })).status).toBe(400);
  });

  it("enable needs a started setup and a correct code", async () => {
    loginAs("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue({ totpSecret: null, totpEnabled: false });
    expect((await call(enable, "/api/auth/2fa/enable", { body: { code: "123456" } })).status).toBe(400);

    const secret = generateSecret();
    prismaMock.user.findUnique.mockResolvedValue({ totpSecret: encryptSecret(secret), totpEnabled: false });
    const wrong = totpCode(secret) === "000000" ? "111111" : "000000";
    expect((await call(enable, "/api/auth/2fa/enable", { body: { code: wrong } })).status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("with the right code it switches on, and shows 8 backup codes once while storing only their hashes", async () => {
    loginAs("ADMIN");
    const secret = generateSecret();
    prismaMock.user.findUnique.mockResolvedValue({ totpSecret: encryptSecret(secret), totpEnabled: false });
    const { status, body } = await call(enable, "/api/auth/2fa/enable", { body: { code: totpCode(secret) } });

    expect(status).toBe(200);
    expect(body.backupCodes).toHaveLength(8);
    const data = prismaMock.user.update.mock.calls[0][0].data;
    expect(data.totpEnabled).toBe(true);
    expect(data.totpLastStep).toBeTypeOf("number");
    const stored = JSON.parse(data.totpBackupCodes);
    expect(stored).toHaveLength(8);
    for (const code of body.backupCodes) expect(data.totpBackupCodes).not.toContain(code.replace("-", ""));
  });
});

describe("turning two-step sign-in off", () => {
  const off = (body: unknown) => call(disable, "/api/auth/2fa/disable", { body });

  it("needs BOTH the password and a code: either one alone is refused", async () => {
    loginAs("ADMIN");
    const { user, secret } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);

    expect((await off({ password: "correct-horse", code: "000000" })).status).toBe(403);
    expect((await off({ password: "wrong", code: totpCode(secret) })).status).toBe(403);
    expect((await off({ code: totpCode(secret) })).status).toBe(403);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("with the password and a current code it clears everything", async () => {
    loginAs("ADMIN");
    const { user, secret } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);
    expect((await off({ password: "correct-horse", code: totpCode(secret) })).status).toBe(200);
    expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({ totpEnabled: false, totpSecret: null, totpLastStep: null, totpBackupCodes: null });
  });

  it("a backup code works too, for someone who lost their phone", async () => {
    loginAs("ADMIN");
    const { user, backup } = adminWithTwoStep();
    prismaMock.user.findUnique.mockResolvedValue(user);
    expect((await off({ password: "correct-horse", code: backup.plain[0] })).status).toBe(200);
  });

  it("refuses when it is not on", async () => {
    loginAs("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue({ totpEnabled: false, totpSecret: null, password: passwordHash });
    expect((await off({ password: "correct-horse", code: "123456" })).status).toBe(400);
  });
});
