import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { signSessionToken, mustVerifyEmail, toPublicUser } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";
import { decryptSecret, useBackupCode, verifyTotp } from "@/lib/totp";

export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(`login:${ip}`, RATE_LIMIT_RULES.LOGIN);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Too many login attempts. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`
      );
    }

    const { email, password, code } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (mustVerifyEmail(user)) {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in. Check your inbox for the verification link, or request a new one.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    // Two-step sign-in: the password alone is not enough for an account that has it switched on
    const loginUpdate: Record<string, unknown> = { lastLoginAt: new Date() };
    if (user.totpEnabled && user.totpSecret) {
      const typed = typeof code === "string" ? code.trim() : "";
      if (!typed) {
        return NextResponse.json(
          { error: "Enter the 6-digit code from your authenticator app.", code: "TOTP_REQUIRED" },
          { status: 401 }
        );
      }
      const codeLimit = await checkRateLimit(`2fa:${user.id}`, RATE_LIMIT_RULES.TWO_FACTOR);
      if (!codeLimit.success) {
        return rateLimitResponse(codeLimit, "Too many code attempts. Please wait a few minutes before trying again.");
      }
      const step = verifyTotp(decryptSecret(user.totpSecret), typed, user.totpLastStep);
      if (step !== null) {
        loginUpdate.totpLastStep = step;
      } else {
        const remaining = useBackupCode(user.totpBackupCodes, typed);
        if (!remaining) {
          return NextResponse.json({ error: "That code is not correct.", code: "TOTP_INVALID" }, { status: 401 });
        }
        loginUpdate.totpBackupCodes = JSON.stringify(remaining);
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: loginUpdate,
    });

    const cookieStore = await cookies();
    cookieStore.set("lms_user_id", signSessionToken(user.id), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    cookieStore.set("lms_user_role", user.role, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Return user without password
    return NextResponse.json({ success: true, user: toPublicUser(user) });
  } catch (error: any) {
    console.error("[LOGIN API ERROR]", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
