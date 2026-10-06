import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/mail";

// Rate limit: 3 password reset requests per 15 minutes per IP
const FORGOT_PW_RATE_LIMIT = { limit: 3, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`forgot_pw:${ip}`, FORGOT_PW_RATE_LIMIT);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Too many password reset attempts. Please wait ${Math.ceil(
          rateLimit.resetInSeconds / 60
        )} minutes before trying again.`
      );
    }

    const { email } = await req.json();
    const trimmedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

    if (!trimmedEmail) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    // Always respond with a generic success message to prevent user enumeration
    const genericResponse = NextResponse.json({
      success: true,
      message: "If an account matches that email, a password reset link has been sent to your inbox.",
    });

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      return genericResponse;
    }

    // Generate secure 32-byte hex token valid for 1 hour
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const url = new URL(req.url);
    const origin = `${url.protocol}//${url.host}`;
    const resetUrl = `${origin}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, {
      userName: user.name,
      resetUrl,
    });

    return genericResponse;
  } catch (error: any) {
    console.error("[FORGOT PASSWORD API ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process password reset request." },
      { status: 500 }
    );
  }
}
