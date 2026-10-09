import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { name, password, faculty, department } = await req.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    }

    const updateData: any = { name: name.trim() };

    if (faculty !== undefined) {
      updateData.faculty = faculty ? faculty.trim() : null;
    }
    if (department !== undefined) {
      updateData.department = department ? department.trim() : null;
    }

    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(password.trim(), 12);
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    const { password: _pw, ...safeUser } = updatedUser;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error("[PROFILE UPDATE API ERROR]", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
