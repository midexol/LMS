import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { prismaMock, mailMock } from "../helpers/mocks";
import {
  calculateNgnAmount,
  computePaystackChargeKobo,
  generatePaymentReference,
  getPaymentConfig,
  initializeCoursePayment,
  verifyAndProcessPayment,
  verifyPaystackWebhookSignature,
  SingleCourseConflictError,
} from "@/lib/payment";

const live = () => vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_abc123");

const basePayment = {
  id: "pay_1",
  reference: "REF1",
  studentId: "stu_1",
  courseId: "course_1",
  amount: 5000,
  currency: "NGN",
  status: "PENDING",
  course: { id: "course_1", title: "Intro to Chemistry" },
  student: { email: "stu@test.com", name: "Stu" },
};

const paystackOk = (over: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({
      status: true,
      data: { status: "success", amount: 500000, currency: "NGN", paid_at: "2026-05-01T10:00:00Z", channel: "card", id: 99887, ...over },
    }),
    { status: 200 }
  );

describe("pricing helpers", () => {
  it("calculateNgnAmount rounds and floors non-positive prices to 0", () => {
    expect(calculateNgnAmount(5000)).toBe(5000);
    expect(calculateNgnAmount(1999.6)).toBe(2000);
    expect(calculateNgnAmount(0)).toBe(0);
    expect(calculateNgnAmount(-50)).toBe(0);
  });

  it("computePaystackChargeKobo: 1.5% under the threshold, +N100 above it, capped at N2,000", () => {
    expect(computePaystackChargeKobo(100_000)).toBe(1_500); // N1,000 -> 1.5%
    expect(computePaystackChargeKobo(250_000)).toBe(3_750); // exactly N2,500: no flat fee
    expect(computePaystackChargeKobo(500_000)).toBe(7_500 + 10_000); // N5,000
    expect(computePaystackChargeKobo(100_000_000)).toBe(200_000); // capped
  });

  it("generatePaymentReference is unique and well-formed", () => {
    const refs = new Set(Array.from({ length: 200 }, () => generatePaymentReference("c", "s")));
    expect(refs.size).toBe(200);
    for (const ref of refs) expect(ref).toMatch(/^PP-CRS-[0-9A-F]{6}-[0-9A-Z]+$/);
  });

  it("getPaymentConfig reads keys from the environment at call time", () => {
    expect(getPaymentConfig().secretKey).toBe("");
    vi.stubEnv("PAYSTACK_SECRET_KEY", "  sk_test_xyz  ");
    expect(getPaymentConfig().secretKey).toBe("sk_test_xyz");
    expect(getPaymentConfig()).toMatchObject({ currency: "NGN", appUrl: "https://lms.test" });
  });
});

describe("verifyPaystackWebhookSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "REF1" } });
  const sign = (secret: string, payload = body) => crypto.createHmac("sha512", secret).update(payload).digest("hex");

  it("accepts a correct HMAC-SHA512 signature", () => {
    live();
    expect(verifyPaystackWebhookSignature(body, sign("sk_test_abc123"))).toBe(true);
  });

  it("rejects a signature made with another key", () => {
    live();
    expect(verifyPaystackWebhookSignature(body, sign("sk_test_other"))).toBe(false);
  });

  it("rejects a valid signature for a different body (tampering)", () => {
    live();
    expect(verifyPaystackWebhookSignature(body + " ", sign("sk_test_abc123"))).toBe(false);
  });

  it("rejects missing, malformed or wrong-length signatures", () => {
    live();
    expect(verifyPaystackWebhookSignature(body, null)).toBe(false);
    expect(verifyPaystackWebhookSignature(body, "")).toBe(false);
    expect(verifyPaystackWebhookSignature(body, "zzzz")).toBe(false);
    expect(verifyPaystackWebhookSignature(body, "ab")).toBe(false);
  });

  it("rejects everything when no secret key is configured", () => {
    expect(verifyPaystackWebhookSignature(body, sign("anything"))).toBe(false);
  });
});

