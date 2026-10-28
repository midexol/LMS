import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { prismaMock, mailMock, cookieJar } from "../helpers/mocks";
import { call } from "../helpers/http";
import { POST as signup } from "@/app/api/auth/instructor-signup/route";
import { verifySessionToken } from "@/lib/auth";

const KEY = "a-long-private-key-1234567890";
const valid = {
  key: KEY,
  name: "Dr Ade Bello",
  email: "Ade@Test.com ",
  password: "long-enough-pw",
  faculty: "Business Studies",
  department: "Marketing",
};

beforeEach(() => {
  vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", KEY);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockImplementation(async ({ data }: any) => ({ id: "tutor_new", createdAt: new Date(), ...data }));
});
afterEach(() => vi.unstubAllEnvs());

const post = (body: unknown) => call(signup, "/api/auth/instructor-signup", { body });

describe("POST /api/auth/instructor-signup (private link)", () => {
  it("creates an INSTRUCTOR account for someone with the key, signs them in and never returns secrets", async () => {
    const { status, body } = await post(valid);

    expect(status).toBe(200);
    const data = prismaMock.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ name: "Dr Ade Bello", email: "ade@test.com", role: "TUTOR", faculty: "Business Studies", department: "Marketing", emailVerified: false });
    expect(await bcrypt.compare("long-enough-pw", data.password)).toBe(true);
    expect(body.user).toMatchObject({ role: "TUTOR", email: "ade@test.com" });
    for (const secret of ["password", "verificationToken", "verificationTokenExpiry", "resetToken"]) {
      expect(body.user).not.toHaveProperty(secret);
    }
    expect(verifySessionToken(cookieJar.get("lms_user_id")!.value)?.userId).toBe("tutor_new");
    expect(cookieJar.get("lms_user_role")!.value).toBe("TUTOR");
    expect(mailMock.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("is refused, and creates nothing, with a wrong or missing key", async () => {
    for (const key of ["wrong-key", "", undefined]) {
      const { status, body } = await post({ ...valid, key });
      expect(status).toBe(403);
      expect(body.error).toMatch(/not valid/);
    }
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("is switched off for everyone when no key is configured", async () => {
    vi.stubEnv("INSTRUCTOR_SIGNUP_KEY", "");
    expect((await post({ ...valid, key: "" })).status).toBe(403);
    expect((await post(valid)).status).toBe(403);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("can only ever create an instructor, whatever the request claims", async () => {
    await post({ ...valid, role: "ADMIN" });
    expect(prismaMock.user.create.mock.calls[0][0].data.role).toBe("TUTOR");
  });

  it("checks the details: name, email, an 8-character password, and a real school and department", async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ["name", { name: "A" }],
      ["email", { email: "not-an-email" }],
      ["password", { password: "short" }],
      ["school", { faculty: "Made-up School" }],
      ["department", { department: "Not A Department" }],
    ];
    for (const [label, change] of cases) {
      const { status } = await post({ ...valid, ...change });
      expect(status, label).toBe(400);
    }
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("does not take over an existing account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" });
    const { status, body } = await post(valid);
    expect(status).toBe(400);
    expect(body.error).toMatch(/already exists/);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("still creates the account if the verification email cannot be sent", async () => {
    mailMock.sendVerificationEmail.mockRejectedValue(new Error("smtp down"));
    expect((await post(valid)).status).toBe(200);
  });

  it("rate limits attempts, wrong keys included", async () => {
    const ip = "203.0.113.77";
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      statuses.push((await call(signup, "/api/auth/instructor-signup", { body: { ...valid, key: "wrong" }, ip })).status);
    }
    expect(statuses).toEqual([403, 403, 403, 403, 403, 429, 429]);
  });
});
