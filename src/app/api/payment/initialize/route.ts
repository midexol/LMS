import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { initializeCoursePayment } from "@/lib/payment";
import { checkRateLimit, getClientIp, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`payment_init:${ip}`, RATE_LIMIT_RULES.PAYMENT_INIT);
    if (!rateLimit.success) {
      return rateLimitResponse(
        rateLimit,
        `Too many payment attempts. Please wait ${rateLimit.resetInSeconds} seconds before trying again.`
      );
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Authentication required: Please log in or sign up before registering for a course." },
        { status: 401 }
      );
    }

    if (currentUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Only student accounts can enroll in courses." },
        { status: 403 }
      );
    }

    const { courseId, provider } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (!course.published) {
      return NextResponse.json(
        { error: "This course is not currently open for enrollment." },
        { status: 400 }
      );
    }

    // STRICT CHECK: Department matching
    if (currentUser.department && course.department && course.department !== currentUser.department) {
      return NextResponse.json(
        {
          error: `Department Restriction: This course is only available to students in the ${course.department} department. You are enrolled under ${currentUser.department}.`,
        },
        { status: 403 }
      );
    }

    // Check if already active or completed in THIS course
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
          { error: "You are already actively enrolled in this course." },
          { status: 400 }
        );
      }
      if (existingEnrollment.status === "COMPLETED") {
        return NextResponse.json(
          { error: "You have already completed this course and received certification." },
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

    // Initialize course payment
    const paymentResult = await initializeCoursePayment({
      student: {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
      },
      course: {
        id: course.id,
        title: course.title,
        price: course.price,
      },
      provider: provider === "ACBU_GATEWAY" ? "ACBU_GATEWAY" : "PAYSTACK",
    });

    return NextResponse.json(paymentResult);
  } catch (error: any) {
    console.error("[PAYMENT INITIALIZE ERROR]", error);
    return NextResponse.json(
      { error: "Failed to initialize course payment." },
      { status: 500 }
    );
  }
}
