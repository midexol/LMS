import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendGradeOverrideEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Only instructors can override grades." }, { status: 403 });
    }

    const { submissionId, newScore, tutorFeedback } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: "Submission ID is required." }, { status: 400 });
    }

    if (newScore === undefined || newScore === null || isNaN(Number(newScore))) {
      return NextResponse.json({ error: "A valid score is required." }, { status: 400 });
    }

    // SECURITY: Verify the submission belongs to one of this tutor's courses
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: true,
        assignment: {
          include: {
            lesson: {
              include: {
                module: {
                  include: { course: true },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const course = submission.assignment.lesson.module.course;

    if (course.tutorId !== currentUser.id && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Access denied: You can only override grades for your own courses." },
        { status: 403 }
      );
    }

    const scoreValue = parseInt(String(newScore));
    const maxScore = submission.assignment.maxScore;

    if (scoreValue < 0 || scoreValue > maxScore) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${maxScore}.` },
        { status: 400 }
      );
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: scoreValue,
        tutorFeedback: tutorFeedback?.trim() || "",
        status: "GRADED",
      },
    });

    // Notify student via update email
    if (submission.student?.email) {
      sendGradeOverrideEmail(submission.student.email, {
        studentName: submission.student.name,
        courseTitle: course.title,
        assignmentTitle: submission.assignment.title,
        newScore: scoreValue,
        maxScore,
        tutorFeedback: tutorFeedback?.trim() || "",
      }).catch((emailErr) => console.error("[GRADE OVERRIDE EMAIL ERROR]", emailErr));
    }

    return NextResponse.json({ success: true, submission: updatedSubmission });
  } catch (error: any) {
    console.error("[GRADE OVERRIDE API ERROR]", error);
    return NextResponse.json({ error: "Failed to update grade." }, { status: 500 });
  }
}
