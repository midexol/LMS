import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { evaluateSubmissionAI } from "@/lib/ai";
import { sendGradeEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { assignmentId, content } = await req.json();

    if (!assignmentId || !content || content.trim().length === 0) {
      return NextResponse.json({ error: "Submission content cannot be empty." }, { status: 400 });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        lesson: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    // SECURITY: Verify the student is actually enrolled in this course
    const courseId = assignment.lesson.module.course.id;
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: currentUser.id,
          courseId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Access denied: You are not enrolled in this course." },
        { status: 403 }
      );
    }

    // Call unified AI auto-grading engine
    const aiResult = await evaluateSubmissionAI(
      assignment.prompt,
      assignment.referenceAnswer,
      content,
      assignment.maxScore
    );

    // Check if student has a previous submission to update (Allow Unlimited Resubmissions policy)
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        assignmentId: assignment.id,
        studentId: currentUser.id,
      },
    });

    let submission;
    if (existingSubmission) {
      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          content: content,
          score: aiResult.score,
          aiFeedback: aiResult.feedback,
          status: "GRADED",
          submittedAt: new Date(),
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          assignmentId: assignment.id,
          studentId: currentUser.id,
          content: content,
          score: aiResult.score,
          aiFeedback: aiResult.feedback,
          status: "GRADED",
        },
      });
    }

    // Send Grade Notification Email to student
    await sendGradeEmail(currentUser.email, {
      studentName: currentUser.name,
      courseTitle: assignment.lesson.module.course.title,
      assignmentTitle: assignment.title,
      score: aiResult.score,
      maxScore: assignment.maxScore,
      feedback: aiResult.feedback,
    });

    return NextResponse.json({
      success: true,
      submission,
      evaluation: aiResult,
    });
  } catch (error: any) {
    console.error("[GRADE API ERROR]", error);
    return NextResponse.json({ error: "Failed to process submission." }, { status: 500 });
  }
}
