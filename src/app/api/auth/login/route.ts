import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { signSessionToken } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";

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

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Support both bcrypt hashes and legacy plain-text passwords
    let passwordMatch = false;
    if (user.password.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plain-text comparison (dev seed data)
      passwordMatch = user.password === password;
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Automatically migrate legacy plaintext seed password to bcrypt upon successful authentication
    if (!user.password.startsWith("$2")) {
      const secureHash = await bcrypt.hash(password, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: secureHash },
      });
    }

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
    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error("[LOGIN API ERROR]", error);
    return NextResponse.json({ error: "Failed to log in." }, { status: 500 });
  }
}
