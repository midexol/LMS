import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendEnrollmentEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required: Please log in or sign up before registering for a course." },
        { status: 401 }
      );
    }

    // Students only - tutors cannot enroll in courses
    if (currentUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only student accounts can enroll in courses." },
        { status: 403 }
      );
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // Verify course is published and available
    if (!course.published) {
      return NextResponse.json(
        { error: "This course is not currently available for enrollment." },
        { status: 400 }
      );
    }

    // Check if already enrolled (active or completed) in THIS course
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: currentUser.id,
          courseId: course.id,
        },
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === "ACTIVE") {
        return NextResponse.json(
          { error: "You are already enrolled in this course." },
          { status: 400 }
        );
      }
      if (existingEnrollment.status === "COMPLETED") {
        return NextResponse.json(
          { error: "You have already completed this course." },
          { status: 400 }
        );
      }
    }

    // STRICT CHECK: Does student have an existing active course?
    const activeEnrollment = await prisma.enrollment.findFirst({
      where: {
        studentId: currentUser.id,
        status: "ACTIVE",
      },
      include: { course: true },
    });

    if (activeEnrollment) {
      return NextResponse.json(
        {
          error: `Single Course Lock Active: You are currently enrolled in "${activeEnrollment.course.title}". You must complete your active course before enrolling in a new one.`,
        },
        { status: 403 }
      );
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: currentUser.id,
        courseId: course.id,
        status: "ACTIVE",
      },
    });

    await sendEnrollmentEmail(currentUser.email, {
      studentName: currentUser.name,
      courseTitle: course.title,
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (error: any) {
    console.error("[CHECKOUT API ERROR]", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete enrollment." },
      { status: 500 }
    );
  }
}
