import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
    return NextResponse.json({ error: error.message || "Failed to fetch announcements." }, { status: 500 });
  }
}

// POST: Tutors create announcements for their courses
export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN")) {
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

    if (course.tutorId !== currentUser.id && currentUser.role !== "ADMIN") {
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

    return NextResponse.json({ success: true, announcement });
  } catch (error: any) {
    console.error("[ANNOUNCEMENT POST ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to post announcement." }, { status: 500 });
  }
}

// DELETE: Tutors delete their own announcements
export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "TUTOR" && currentUser.role !== "ADMIN")) {
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

    if (announcement.course.tutorId !== currentUser.id && currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await prisma.announcement.delete({ where: { id: announcementId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ANNOUNCEMENT DELETE ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to delete announcement." }, { status: 500 });
  }
}
