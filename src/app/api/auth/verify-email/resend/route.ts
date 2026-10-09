import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

// Limit resend requests to 3 per 15 minutes per IP
const RESEND_RATE_LIMIT = { limit: 3, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`resend_verify:${ip}`, RESEND_RATE_LIMIT);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Too many resend attempts. Please wait ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.`
      );
    }

    const { email } = await req.json();
    const trimmedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

    if (!trimmedEmail) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    // Generic response to avoid email enumeration
    const genericResponse = NextResponse.json({
      success: true,
      message: "If an unverified account matches this email, a new verification link has been sent.",
    });

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user || user.emailVerified) {
      return genericResponse;
    }

    // Generate new token valid for 24 hours
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationTokenExpiry: expiry,
      },
    });

    const url = new URL(req.url);
    const origin = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
    const verifyUrl = `${origin}/verify-email?token=${token}`;

    try {
      await sendVerificationEmail(user.email, {
        userName: user.name,
        verifyUrl,
      });
    } catch (err) {
      console.error("[RESEND VERIFICATION EMAIL FAILED]", err);
    }

    return genericResponse;
  } catch (error: any) {
    console.error("[RESEND VERIFY ERROR]", error);
    return NextResponse.json({ error: "Failed to resend verification email." }, { status: 500 });
  }
}
