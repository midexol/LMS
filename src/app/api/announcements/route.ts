import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendAnnouncementEmail } from "@/lib/mail";

// Emailing a whole class takes a while; give the function room to finish before it is frozen
export const maxDuration = 60;

// How many emails go out at once. Small enough to stay inside the mail server's limits.
const EMAIL_BATCH_SIZE = 10;

// GET: Students fetch announcements for their enrolled course
export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required." }, { status: 400 });
    }

    // Students: verify enrollment
    if (currentUser.role === "STUDENT") {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: currentUser.id, courseId } },
      });
      if (!enrollment) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }
    }

    // Tutors: verify course ownership
    if (currentUser.role === "TUTOR") {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (!course || course.tutorId !== currentUser.id) {
        return NextResponse.json({ error: "Access denied." }, { status: 403 });
      }
    }

    const announcements = await prisma.announcement.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, announcements });
  } catch (error: any) {
    console.error("[ANNOUNCEMENT GET ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch announcements." }, { status: 500 });
  }
}

// POST: Tutors create announcements for their courses
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Only instructors can post announcements." }, { status: 403 });
    }

    const { courseId, title, content } = await req.json();

    if (!courseId || !title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "Course ID, title, and content are all required." },
        { status: 400 }
      );
    }

    // Verify tutor owns this course
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    if (course.tutorId !== currentUser.id && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "You can only post announcements to your own courses." },
        { status: 403 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        courseId,
        title: title.trim(),
        content: content.trim(),
      },
    });

    // Notify all actively enrolled students via update email
    try {
      const activeEnrollments = await prisma.enrollment.findMany({
        where: { courseId, status: "ACTIVE" },
        include: { student: true },
      });

      // Wait for the sends to finish: on serverless hosting an unawaited promise can be cut off once the
      // response is returned. One failed address must not stop the others, so every send is settled.
      const recipients = activeEnrollments.filter((e) => e.student?.email);
      for (let i = 0; i < recipients.length; i += EMAIL_BATCH_SIZE) {
        const batch = recipients.slice(i, i + EMAIL_BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((e) =>
            sendAnnouncementEmail(
              e.student.email,
              {
                studentName: e.student.name,
                courseTitle: course.title,
                announcementTitle: announcement.title,
                content: announcement.content,
              },
              { replyTo: currentUser.email }
            )
          )
        );
        results.forEach((r) => {
          if (r.status === "rejected") console.error("[ANNOUNCEMENT EMAIL FAILED]", r.reason);
        });
      }
    } catch (emailErr) {
      console.error("[ANNOUNCEMENT DISPATCH ERROR]", emailErr);
    }

    return NextResponse.json({ success: true, announcement });
  } catch (error: any) {
    console.error("[ANNOUNCEMENT POST ERROR]", error);
    return NextResponse.json({ error: "Failed to post announcement." }, { status: 500 });
  }
}

// DELETE: Tutors delete their own announcements
export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Only instructors can delete announcements." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const announcementId = searchParams.get("id");

    if (!announcementId) {
      return NextResponse.json({ error: "Announcement ID is required." }, { status: 400 });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { course: true },
    });

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }

    if (announcement.course.tutorId !== currentUser.id && currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await prisma.announcement.delete({ where: { id: announcementId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ANNOUNCEMENT DELETE ERROR]", error);
    return NextResponse.json({ error: "Failed to delete announcement." }, { status: 500 });
  }
}
