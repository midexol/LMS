import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { prismaMock, cookieJar } from "../helpers/mocks";
import { call } from "../helpers/http";

/* Fake Google verifier: tests decide what a given ID token proves. */
const google = vi.hoisted(() => ({ verify: vi.fn(), constructedWith: [] as string[] }));
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    constructor(clientId: string) {
      google.constructedWith.push(clientId);
    }
    verifyIdToken = google.verify;
  },
}));

import { POST as googleSignIn } from "@/app/api/auth/google/route";
import { verifySessionToken } from "@/lib/auth";
import { ACADEMIC_STRUCTURE } from "@/lib/academicStructure";

const CLIENT_ID = "1234-abc.apps.googleusercontent.com";
const TOKEN = "a".repeat(60);

const proves = (payload: Record<string, unknown>) =>
  google.verify.mockResolvedValue({ getPayload: () => ({ email: "Ada@Gmail.com", email_verified: true, name: "Ada Obi", ...payload }) });

const signIn = (body: unknown = { credential: TOKEN }, ip?: string) => call(googleSignIn, "/api/auth/google", { body, ip });

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", CLIENT_ID);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  google.verify.mockReset();
  proves({});
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockImplementation(async ({ data }: any) => ({ id: "g_user_1", ...data }));
  prismaMock.user.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, role: "STUDENT", email: "ada@gmail.com", ...data }));
});

