import { NextResponse } from "next/server";
import {
  verifyPaystackWebhookSignature,
  verifyAndProcessPayment,
  PaymentRejectedError,
  SingleCourseConflictError,
} from "@/lib/payment";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    // Verify webhook signature (strictly required in production)
    if (process.env.NODE_ENV === "production" && (!signature || !process.env.PAYSTACK_SECRET_KEY)) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
    }

    if (process.env.PAYSTACK_SECRET_KEY) {
      const isValid = verifyPaystackWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn("[PAYSTACK WEBHOOK] Invalid HMAC signature received.");
        return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
      const data = event.data;
      const reference = data?.reference;

      if (reference) {
        try {
          await verifyAndProcessPayment(reference, false);
          console.log(`[PAYSTACK WEBHOOK] Payment ${reference} verified and processed successfully.`);
        } catch (err) {
          console.error(`[PAYSTACK WEBHOOK ERROR] Processing reference ${reference}:`, err);
          // Final outcomes (rejected payment, single-course lock) are acknowledged: redelivery cannot
          // change them. Anything else (database or network trouble) answers 500 so Paystack redelivers.
          const final = err instanceof PaymentRejectedError || err instanceof SingleCourseConflictError;
          if (!final) {
            return NextResponse.json({ error: "Temporary processing error" }, { status: 500 });
          }
        }
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("[PAYSTACK WEBHOOK HANDLER ERROR]", error);
    return NextResponse.json({ error: "Webhook handling error" }, { status: 500 });
  }
}
