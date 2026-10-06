import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEnrollmentEmail } from "@/lib/mail";

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
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
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

/**
 * Compute Paystack charge matching payment-portal logic:
 * 1.5% + ₦100 if amount > ₦2,500, capped at ₦2,000 (amounts in kobo).
 */
export function computePaystackChargeKobo(amountKobo: number): number {
  const FLAT_FEE_THRESHOLD = 250000; // ₦2,500 in kobo
  const FLAT_FEE = 10000;            // ₦100 in kobo
  const CAP = 200000;                // ₦2,000 in kobo
  const RATE = 0.015;

  let charge = Math.round(amountKobo * RATE);
  if (amountKobo > FLAT_FEE_THRESHOLD) charge += FLAT_FEE;
  if (charge > CAP) charge = CAP;
  return charge;
}

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
  origin?: string;
}

export interface InitializePaymentResult {
  success: boolean;
  reference: string;
  amountNgn: number;
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
  origin,
}: InitializePaymentParams): Promise<InitializePaymentResult> {
  const config = getPaymentConfig();
  const baseAppUrl = origin || config.appUrl;
  const reference = generatePaymentReference(course.id, student.id);
  const amountNgn = calculateNgnAmount(course.price);

  // 1. Create PENDING Payment record in database
  await prisma.payment.create({
    data: {
      reference,
      studentId: student.id,
      courseId: course.id,
      amount: course.price,
      currency: "NGN",
      provider,
      status: "PENDING",
      metadata: JSON.stringify({
        courseTitle: course.title,
        studentName: student.name,
        amountNgn,
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
    authorizationUrl: simulationUrl,
    accessCode: `sim_${Date.now()}`,
    isSimulation: true,
    publicKey: config.publicKey,
  };
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
    throw new Error(`Payment record with reference ${reference} not found.`);
  }

  // If already processed and successful, return existing status
  if (payment.status === "SUCCESS") {
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: payment.studentId,
          courseId: payment.courseId,
        },
      },
    });

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
        verified = true;
        paystackData = json.data;
      } else {
        throw new Error(json.message || "Payment verification failed on Paystack.");
      }
    } catch (err: any) {
      console.error("[PAYSTACK VERIFY ERROR]", err);
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
    throw new Error("Payment transaction was not successful.");
  }

  // Mark payment as SUCCESS
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCESS",
      paidAt: new Date(paystackData?.paid_at || Date.now()),
      channel: paystackData?.channel || "card",
      paystackRef: paystackData?.id ? String(paystackData.id) : reference,
    },
  });

  // Verify single active course constraint
  const activeEnrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: payment.studentId,
      status: "ACTIVE",
      courseId: { not: payment.courseId },
    },
    include: { course: true },
  });

  if (activeEnrollment) {
    console.warn(`[ENROLLMENT WARN] Student already active in ${activeEnrollment.course.title}`);
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
    return hash === signatureHeader;
  } catch (e) {
    return false;
  }
}
