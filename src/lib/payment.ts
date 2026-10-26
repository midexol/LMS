import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEnrollmentEmail } from "@/lib/mail";
import { getAppUrl } from "@/lib/utils";
import { calculateCheckout, computePaystackChargeKobo, CheckoutBreakdown } from "@/lib/fees";

export interface PaymentConfig {
  secretKey: string;
  publicKey: string;
  currency: string;
  rate: number;
  baseUrl: string;
  appUrl: string;
  gatewayUrl: string;
}

export function getPaymentConfig(): PaymentConfig {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim() || "";
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY?.trim() || "";
  const currency = "NGN";
  const rate = 1;
  const baseUrl = "https://api.paystack.co";
  const appUrl = getAppUrl();
  const gatewayUrl = (process.env.PAYMENT_GATEWAY_URL || "http://localhost:5000").replace(/\/$/, "");

  return { secretKey, publicKey, currency, rate, baseUrl, appUrl, gatewayUrl };
}

/**
 * Normalizes course price into whole NGN (Naira)
 */
export function calculateNgnAmount(price: number): number {
  if (price <= 0) return 0;
  return Math.round(price);
}

// Paystack's fee formula lives in fees.ts so the checkout maths and the tests share one definition
export { computePaystackChargeKobo };

export function generatePaymentReference(courseId: string, studentId: string): string {
  const shortId = crypto.randomBytes(3).toString("hex").toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `PP-CRS-${shortId}-${timestamp}`;
}


export interface InitializePaymentParams {
  student: {
    id: string;
    email: string;
    name: string;
  };
  course: {
    id: string;
    title: string;
    price: number;
  };
  provider?: "PAYSTACK" | "ACBU_GATEWAY";
}

export interface InitializePaymentResult {
  success: boolean;
  reference: string;
  /** What the student is charged in total (course price + platform fee + processing fee if passed on) */
  amountNgn: number;
  breakdown: CheckoutBreakdown;
  amountUsd?: number;
  authorizationUrl: string;
  accessCode?: string;
  isSimulation: boolean;
  publicKey?: string;
}

/**
 * Initialize a course payment transaction with Paystack or fallback sandbox
 */
