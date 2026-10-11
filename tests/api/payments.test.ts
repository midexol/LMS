import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { prismaMock, mailMock } from "../helpers/mocks";
import { call, loginAs, makeRequest } from "../helpers/http";

vi.mock("@/lib/payment", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payment")>();
  return {
    ...actual, // keeps the real signature check and SingleCourseConflictError
    initializeCoursePayment: vi.fn(),
    verifyAndProcessPayment: vi.fn(),
  };
});

import { initializeCoursePayment, verifyAndProcessPayment, SingleCourseConflictError } from "@/lib/payment";
import { POST as initialize } from "@/app/api/payment/initialize/route";
import { GET as verifyGet, POST as verifyPost } from "@/app/api/payment/verify/route";
import { POST as webhook } from "@/app/api/payment/webhook/route";

const course = (over: Record<string, unknown> = {}) => ({
  id: "course_1",
  title: "Biology 101",
  price: 15000,
  published: true,
  department: null,
  ...over,
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(initializeCoursePayment).mockReset();
  vi.mocked(verifyAndProcessPayment).mockReset();
});

/* ───────────────────────────── start a payment ───────────────────────────── */
describe("POST /api/payment/initialize", () => {
  const start = (body: unknown = { courseId: "course_1" }, extra: Record<string, unknown> = {}) =>
    call(initialize, "/api/payment/initialize", { body, ...extra });

  beforeEach(() => {
    loginAs("STUDENT", { emailVerified: true });
    prismaMock.course.findUnique.mockResolvedValue(course());
    prismaMock.enrollment.findUnique.mockResolvedValue(null);
    prismaMock.enrollment.findFirst.mockResolvedValue(null);
    vi.mocked(initializeCoursePayment).mockResolvedValue({
      success: true,
      reference: "PP-CRS-ABC-1",
      amountNgn: 15000,
      breakdown: { coursePriceNgn: 15000, platformFeeNgn: 0, processingFeeNgn: 0, totalNgn: 15000, platformFeeLabel: "Platform service fee" },
      authorizationUrl: "https://checkout.paystack.com/xyz",
      isSimulation: false,
    });
  });

  it("requires login", async () => {
    loginAs(null);
    expect((await start()).status).toBe(401);
  });

  it("is for students only", async () => {
    for (const role of ["TUTOR", "ADMIN", "SUPERADMIN"] as const) {
      loginAs(role);
      expect((await start()).status).toBe(403);
    }
    expect(initializeCoursePayment).not.toHaveBeenCalled();
  });

  it("requires a verified email before taking money", async () => {
    loginAs("STUDENT", { emailVerified: false });
    const { status, body } = await start();
    expect(status).toBe(403);
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
    expect(initializeCoursePayment).not.toHaveBeenCalled();
  });

  it("validates the course id and that the course exists and is published", async () => {
    expect((await start({})).status).toBe(400);
    prismaMock.course.findUnique.mockResolvedValue(null);
    expect((await start()).status).toBe(404);
    prismaMock.course.findUnique.mockResolvedValue(course({ published: false }));
    const { status, body } = await start();
    expect(status).toBe(400);
    expect(body.error).toMatch(/not currently open/);
  });

  it("enforces department restrictions", async () => {
    loginAs("STUDENT", { department: "Physics" });
    prismaMock.course.findUnique.mockResolvedValue(course({ department: "Chemistry" }));
    const { status, body } = await start();
    expect(status).toBe(403);
    expect(body.error).toMatch(/Chemistry/);
  });

  it("allows a student with no department, and a course with no department restriction", async () => {
    loginAs("STUDENT", { department: null });
    prismaMock.course.findUnique.mockResolvedValue(course({ department: "Chemistry" }));
    expect((await start()).status).toBe(200);
    loginAs("STUDENT", { department: "Physics" });
    prismaMock.course.findUnique.mockResolvedValue(course({ department: null }));
    expect((await start()).status).toBe(200);
  });

  it("refuses to enroll twice in the same course, active or completed", async () => {
    prismaMock.enrollment.findUnique.mockResolvedValue({ status: "ACTIVE" });
    expect((await start()).body.error).toMatch(/already actively enrolled/);
    prismaMock.enrollment.findUnique.mockResolvedValue({ status: "COMPLETED" });
    expect((await start()).body.error).toMatch(/already completed/);
  });

  it("enforces the single-course lock BEFORE any payment is created", async () => {
    prismaMock.enrollment.findFirst.mockResolvedValue({ course: { title: "Chemistry 101" } });
    const { status, body } = await start();
    expect(status).toBe(403);
    expect(body.error).toMatch(/Single Course Lock.*Chemistry 101/);
    expect(initializeCoursePayment).not.toHaveBeenCalled();
  });

  it("starts a Paystack checkout for a paid course and returns the redirect", async () => {
    const student = loginAs("STUDENT", { emailVerified: true, name: "Stu", email: "stu@test.com" })!;
    const { status, body } = await start();
    expect(status).toBe(200);
    expect(body.authorizationUrl).toBe("https://checkout.paystack.com/xyz");
    expect(initializeCoursePayment).toHaveBeenCalledWith({
      student: { id: student.id, email: "stu@test.com", name: "Stu" },
      course: { id: "course_1", title: "Biology 101", price: 15000 },
      provider: "PAYSTACK",
    });
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled(); // only paying enrolls
  });

  it("never takes the callback domain from the request", async () => {
    await start({ courseId: "course_1" }, { headers: { host: "evil.example", origin: "https://evil.example" } });
    expect(JSON.stringify(vi.mocked(initializeCoursePayment).mock.calls[0][0])).not.toContain("evil");
  });

  it("enrolls into a FREE course directly, without calling Paystack, and emails the student", async () => {
    const student = loginAs("STUDENT", { emailVerified: true })!;
    prismaMock.course.findUnique.mockResolvedValue(course({ price: 0 }));
    prismaMock.enrollment.upsert.mockResolvedValue({});
    const { status, body } = await start();

    expect(status).toBe(200);
    expect(body).toEqual({ success: true, free: true, courseId: "course_1" });
    expect(initializeCoursePayment).not.toHaveBeenCalled();
    expect(prismaMock.enrollment.upsert.mock.calls[0][0]).toMatchObject({
      where: { studentId_courseId: { studentId: student.id, courseId: "course_1" } },
      create: { status: "ACTIVE" },
    });
    expect(mailMock.sendEnrollmentEmail).toHaveBeenCalledWith(student.email, { studentName: student.name, courseTitle: "Biology 101" });
  });

  it("the free-course path still respects the single-course lock", async () => {
    prismaMock.course.findUnique.mockResolvedValue(course({ price: 0 }));
    prismaMock.enrollment.findFirst.mockResolvedValue({ course: { title: "Other" } });
    expect((await start()).status).toBe(403);
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
  });

  it("rate limits payment attempts (10 per 5 minutes per IP)", async () => {
    const ip = "198.51.100.200";
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await start({}, { ip })).status);
    expect(statuses[10]).toBe(429);
  });

  it("surfaces a gateway failure as a generic server error", async () => {
    vi.mocked(initializeCoursePayment).mockRejectedValue(new Error("PAYSTACK_SECRET sk_live_abcdef leaked"));
    const { status, body } = await start();
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("sk_live");
  });
});

