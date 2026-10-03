import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { lessonId, completed } = await req.json();
    if (!lessonId) {
      return NextResponse.json({ error: "Lesson ID is required." }, { status: 400 });
    }

    // SECURITY: Verify the student is enrolled in the course that contains this lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: { include: { course: true } } },
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: currentUser.id,
          courseId: lesson.module.course.id,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Access denied: You are not enrolled in this course." },
        { status: 403 }
      );
    }

    const progress = await prisma.lessonProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId: currentUser.id,
          lessonId: lessonId,
        },
      },
      update: {
        completed: Boolean(completed),
        completedAt: completed ? new Date() : null,
      },
      create: {
        studentId: currentUser.id,
        lessonId: lessonId,
        completed: Boolean(completed),
        completedAt: completed ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true, progress });
  } catch (error: any) {
    console.error("[PROGRESS API ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to update progress." }, { status: 500 });
  }
}
