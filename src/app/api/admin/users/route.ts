import { checkNewPassword } from "@/lib/passwordCheck";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getAppUrl } from "@/lib/utils";
import { sendInstructorInviteEmail } from "@/lib/mail";

// GET: Fetch all users (admin only)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        faculty: true,
        department: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true,
            submissions: true,
            courses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// PATCH: Update user role, faculty, department, or reset password
export async function PATCH(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { userId, role, newPassword, faculty, department } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    // Prevent admin from demoting themselves
    if (userId === currentUser.id && role && role !== "ADMIN" && role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "You cannot change your own admin role." },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (role) {
      if (!["STUDENT", "TUTOR", "ADMIN", "SUPERADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      updateData.role = role;
      console.info(`[ADMIN AUDIT] ${currentUser.email} set role of user ${userId} to ${role}`);
    }

    if (faculty !== undefined) {
      updateData.faculty = faculty ? faculty.trim() : null;
    }

    if (department !== undefined) {
      updateData.department = department ? department.trim() : null;
    }

    if (newPassword) {
      const passwordIssue = await checkNewPassword(newPassword);
      if (passwordIssue) {
        return NextResponse.json({ error: passwordIssue }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(newPassword, 12);
      // Revoke the user's existing sessions when an admin resets their password
      updateData.sessionsValidAfter = new Date();
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, faculty: true, department: true },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// DELETE: Remove a user and all their data
export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (userId === currentUser.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}


const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// POST: Add an instructor. Creates a new verified TUTOR account and emails an invite to set a password,
// or promotes an existing student account that uses the same email.
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { name, email, faculty, department } = await req.json();

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

    if (trimmedName.length < 2 || trimmedName.length > 80) {
      return NextResponse.json({ error: "Enter the instructor's full name (2-80 characters)." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const cleanFaculty = typeof faculty === "string" && faculty.trim() ? faculty.trim() : null;
    const cleanDepartment = typeof department === "string" && department.trim() ? department.trim() : null;

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });

    if (existing) {
      if (existing.role === "TUTOR") {
        return NextResponse.json({ error: "This person is already an instructor." }, { status: 409 });
      }
      if (existing.role !== "STUDENT") {
        return NextResponse.json({ error: "This email belongs to an administrator account." }, { status: 409 });
      }

      const promoted = await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: "TUTOR",
          ...(cleanFaculty ? { faculty: cleanFaculty } : {}),
          ...(cleanDepartment ? { department: cleanDepartment } : {}),
        },
        select: { id: true, name: true, email: true, role: true, faculty: true, department: true, phone: true, lastLoginAt: true, emailVerified: true, createdAt: true },
      });
      console.info(`[ADMIN AUDIT] ${currentUser.email} promoted ${promoted.email} from STUDENT to TUTOR`);
      return NextResponse.json({ success: true, created: false, user: promoted });
    }

    // New account: unusable random password until the instructor sets their own through the invite link
    const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
    const inviteToken = crypto.randomBytes(32).toString("hex");

    const created = await prisma.user.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        password: hashedPassword,
        role: "TUTOR",
        faculty: cleanFaculty,
        department: cleanDepartment,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        resetToken: inviteToken,
        resetTokenExpiry: new Date(Date.now() + INVITE_TTL_MS),
      },
      select: { id: true, name: true, email: true, role: true, faculty: true, department: true, phone: true, lastLoginAt: true, emailVerified: true, createdAt: true },
    });

    const baseUrl = getAppUrl();
    const emailSent = await sendInstructorInviteEmail(created.email, {
      userName: created.name,
      inviteUrl: `${baseUrl}/reset-password?token=${inviteToken}`,
      loginUrl: `${baseUrl}/instructor/login`,
    });

    console.info(`[ADMIN AUDIT] ${currentUser.email} created instructor account ${created.email} (invite email sent: ${emailSent})`);
    return NextResponse.json({ success: true, created: true, emailSent, user: created });
  } catch (error) {
    console.error("[ADMIN USERS POST ERROR]", error);
    return NextResponse.json({ error: "Failed to add instructor." }, { status: 500 });
  }
}