/* ───────────────────────────── confirm a payment ───────────────────────────── */
describe("/api/payment/verify", () => {
  const result = (over: Record<string, unknown> = {}) => ({
    success: true,
    alreadyProcessed: false,
    payment: {},
    enrollment: { id: "enr_1" },
    course: { id: "course_1", title: "Biology 101" },
    ...over,
  });

  beforeEach(() => {
    vi.mocked(verifyAndProcessPayment).mockResolvedValue(result() as any);
  });

  it("GET confirms using the reference Paystack puts in the callback URL (also accepts trxref)", async () => {
    const a = await call(verifyGet, "/api/payment/verify?reference=REF1", { method: "GET" });
    expect(a.status).toBe(200);
    expect(a.body).toMatchObject({ success: true, courseId: "course_1", courseTitle: "Biology 101" });
    expect(verifyAndProcessPayment).toHaveBeenLastCalledWith("REF1", false);

    await call(verifyGet, "/api/payment/verify?trxref=REF2", { method: "GET" });
    expect(verifyAndProcessPayment).toHaveBeenLastCalledWith("REF2", false);
  });

  it("GET passes the simulation flag only when mode=simulated", async () => {
    await call(verifyGet, "/api/payment/verify?reference=REF1&mode=simulated", { method: "GET" });
    expect(verifyAndProcessPayment).toHaveBeenLastCalledWith("REF1", true);
  });

  it("POST works with a JSON body", async () => {
    const { status, body } = await call(verifyPost, "/api/payment/verify", { body: { reference: "REF9", isSimulation: false } });
    expect(status).toBe(200);
    expect(body.enrollment).toEqual({ id: "enr_1" });
    expect(verifyAndProcessPayment).toHaveBeenLastCalledWith("REF9", false);
  });

  it("requires a reference", async () => {
    expect((await call(verifyGet, "/api/payment/verify", { method: "GET" })).status).toBe(400);
    expect((await call(verifyPost, "/api/payment/verify", { body: {} })).status).toBe(400);
    expect(verifyAndProcessPayment).not.toHaveBeenCalled();
  });

  it("reports the single-course conflict as 409 with a machine-readable code", async () => {
    vi.mocked(verifyAndProcessPayment).mockRejectedValue(new SingleCourseConflictError());
    for (const r of [
      await call(verifyGet, "/api/payment/verify?reference=R", { method: "GET" }),
      await call(verifyPost, "/api/payment/verify", { body: { reference: "R" } }),
    ]) {
      expect(r.status).toBe(409);
      expect(r.body.code).toBe("SINGLE_COURSE_CONFLICT");
      expect(r.body.error).toMatch(/refund or course transfer/);
    }
  });

  it("returns other verification failures as 400 with the reason", async () => {
    vi.mocked(verifyAndProcessPayment).mockRejectedValue(new Error("Paid amount does not match the course price."));
    const { status, body } = await call(verifyPost, "/api/payment/verify", { body: { reference: "R" } });
    expect(status).toBe(400);
    expect(body.error).toMatch(/does not match/);
  });

  it("rate limits verification (15 per 5 minutes per IP)", async () => {
    const ip = "198.51.100.201";
    const statuses = [];
    for (let i = 0; i < 16; i++) statuses.push((await call(verifyPost, "/api/payment/verify", { body: {}, ip })).status);
    expect(statuses[15]).toBe(429);
  });
});