describe("POST /api/auth/google (Sign in with Google)", () => {
  describe("refusing bad requests", () => {
    it("says it is not set up when no Google client id is configured", async () => {
      vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "");
      const { status } = await signIn();
      expect(status).toBe(503);
      expect(google.verify).not.toHaveBeenCalled();
      expect(cookieJar.has("lms_user_id")).toBe(false);
    });

    it("needs a credential", async () => {
      for (const body of [{}, { credential: 42 }, { credential: "short" }]) {
        expect((await signIn(body)).status).toBe(400);
      }
      expect(google.verify).not.toHaveBeenCalled();
    });

    it("rejects a token Google does not vouch for (forged, expired or for another app)", async () => {
      google.verify.mockRejectedValue(new Error("Wrong recipient, payload audience != requiredAudience"));
      const { status } = await signIn();
      expect(status).toBe(401);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(cookieJar.has("lms_user_id")).toBe(false);
    });

    it("rejects accounts whose email Google has not verified", async () => {
      proves({ email_verified: false });
      expect((await signIn()).status).toBe(401);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it("rejects a token with no email", async () => {
      proves({ email: undefined });
      expect((await signIn()).status).toBe(401);
    });

    it("is rate limited (10 attempts a minute per IP)", async () => {
      const ip = "198.51.100.140";
      const statuses = [];
      for (let i = 0; i < 11; i++) statuses.push((await signIn({}, ip)).status);
      expect(statuses[10]).toBe(429);
    });
  });

  describe("identity comes only from Google's verified token", () => {
    it("verifies the token against OUR client id", async () => {
      await signIn();
      expect(google.verify).toHaveBeenCalledWith({ idToken: TOKEN, audience: CLIENT_ID });
    });

    it("ignores any email or name the browser sends alongside the token", async () => {
      await signIn({ credential: TOKEN, email: "admin@lms.com", name: "Mallory", role: "ADMIN" });
      const data = prismaMock.user.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ email: "ada@gmail.com", name: "Ada Obi", role: "STUDENT" });
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "ada@gmail.com" } });
    });
  });

  describe("a brand-new Google user", () => {
    it("gets a verified STUDENT account with a lowercase email, and is signed in", async () => {
      const { status, body } = await signIn();
      expect(status).toBe(200);

      const data = prismaMock.user.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ name: "Ada Obi", email: "ada@gmail.com", role: "STUDENT", emailVerified: true });
      expect(data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(data.lastLoginAt).toBeInstanceOf(Date);

      expect(verifySessionToken(cookieJar.get("lms_user_id")!.value)?.userId).toBe("g_user_1");
      expect(cookieJar.options("lms_user_id")).toMatchObject({ httpOnly: true, sameSite: "lax", maxAge: 604800 });
      expect(cookieJar.get("lms_user_role")!.value).toBe("STUDENT");
      expect(body.user).not.toHaveProperty("password");
    });

    it("has an unusable random password (nobody, including the student, knows it)", async () => {
      await signIn();
      const stored = prismaMock.user.create.mock.calls[0][0].data.password;
      expect(stored.startsWith("$2")).toBe(true);
      expect(await bcrypt.compare("password", stored)).toBe(false);
    });

    it("must still choose a faculty and department: the response says so", async () => {
      const { body } = await signIn();
      expect(body.needsProfile).toBe(true);
    });

    it("falls back to the part of the email before the @ when Google gives no name", async () => {
      proves({ name: undefined, email: "chidi.okafor@gmail.com" });
      await signIn();
      expect(prismaMock.user.create.mock.calls[0][0].data.name).toBe("chidi.okafor");
    });
  });

  describe("someone who already has an account", () => {
    const existing = (over: Record<string, unknown> = {}) => ({
      id: "stu_9",
      role: "STUDENT",
      email: "ada@gmail.com",
      emailVerified: true,
      faculty: ACADEMIC_STRUCTURE[0].name,
      department: ACADEMIC_STRUCTURE[0].departments[0],
      ...over,
    });

    // like the real database, an update returns the whole stored row, not just the changed fields
    const stored = (row: Record<string, unknown>) =>
      prismaMock.user.update.mockImplementation(async ({ data }: any) => ({ ...row, ...data }));

    it("signs them in to the same account, with no duplicate", async () => {
      prismaMock.user.findUnique.mockResolvedValue(existing());
      stored(existing());
      const { status, body } = await signIn();
      expect(status).toBe(200);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(verifySessionToken(cookieJar.get("lms_user_id")!.value)?.userId).toBe("stu_9");
      expect(prismaMock.user.update.mock.calls[0][0].data.lastLoginAt).toBeInstanceOf(Date);
      expect(body.needsProfile).toBe(false); // they already chose a faculty and department
    });

    it("asks for a faculty or department that is still missing", async () => {
      prismaMock.user.findUnique.mockResolvedValue(existing({ department: null }));
      stored(existing({ department: null }));
      expect((await signIn()).body.needsProfile).toBe(true);
      prismaMock.user.findUnique.mockResolvedValue(existing({ faculty: null }));
      stored(existing({ faculty: null }));
      expect((await signIn()).body.needsProfile).toBe(true);
    });

    it("an unverified email account becomes verified, because Google proved they own the address", async () => {
      prismaMock.user.findUnique.mockResolvedValue(existing({ emailVerified: false }));
      stored(existing({ emailVerified: false }));
      await signIn();
      const data = prismaMock.user.update.mock.calls[0][0].data;
      expect(data.emailVerified).toBe(true);
      expect(data.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it("an already verified account is not touched beyond the login time", async () => {
      prismaMock.user.findUnique.mockResolvedValue(existing());
      stored(existing());
      await signIn();
      expect(Object.keys(prismaMock.user.update.mock.calls[0][0].data)).toEqual(["lastLoginAt"]);
    });

    it("keeps the role: an instructor who signs in with Google stays an instructor, and is never asked for a faculty", async () => {
      prismaMock.user.findUnique.mockResolvedValue(existing({ id: "tut_1", role: "TUTOR", faculty: null, department: null }));
      stored(existing({ id: "tut_1", role: "TUTOR", faculty: null, department: null }));
      const { body } = await signIn();
      expect(cookieJar.get("lms_user_role")!.value).toBe("TUTOR");
      expect(body.needsProfile).toBe(false);
    });

    it("never creates an admin through Google: a new account is always a STUDENT", async () => {
      await signIn({ credential: TOKEN, role: "SUPERADMIN" });
      expect(prismaMock.user.create.mock.calls[0][0].data.role).toBe("STUDENT");
    });
  });

  it("hides internal errors behind a generic message", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("connection to 10.0.0.5 refused"));
    const { status, body } = await signIn();
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("10.0.0.5");
  });
});