export async function initializeCoursePayment({
  student,
  course,
  provider = "PAYSTACK",
}: InitializePaymentParams): Promise<InitializePaymentResult> {
  const config = getPaymentConfig();
  const baseAppUrl = config.appUrl;
  const reference = generatePaymentReference(course.id, student.id);
  // Course price, plus the flat platform fee and Paystack's processing fee when those are switched on
  const breakdown = calculateCheckout(course.price);
  const amountNgn = breakdown.totalNgn;

  // 1. Create PENDING Payment record in database
  await prisma.payment.create({
    data: {
      reference,
      studentId: student.id,
      courseId: course.id,
      amount: amountNgn, // the full amount charged: verification later requires Paystack to confirm at least this
      currency: "NGN",
      provider,
      status: "PENDING",
      metadata: JSON.stringify({
        courseTitle: course.title,
        studentName: student.name,
        amountNgn,
        breakdown,
      }),
    },
  });

  const callbackUrl = `${baseAppUrl}/payment/verify?reference=${reference}`;

  // 2. Check if Paystack Secret Key is configured
  const hasLivePaystack = Boolean(config.secretKey && config.secretKey.startsWith("sk_"));

  if (hasLivePaystack) {
    try {
      const response = await fetch(`${config.baseUrl}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: student.email,
          amount: Math.round(amountNgn * 100), // in kobo
          reference,
          callback_url: callbackUrl,
          metadata: {
            courseId: course.id,
            studentId: student.id,
            courseTitle: course.title,
            studentName: student.name,
            custom_fields: [
              {
                display_name: "Course Title",
                variable_name: "course_title",
                value: course.title,
              },
              {
                display_name: "Student Name",
                variable_name: "student_name",
                value: student.name,
              },
            ],
          },
        }),
      });

      const resData = await response.json();

      if (response.ok && resData.status && resData.data) {
        return {
          success: true,
          reference,
          amountNgn,
          breakdown,
          authorizationUrl: resData.data.authorization_url,
          accessCode: resData.data.access_code,
          isSimulation: false,
          publicKey: config.publicKey,
        };
      } else {
        console.warn("[PAYSTACK INITIALIZE FAILED - FALLING BACK TO TEST MODE]", resData);
      }
    } catch (err) {
      console.error("[PAYSTACK CONNECTION ERROR]", err);
    }
  }

  // 3. Dev / Sandbox Simulation fallback ONLY allowed in development when no Paystack key is configured
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Paystack payment gateway is not configured. Live transactions require a valid PAYSTACK_SECRET_KEY."
    );
  }

  const simulationUrl = `${baseAppUrl}/payment/verify?reference=${reference}&mode=simulated`;
  return {
    success: true,
    reference,
    amountNgn,
    breakdown,
    authorizationUrl: simulationUrl,
    accessCode: `sim_${Date.now()}`,
    isSimulation: true,
    publicKey: config.publicKey,
  };
}

const SINGLE_COURSE_CONFLICT_MESSAGE =
  "Your payment was received, but you are already enrolled in another active course. Please contact support for a refund or course transfer.";

/** Thrown when a verified payment cannot enroll the student because of the single-course lock. */
export class SingleCourseConflictError extends Error {
  constructor() {
    super(SINGLE_COURSE_CONFLICT_MESSAGE);
    this.name = "SingleCourseConflictError";
  }
}

/**
 * Thrown when a payment is definitively refused (unknown reference, wrong amount, charge not
 * successful). Retrying can never change the outcome, so the webhook acknowledges these with a 200.
 * Any other error is treated as temporary and makes the webhook answer 500 so Paystack redelivers.
 */
export class PaymentRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentRejectedError";
  }
}

/** Unique-constraint violation: another request created the same row first */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === "P2002";
}

/**
 * Verifies Paystack transaction by reference and activates student course enrollment
 */
export async function verifyAndProcessPayment(reference: string, isSimulatedMode = false) {
  const config = getPaymentConfig();

  // Find payment in database
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: {
      course: true,
      student: true,
    },
  });

  if (!payment) {
    throw new PaymentRejectedError(`Payment record with reference ${reference} not found.`);
  }

  // If already processed and successful, return existing status
  if (payment.status === "SUCCESS") {
    const findEnrollment = () =>
      prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: payment.studentId,
            courseId: payment.courseId,
          },
        },
      });

    let existingEnrollment = await findEnrollment();

    if (!existingEnrollment) {
      // Paid but not enrolled: either the single-course lock blocked it, or a concurrent
      // request (callback vs webhook) is still creating the enrollment.
      const blocking = await prisma.enrollment.findFirst({
        where: {
          studentId: payment.studentId,
          status: "ACTIVE",
          courseId: { not: payment.courseId },
        },
      });
      if (blocking) {
        throw new SingleCourseConflictError();
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
      existingEnrollment = await findEnrollment();

      if (!existingEnrollment) {
        // Still nothing after the grace period: the request that claimed this payment died before
        // enrolling the student (timeout, database blip). Finish the job so a Paystack redelivery or
        // a page refresh repairs it instead of leaving a paid student without access.
        try {
          existingEnrollment = await prisma.enrollment.create({
            data: { studentId: payment.studentId, courseId: payment.courseId, status: "ACTIVE" },
          });
          await sendEnrollmentEmail(payment.student.email, {
            studentName: payment.student.name,
            courseTitle: payment.course.title,
          });
        } catch (err) {
          // A concurrent request enrolled the student first: that is the outcome we wanted
          if (!isUniqueViolation(err)) throw err;
          existingEnrollment = await findEnrollment();
        }
      }
    }

    return {
      success: true,
      alreadyProcessed: true,
      payment,
      enrollment: existingEnrollment,
      course: payment.course,
    };
  }

  let verified = false;
  let paystackData: any = null;

  // Real Paystack verification if key is present
  const hasLivePaystack = Boolean(config.secretKey && config.secretKey.startsWith("sk_"));

  // SECURITY ENFORCEMENT: Never allow simulation in production or when Paystack secret key is configured
  if (isSimulatedMode) {
    if (process.env.NODE_ENV === "production" || hasLivePaystack) {
      throw new Error(
        "Payment simulation is strictly disabled. Transactions must be completed and verified via Paystack."
      );
    }
  }

  if (hasLivePaystack) {
    try {
      const res = await fetch(`${config.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${config.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();
      if (res.ok && json.status && json.data && json.data.status === "success") {
        // SECURITY: A "success" status alone is not enough; the charge must cover this course's price
        const expectedKobo = Math.round(calculateNgnAmount(payment.amount) * 100);
        const paidKobo = Number(json.data.amount);
        const paidCurrency = String(json.data.currency || "").toUpperCase();
        if (paidCurrency !== payment.currency.toUpperCase() || !(paidKobo >= expectedKobo)) {
          console.error(
            `[PAYSTACK VERIFY] Amount mismatch for ${reference}: paid ${paidKobo} ${paidCurrency}, expected ${expectedKobo} ${payment.currency}`
          );
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED" },
          });
          throw new PaymentRejectedError("Paid amount does not match the course price. Please contact support.");
        }
        verified = true;
        paystackData = json.data;
      } else if (res.ok && json.status && json.data) {
        // Paystack answered and says the charge did not succeed (abandoned, failed): final
        throw new PaymentRejectedError(json.message || "Payment verification failed on Paystack.");
      } else {
        // Paystack itself errored (5xx, rate limit): temporary, so it can be retried
        throw new Error(json.message || "Payment verification failed on Paystack.");
      }
    } catch (err: any) {
      console.error("[PAYSTACK VERIFY ERROR]", err);
      if (err instanceof PaymentRejectedError) throw err;
      throw new Error(err.message || "Could not verify payment with Paystack.");
    }
  } else if (!hasLivePaystack && isSimulatedMode && process.env.NODE_ENV !== "production") {
    // Only permitted in local development when no Paystack credentials exist
    verified = true;
    paystackData = {
      status: "success",
      reference,
      channel: "card_sandbox",
      gateway_response: "Successful (Dev Simulation)",
      paid_at: new Date().toISOString(),
    };
  } else {
    throw new Error("Unable to verify payment: Paystack gateway is not configured.");
  }

  if (!verified) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    throw new PaymentRejectedError("Payment transaction was not successful.");
  }

  // Mark payment as SUCCESS. The status guard makes this an atomic claim, so concurrent
  // callback + webhook verifications cannot both enroll and email the student.
  const claim = await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: "SUCCESS" } },
    data: {
      status: "SUCCESS",
      paidAt: new Date(paystackData?.paid_at || Date.now()),
      channel: paystackData?.channel || "card",
      paystackRef: paystackData?.id ? String(paystackData.id) : reference,
    },
  });

  if (claim.count === 0) {
    // Another request (callback or webhook) claimed this payment first and is enrolling the student
    return {
      success: true,
      alreadyProcessed: true,
      payment,
      enrollment: null,
      course: payment.course,
    };
  }

  const updatedPayment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });

  // Enforce single active course constraint. Two checkouts started before either was paid
  // both pass the check at initialization, so it must be re-checked here.
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: payment.studentId,
      status: "ACTIVE",
      courseId: { not: payment.courseId },
    },
    include: { course: true },
  });

  if (activeEnrollment) {
    // The money was received, so keep the payment as SUCCESS for refund/transfer handling,
    // but do not grant a second active enrollment.
    console.error(
      `[ENROLLMENT BLOCKED] Payment ${reference} succeeded but student ${payment.studentId} is already active in "${activeEnrollment.course.title}". Needs refund or transfer.`
    );
    throw new SingleCourseConflictError();
  }

  // Upsert Enrollment to ACTIVE
  const enrollment = await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: payment.studentId,
        courseId: payment.courseId,
      },
    },
    create: {
      studentId: payment.studentId,
      courseId: payment.courseId,
      status: "ACTIVE",
    },
    update: {
      status: "ACTIVE",
    },
  });

  // Send confirmation email
  await sendEnrollmentEmail(payment.student.email, {
    studentName: payment.student.name,
    courseTitle: payment.course.title,
  });

  return {
    success: true,
    alreadyProcessed: false,
    payment: updatedPayment,
    enrollment,
    course: payment.course,
  };
}

/**
 * Validates HMAC SHA512 signature for Paystack Webhook
 */
export function verifyPaystackWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const config = getPaymentConfig();
  if (!config.secretKey || !signatureHeader) return false;

  try {
    const hash = crypto
      .createHmac("sha512", config.secretKey)
      .update(rawBody)
      .digest("hex");
    const hashBuf = Buffer.from(hash, "hex");
    const sigBuf = Buffer.from(signatureHeader, "hex");
    if (hashBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, sigBuf);
  } catch (e) {
    return false;
  }
}
