import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Access denied: Administrator privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const enrollmentId = searchParams.get("id");

    if (!enrollmentId) {
      return NextResponse.json({ error: "Enrollment ID is required." }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            modules: {
              include: { lessons: true },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
    }

    // Collect lesson IDs to clean up progress
    const lessonIds: string[] = [];
    enrollment.course.modules.forEach((mod) => {
      mod.lessons.forEach((l) => lessonIds.push(l.id));
    });

    await prisma.$transaction([
      prisma.lessonProgress.deleteMany({
        where: {
          studentId: enrollment.studentId,
          lessonId: { in: lessonIds },
        },
      }),
      prisma.enrollment.delete({
        where: { id: enrollmentId },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Enrollment successfully revoked and unlocked." });
  } catch (error: any) {
    console.error("[ADMIN ENROLLMENT DELETE ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to remove enrollment." }, { status: 500 });
  }
}
