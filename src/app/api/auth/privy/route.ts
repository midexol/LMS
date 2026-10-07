import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signSessionToken } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rateLimit";

const PRIVY_AUTH_RATE_LIMIT = { limit: 10, windowMs: 60 * 1000 };

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`privy_auth:${ip}`, PRIVY_AUTH_RATE_LIMIT);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const { email, name, privyId, walletAddress } = await req.json();

    // Privy can authenticate with email or wallet address
    const normalizedEmail = typeof email === "string" && email.trim() ? email.toLowerCase().trim() : null;
    const finalIdentifier = normalizedEmail || (walletAddress ? `${walletAddress.toLowerCase()}@wallet.privy` : null);

    if (!finalIdentifier) {
      return NextResponse.json(
        { error: "A valid email address or wallet account is required to authenticate." },
        { status: 400 }
      );
    }

    const displayName =
      (typeof name === "string" && name.trim()) ||
      (normalizedEmail ? normalizedEmail.split("@")[0] : `Student ${walletAddress.slice(0, 6)}`);

    // Find existing user or create a new student account
    let user = await prisma.user.findUnique({
      where: { email: finalIdentifier },
    });

    if (!user) {
      // Generate a secure random password for DB integrity (Privy handles auth passwordlessly)
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      user = await prisma.user.create({
        data: {
          name: displayName,
          email: finalIdentifier,
          password: hashedPassword,
          role: "STUDENT",
        },
      });
    }

    // Set signed LMS session cookie
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
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error("[PRIVY AUTH API ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to authenticate with Privy." },
      { status: 500 }
    );
  }
}
