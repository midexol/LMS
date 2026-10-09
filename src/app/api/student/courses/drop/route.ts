import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (currentUser.role !== "STUDENT") {
      return NextResponse.json({ error: "Only students can drop courses." }, { status: 403 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: currentUser.id,
          courseId,
        },
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  include: {
                    assignments: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "You are not enrolled in this course." }, { status: 404 });
    }

    if (enrollment.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Completed courses cannot be dropped. You have already received certification." },
        { status: 400 }
      );
    }

    // Collect lesson IDs for this course to clean up lesson progress
    const lessonIds: string[] = [];
    enrollment.course.modules.forEach((mod) => {
      mod.lessons.forEach((l) => lessonIds.push(l.id));
    });

    // Clean up enrollment and lesson progress within a transaction
    await prisma.$transaction([
      prisma.lessonProgress.deleteMany({
        where: {
          studentId: currentUser.id,
          lessonId: { in: lessonIds },
        },
      }),
      prisma.enrollment.delete({
        where: {
          id: enrollment.id,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully dropped "${enrollment.course.title}". Your single-course lock is now released.`,
    });
  } catch (error: any) {
    console.error("[DROP COURSE ERROR]", error);
    return NextResponse.json(
      { error: "Failed to drop course." },
      { status: 500 }
    );
  }
}
