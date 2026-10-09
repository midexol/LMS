import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

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
    }

    if (faculty !== undefined) {
      updateData.faculty = faculty ? faculty.trim() : null;
    }

    if (department !== undefined) {
      updateData.department = department ? department.trim() : null;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters." },
          { status: 400 }
        );
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
