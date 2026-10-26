import { getAppUrl, normalizePhone } from "@/lib/utils";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signSessionToken, mustVerifyEmail, toPublicUser } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(`register:${ip}`, RATE_LIMIT_RULES.REGISTER);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Too many registration requests from this network. Please wait ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes before trying again.`
      );
    }

    const { name, email, password, phone, faculty, department } = await req.json();

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json({ error: "Full name must be at least 2 characters." }, { status: 400 });
    }

    if (trimmedName.length > 80) {
      return NextResponse.json({ error: "Full name cannot exceed 80 characters." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone === undefined) {
      return NextResponse.json({ error: "Please enter a valid phone number, or leave it blank." }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password with bcrypt (12 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate secure 32-byte verification token (valid for 24 hours)
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        role: "STUDENT", // Enforce STUDENT on public registration. Faculty/Tutors are provisioned via Admin
        faculty: faculty?.trim() || null,
        department: department?.trim() || null,
        phone: cleanPhone,
        lastLoginAt: new Date(),
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Send verification email
    try {
      const verifyUrl = `${getAppUrl()}/verify-email?token=${verificationToken}`;

      await sendVerificationEmail(newUser.email, {
        userName: newUser.name,
        verifyUrl,
      });
    } catch (emailError) {
      console.error("[REGISTER VERIFICATION EMAIL FAILED]", emailError);
    }

    // With verification required, the student signs in only after confirming their email
    if (mustVerifyEmail(newUser)) {
      return NextResponse.json({ success: true, needsVerification: true });
    }

    const cookieStore = await cookies();
    cookieStore.set("lms_user_id", signSessionToken(newUser.id), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    cookieStore.set("lms_user_role", newUser.role, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.json({ success: true, user: toPublicUser(newUser) });
  } catch (error: any) {
    console.error("[REGISTER API ERROR]", error);
    return NextResponse.json({ error: "Failed to register user." }, { status: 500 });
  }
}
