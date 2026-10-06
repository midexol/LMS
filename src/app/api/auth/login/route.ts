import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { signSessionToken } from "@/lib/auth";


// Simple in-memory rate limiter: max 10 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }

  if (entry.count >= 10) {
    return true;
  }

  entry.count++;
  return false;
}

export async function POST(req: Request) {
  try {
    // Rate limiting by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait 15 minutes before trying again." },
        { status: 429 }
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

    // Return user without password
    const { password: _pw, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error("[LOGIN API ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to log in." }, { status: 500 });
  }
}
