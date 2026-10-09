import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const VERIFY_RATE_LIMIT = { limit: 10, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`verify_email:${ip}`, VERIFY_RATE_LIMIT);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Too many verification attempts. Please wait ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes.`
      );
    }

    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token.trim(),
        verificationTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "Your email is already verified. You can proceed to your courses.",
      });
    }

    // Mark user as verified and clear the token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    // Send the custom designed Welcome Onboarding email
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendWelcomeEmail(updatedUser.email, {
        userName: updatedUser.name,
        dashboardUrl: `${origin}/my-courses`,
        faculty: updatedUser.faculty,
        department: updatedUser.department,
      });
    } catch (mailError) {
      console.error("[WELCOME EMAIL DISPATCH ERROR]", mailError);
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! Welcome to FEDPOLY ADO LMS.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        emailVerified: true,
      },
    });
  } catch (error: any) {
    console.error("[VERIFY EMAIL ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to verify email." }, { status: 500 });
  }
}
