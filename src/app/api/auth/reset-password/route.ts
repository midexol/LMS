import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const RESET_PW_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 };

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(`reset_pw:${ip}`, RESET_PW_RATE_LIMIT);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Too many password reset attempts. Please wait ${Math.ceil(
          rateLimit.resetInSeconds / 60
        )} minutes before trying again.`
      );
    }

    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || token.length < 16) {
      return NextResponse.json(
        { error: "Invalid or malformed password reset token." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Look up user by resetToken and ensure it has not expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This password reset link is invalid or has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash the new password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and revoke reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        sessionsValidAfter: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You may now log in with your new password.",
    });
  } catch (error: any) {
    console.error("[RESET PASSWORD API ERROR]", error);
    return NextResponse.json(
      { error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