/* ───────────────────────────── Paystack webhook ───────────────────────────── */
describe("POST /api/payment/webhook", () => {
  const SECRET = "sk_test_webhook_secret";
  const sign = (raw: string, secret = SECRET) => crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const event = (name = "charge.success", reference: string | null = "REF1") =>
    JSON.stringify({ event: name, data: { reference } });

  const send = (raw: string, signature?: string | null) =>
    webhook(
      new Request("http://localhost/api/payment/webhook", {
        method: "POST",
        body: raw,
        headers: signature ? { "x-paystack-signature": signature } : {},
      })
    );

  beforeEach(() => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
    vi.mocked(verifyAndProcessPayment).mockResolvedValue({} as any);
  });

  it("processes a correctly signed charge.success", async () => {
    const raw = event();
    const res = await send(raw, sign(raw));
    expect(res.status).toBe(200);
    expect(verifyAndProcessPayment).toHaveBeenCalledWith("REF1", false);
  });

  it("rejects a forged signature and does nothing", async () => {
    const raw = event();
    const res = await send(raw, sign(raw, "attacker-key"));
    expect(res.status).toBe(401);
    expect(verifyAndProcessPayment).not.toHaveBeenCalled();
  });

  it("rejects a body that was changed after signing", async () => {
    const signed = sign(event("charge.success", "REF1"));
    const res = await send(event("charge.success", "REF-OTHER"), signed);
    expect(res.status).toBe(401);
    expect(verifyAndProcessPayment).not.toHaveBeenCalled();
  });

  it("rejects an unsigned request when a secret is configured", async () => {
    expect((await send(event(), null)).status).toBe(401);
    expect(verifyAndProcessPayment).not.toHaveBeenCalled();
  });

  it("in production, refuses unsigned requests and refuses to run without a secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await send(event(), null)).status).toBe(401);

    vi.stubEnv("PAYSTACK_SECRET_KEY", "");
    const raw = event();
    expect((await send(raw, sign(raw))).status).toBe(401);
    expect(verifyAndProcessPayment).not.toHaveBeenCalled();
  });

  it("acknowledges but ignores other event types", async () => {
    const raw = event("transfer.success");
    expect((await send(raw, sign(raw))).status).toBe(200);
    expect(verifyAndProcessPayment).not.toHaveBeenCalled();
  });

  it("ignores a charge.success with no reference", async () => {
    const raw = event("charge.success", null);
    expect((await send(raw, sign(raw))).status).toBe(200);
    expect(verifyAndProcessPayment).not.toHaveBeenCalled();
  });

  it("answers 200 even when processing fails, so Paystack does not retry a payment we rejected", async () => {
    vi.mocked(verifyAndProcessPayment).mockRejectedValue(new Error("amount mismatch"));
    const raw = event();
    expect((await send(raw, sign(raw))).status).toBe(200);
  });

  it("returns 500 for a signed but unparseable body, without leaking details", async () => {
    const raw = "{not json";
    const res = await send(raw, sign(raw));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/Unexpected token|JSON/);
  });

  it("redelivery of the same event is safe (processing is idempotent)", async () => {
    const raw = event();
    await send(raw, sign(raw));
    await send(raw, sign(raw));
    expect(verifyAndProcessPayment).toHaveBeenCalledTimes(2);
    expect(vi.mocked(verifyAndProcessPayment).mock.calls[0]).toEqual(vi.mocked(verifyAndProcessPayment).mock.calls[1]);
  });
});

it("makeRequest helper builds JSON requests", () => {
  const r = makeRequest("/x", { body: { a: 1 } });
  expect(r.method).toBe("POST");
  expect(r.headers.get("content-type")).toBe("application/json");
});