describe("initializeCoursePayment", () => {
  const params = {
    student: { id: "stu_1", email: "stu@test.com", name: "Stu" },
    course: { id: "course_1", title: "Intro to Chemistry", price: 5000 },
  };

  it("records a PENDING payment before talking to Paystack", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await initializeCoursePayment(params);
    expect(prismaMock.payment.create).toHaveBeenCalledOnce();
    expect(prismaMock.payment.create.mock.calls[0][0].data).toMatchObject({
      studentId: "stu_1",
      courseId: "course_1",
      amount: 5000,
      currency: "NGN",
      status: "PENDING",
    });
  });

  describe("with your fees switched on (N400 platform fee, student covers Paystack)", () => {
    const course20k = { id: "course_1", title: "Intro to Chemistry", price: 20000 };
    const feesOn = () => {
      vi.stubEnv("PLATFORM_FEE_NGN", "400");
      vi.stubEnv("PASS_PAYSTACK_FEE", "true");
    };

    it("charges Paystack the full total in kobo (N20,813 for a N20,000 course)", async () => {
      feesOn();
      live();
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout.paystack.com/abc", access_code: "ac" } }), { status: 200 })
      );
      vi.stubGlobal("fetch", fetchMock);

      const result = await initializeCoursePayment({ ...params, course: course20k });

      expect(JSON.parse((fetchMock.mock.calls[0][1] as any).body).amount).toBe(2_081_300);
      expect(result.amountNgn).toBe(20813);
      expect(result.breakdown).toMatchObject({ coursePriceNgn: 20000, platformFeeNgn: 400, processingFeeNgn: 413, totalNgn: 20813 });
    });

    it("saves the full amount and the breakdown with the payment, for receipts and for verification", async () => {
      feesOn();
      vi.stubEnv("NODE_ENV", "development");
      await initializeCoursePayment({ ...params, course: course20k });
      const data = prismaMock.payment.create.mock.calls[0][0].data;
      expect(data.amount).toBe(20813);
      expect(JSON.parse(data.metadata).breakdown).toMatchObject({ coursePriceNgn: 20000, platformFeeNgn: 400, processingFeeNgn: 413 });
    });

    it("free courses are never charged fees", async () => {
      feesOn();
      vi.stubEnv("NODE_ENV", "development");
      const result = await initializeCoursePayment({ ...params, course: { ...course20k, price: 0 } });
      expect(result.amountNgn).toBe(0);
      expect(prismaMock.payment.create.mock.calls[0][0].data.amount).toBe(0);
    });
  });

  it("with no fees configured behaves exactly as before: charges the course price", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = await initializeCoursePayment(params);
    expect(result.amountNgn).toBe(5000);
    expect(result.breakdown).toMatchObject({ platformFeeNgn: 0, processingFeeNgn: 0, totalNgn: 5000 });
  });

  it("calls Paystack with the amount in kobo and a callback URL on the configured domain", async () => {
    live();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { authorization_url: "https://checkout.paystack.com/abc", access_code: "ac_1" } }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await initializeCoursePayment(params);

    expect(result).toMatchObject({ success: true, isSimulation: false, authorizationUrl: "https://checkout.paystack.com/abc", amountNgn: 5000 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.paystack.co/transaction/initialize");
    expect((init as any).headers.Authorization).toBe("Bearer sk_test_abc123");
    const sent = JSON.parse((init as any).body);
    expect(sent.amount).toBe(500000);
    expect(sent.email).toBe("stu@test.com");
    expect(sent.callback_url).toBe(`https://lms.test/payment/verify?reference=${sent.reference}`);
    expect(sent.reference).toBe(result.reference);
  });

  it("in development, falls back to a simulated checkout when Paystack is not configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = await initializeCoursePayment(params);
    expect(result.isSimulation).toBe(true);
    expect(result.authorizationUrl).toContain("mode=simulated");
  });

  it("in development, falls back to simulation if Paystack rejects the request", async () => {
    vi.stubEnv("NODE_ENV", "development");
    live();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: false }), { status: 400 })));
    expect((await initializeCoursePayment(params)).isSimulation).toBe(true);
  });

  it("in production, NEVER simulates: it throws when Paystack is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(initializeCoursePayment(params)).rejects.toThrow(/not configured/i);
  });

  it("in production, NEVER simulates: it throws when Paystack is unreachable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    live();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    await expect(initializeCoursePayment(params)).rejects.toThrow(/not configured/i);
  });
});

