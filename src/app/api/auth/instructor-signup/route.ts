import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { startSession, toPublicUser } from "@/lib/auth";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";
import { sendVerificationEmail } from "@/lib/mail";
import { getAppUrl } from "@/lib/utils";
import { isValidInstructorKey } from "@/lib/instructorLink";
import { isValidFacultyAndDepartment } from "@/lib/academicStructure";

const MIN_PASSWORD = 8;

/** Creates an instructor account for someone who holds the private sign-up link (its key is sent in the body). */
export async function POST(req: Request) {
  try {
    // Counted before the key is checked, so guessing keys is rate limited as well
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(`instructor-signup:${ip}`, RATE_LIMIT_RULES.INSTRUCTOR_SIGNUP);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Too many attempts from this network. Please wait ${Math.ceil(rateLimit.resetInSeconds / 60)} minutes before trying again.`
      );
    }

    const body = await req.json();
    if (!isValidInstructorKey(body?.key)) {
      return NextResponse.json({ error: "This sign-up link is not valid." }, { status: 403 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = String(body.password ?? "");

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "Enter your full name (2 to 80 characters)." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }
    if (password.length < MIN_PASSWORD) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD} characters long.` }, { status: 400 });
    }
    if (!isValidFacultyAndDepartment(body.faculty, body.department)) {
      return NextResponse.json({ error: "Choose your school and department from the lists." }, { status: 400 });
    }

    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const created = await prisma.user.create({
      data: {
        name,
        email,
        password: await bcrypt.hash(password, 12),
        role: "TUTOR",
        faculty: body.faculty,
        department: body.department,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    console.info(`[INSTRUCTOR SIGNUP] ${created.email} created an instructor account from the private link`);

    try {
      await sendVerificationEmail(created.email, {
        userName: created.name,
        verifyUrl: `${getAppUrl()}/verify-email?token=${verificationToken}`,
      });
    } catch (emailError) {
      console.error("[INSTRUCTOR SIGNUP VERIFICATION EMAIL FAILED]", emailError);
    }

    await startSession(created);
    return NextResponse.json({ success: true, user: toPublicUser(created) });
  } catch (error: any) {
    console.error("[INSTRUCTOR SIGNUP ERROR]", error);
    return NextResponse.json({ error: "Failed to create the account." }, { status: 500 });
  }
}
