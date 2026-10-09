import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendCompletionEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: currentUser.id,
          courseId: courseId,
        },
      },
      include: {
        course: {
          include: {
            modules: {
              include: {
                lessons: {
                  include: {
                    assignments: {
                      include: {
                        submissions: {
                          where: { studentId: currentUser.id },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Active enrollment not found for this course." }, { status: 404 });
    }

    // Collect all course assignments & student scores
    const allAssignments: any[] = [];
    enrollment.course.modules.forEach((m) => {
      m.lessons.forEach((l) => {
        l.assignments.forEach((a) => {
          allAssignments.push(a);
        });
      });
    });

    if (allAssignments.length > 0) {
      let totalEarned = 0;
      let totalMax = 0;
      let missingSubmissions = false;

      for (const assignment of allAssignments) {
        const sub = assignment.submissions[0];
        if (!sub || sub.score === null || sub.score === undefined) {
          missingSubmissions = true;
          break;
        }
        totalEarned += sub.score;
        totalMax += assignment.maxScore;
      }

      if (missingSubmissions) {
        return NextResponse.json(
          { error: "Course completion locked: You must submit all assignments before completing the course." },
          { status: 400 }
        );
      }

      const overallPercentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 100;

      if (overallPercentage < 70) {
        return NextResponse.json(
          {
            error: `Course completion locked: Your current average score is ${Math.round(overallPercentage)}%. A minimum passing score of 70% across all assignments is required to unlock your next course registration.`,
          },
          { status: 400 }
        );
      }
    }

    // Update status to COMPLETED
    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Send Completion Email
    await sendCompletionEmail(currentUser.email, {
      studentName: currentUser.name,
      courseTitle: enrollment.course.title,
      certificateId: `CERT-${enrollment.id.slice(-8).toUpperCase()}`,
    });

    return NextResponse.json({ success: true, enrollment: updated });
  } catch (error: any) {
    console.error("[COMPLETE COURSE API ERROR]", error);
    return NextResponse.json({ error: "Failed to complete course." }, { status: 500 });
  }
}