describe("verifyAndProcessPayment", () => {
  beforeEach(() => {
    prismaMock.payment.findUnique.mockResolvedValue({ ...basePayment });
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.payment.findUniqueOrThrow.mockResolvedValue({ ...basePayment, status: "SUCCESS" });
    prismaMock.enrollment.findFirst.mockResolvedValue(null);
    prismaMock.enrollment.upsert.mockResolvedValue({ id: "enr_1", studentId: "stu_1", courseId: "course_1", status: "ACTIVE" });
  });

  it("throws for an unknown reference", async () => {
    prismaMock.payment.findUnique.mockResolvedValue(null);
    await expect(verifyAndProcessPayment("NOPE")).rejects.toThrow(/not found/);
  });

  it("confirms with Paystack, marks the payment SUCCESS, enrolls the student and emails them", async () => {
    live();
    const fetchMock = vi.fn().mockResolvedValue(paystackOk());
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyAndProcessPayment("REF1");

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.paystack.co/transaction/verify/REF1");
    expect(result).toMatchObject({ success: true, alreadyProcessed: false });
    expect(prismaMock.payment.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: "pay_1", status: { not: "SUCCESS" } },
      data: { status: "SUCCESS", channel: "card", paystackRef: "99887" },
    });
    expect(prismaMock.enrollment.upsert.mock.calls[0][0]).toMatchObject({
      where: { studentId_courseId: { studentId: "stu_1", courseId: "course_1" } },
      create: { studentId: "stu_1", courseId: "course_1", status: "ACTIVE" },
    });
    expect(mailMock.sendEnrollmentEmail).toHaveBeenCalledWith("stu@test.com", { studentName: "Stu", courseTitle: "Intro to Chemistry" });
  });

  it("accepts a payment larger than the price (overpayment is not fraud)", async () => {
    live();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(paystackOk({ amount: 900000 })));
    expect((await verifyAndProcessPayment("REF1")).success).toBe(true);
  });

  it("REJECTS an underpayment: marks the payment FAILED and does not enroll", async () => {
    live();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(paystackOk({ amount: 400000 })));

    await expect(verifyAndProcessPayment("REF1")).rejects.toThrow(/does not match/);
    expect(prismaMock.payment.update.mock.calls[0][0]).toMatchObject({ data: { status: "FAILED" } });
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    expect(mailMock.sendEnrollmentEmail).not.toHaveBeenCalled();
  });

  describe("when fees are included in the amount owed", () => {
    // the payment was started for N20,813 (N20,000 course + N400 fee + N413 Paystack)
    beforeEach(() => {
      prismaMock.payment.findUnique.mockResolvedValue({ ...basePayment, amount: 20813 });
    });

    it("accepts the full total", async () => {
      live();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(paystackOk({ amount: 2_081_300 })));
      expect((await verifyAndProcessPayment("REF1")).success).toBe(true);
      expect(prismaMock.enrollment.upsert).toHaveBeenCalled();
    });

    it("REJECTS a student who somehow paid only the bare course price (your fee would be missing)", async () => {
      live();
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(paystackOk({ amount: 2_000_000 })));
      await expect(verifyAndProcessPayment("REF1")).rejects.toThrow(/does not match/);
      expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    });

    it("is not affected by changing the fee settings after the payment was started", async () => {
      live();
      vi.stubEnv("PLATFORM_FEE_NGN", "9999"); // fee raised while the student was on Paystack's page
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(paystackOk({ amount: 2_081_300 })));
      expect((await verifyAndProcessPayment("REF1")).success).toBe(true);
    });
  });

  it("REJECTS a payment in the wrong currency", async () => {
    live();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(paystackOk({ currency: "USD" })));
    await expect(verifyAndProcessPayment("REF1")).rejects.toThrow(/does not match/);
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
  });

  it("does not enroll when Paystack says the charge was not successful", async () => {
    live();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: true, data: { status: "abandoned" }, message: "Transaction abandoned" }), { status: 200 })
    ));
    await expect(verifyAndProcessPayment("REF1")).rejects.toThrow(/abandoned/i);
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
  });

  it("does not enroll when Paystack cannot be reached", async () => {
    live();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    await expect(verifyAndProcessPayment("REF1")).rejects.toThrow();
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
  });

  it("single-course lock: payment is kept SUCCESS but the student is NOT enrolled in a second course", async () => {
    live();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(paystackOk()));
    prismaMock.enrollment.findFirst.mockResolvedValue({ id: "enr_other", course: { title: "Other Course" } });

    await expect(verifyAndProcessPayment("REF1")).rejects.toBeInstanceOf(SingleCourseConflictError);
    expect(prismaMock.payment.updateMany).toHaveBeenCalled(); // money was received: needs refund/transfer
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    expect(mailMock.sendEnrollmentEmail).not.toHaveBeenCalled();
  });

  it("returns early without double-enrolling when a concurrent request already claimed the payment", async () => {
    live();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(paystackOk()));
    prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });

    const result = await verifyAndProcessPayment("REF1");
    expect(result).toMatchObject({ success: true, alreadyProcessed: true, enrollment: null });
    expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    expect(mailMock.sendEnrollmentEmail).not.toHaveBeenCalled();
  });

  describe("already-successful payments", () => {
    beforeEach(() => {
      prismaMock.payment.findUnique.mockResolvedValue({ ...basePayment, status: "SUCCESS" });
    });

    it("is idempotent: returns the existing enrollment without calling Paystack again", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr_1" });

      const result = await verifyAndProcessPayment("REF1");
      expect(result).toMatchObject({ alreadyProcessed: true, enrollment: { id: "enr_1" } });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mailMock.sendEnrollmentEmail).not.toHaveBeenCalled();
    });

    it("reports the single-course conflict when a paid student has no enrollment because of the lock", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue(null);
      prismaMock.enrollment.findFirst.mockResolvedValue({ id: "enr_other" });
      await expect(verifyAndProcessPayment("REF1")).rejects.toBeInstanceOf(SingleCourseConflictError);
    });

    it("waits briefly for a racing request to finish enrolling before answering", async () => {
      vi.useFakeTimers();
      prismaMock.enrollment.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "enr_late" });
      prismaMock.enrollment.findFirst.mockResolvedValue(null);

      const pending = verifyAndProcessPayment("REF1");
      await vi.advanceTimersByTimeAsync(1600);
      expect(await pending).toMatchObject({ alreadyProcessed: true, enrollment: { id: "enr_late" } });
    });
  });

  describe("simulated payments (development only)", () => {
    it("are blocked in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await expect(verifyAndProcessPayment("REF1", true)).rejects.toThrow(/strictly disabled/);
      expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    });

    it("are blocked whenever a live Paystack key exists, even outside production", async () => {
      live();
      await expect(verifyAndProcessPayment("REF1", true)).rejects.toThrow(/strictly disabled/);
      expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    });

    it("work in development with no Paystack key", async () => {
      vi.stubEnv("NODE_ENV", "development");
      expect((await verifyAndProcessPayment("REF1", true)).success).toBe(true);
      expect(prismaMock.enrollment.upsert).toHaveBeenCalled();
    });

    it("cannot be faked by simply not asking for simulation when nothing is configured", async () => {
      await expect(verifyAndProcessPayment("REF1", false)).rejects.toThrow(/not configured/);
      expect(prismaMock.enrollment.upsert).not.toHaveBeenCalled();
    });
  });
});
