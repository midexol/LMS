import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password, role, faculty, department } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }

    if (!email || email.trim().length === 0) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
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

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role === "TUTOR" ? "TUTOR" : "STUDENT",
        faculty: faculty?.trim() || null,
        department: department?.trim() || null,
      },
    });

    const cookieStore = await cookies();
    cookieStore.set("lms_user_id", newUser.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    cookieStore.set("lms_user_role", newUser.role, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Return user without password
    const { password: _pw, ...safeUser } = newUser;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error("[REGISTER API ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to register user." }, { status: 500 });
  }
}
