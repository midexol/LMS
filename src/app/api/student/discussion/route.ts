import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse, RATE_LIMIT_RULES } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`discussion:${currentUser.id}`, RATE_LIMIT_RULES.DISCUSSION);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const { action, lessonId, postId, content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content cannot be empty." }, { status: 400 });
    }

    if (action === "create_post") {
      if (!lessonId) {
        return NextResponse.json({ error: "Lesson ID is required." }, { status: 400 });
      }

      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { module: { include: { course: true } } },
      });

      if (!lesson) {
        return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
      }

      const course = lesson.module.course;
      const isStaff =
        currentUser.role === "ADMIN" ||
        currentUser.role === "SUPERADMIN" ||
        course.tutorId === currentUser.id;

      const isEnrolled = isStaff
        ? true
        : Boolean(
            await prisma.enrollment.findUnique({
              where: {
                studentId_courseId: {
                  studentId: currentUser.id,
                  courseId: course.id,
                },
              },
            })
          );

      if (!isEnrolled) {
        return NextResponse.json(
          { error: "Access denied: You are not authorized to post in this course." },
          { status: 403 }
        );
      }

      const post = await prisma.discussionPost.create({
        data: {
          lessonId,
          userId: currentUser.id,
          content,
        },
        include: { user: true, replies: { include: { user: true } } },
      });
      return NextResponse.json({ success: true, post });
    }

    if (action === "create_reply") {
      if (!postId) {
        return NextResponse.json({ error: "Post ID is required." }, { status: 400 });
      }

      const post = await prisma.discussionPost.findUnique({
        where: { id: postId },
        include: {
          lesson: { include: { module: { include: { course: true } } } },
        },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found." }, { status: 404 });
      }

      const course = post.lesson.module.course;
      const isStaff =
        currentUser.role === "ADMIN" ||
        currentUser.role === "SUPERADMIN" ||
        course.tutorId === currentUser.id;

      const isEnrolled = isStaff
        ? true
        : Boolean(
            await prisma.enrollment.findUnique({
              where: {
                studentId_courseId: {
                  studentId: currentUser.id,
                  courseId: course.id,
                },
              },
            })
          );

      if (!isEnrolled) {
        return NextResponse.json(
          { error: "Access denied: You are not authorized to reply in this course." },
          { status: 403 }
        );
      }

      const reply = await prisma.discussionReply.create({
        data: {
          postId,
          userId: currentUser.id,
          content,
        },
        include: { user: true },
      });
      return NextResponse.json({ success: true, reply });
    }

    if (action === "delete_post") {
      if (!postId) {
        return NextResponse.json({ error: "Post ID is required." }, { status: 400 });
      }

      const post = await prisma.discussionPost.findUnique({
        where: { id: postId },
        include: { lesson: { include: { module: { include: { course: true } } } } },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found." }, { status: 404 });
      }

      const course = post.lesson.module.course;
      const canDelete =
        post.userId === currentUser.id ||
        course.tutorId === currentUser.id ||
        currentUser.role === "ADMIN" ||
        currentUser.role === "SUPERADMIN";

      if (!canDelete) {
        return NextResponse.json({ error: "Unauthorized to delete this post." }, { status: 403 });
      }

      await prisma.discussionPost.delete({ where: { id: postId } });
      return NextResponse.json({ success: true, deletedPostId: postId });
    }

    return NextResponse.json({ error: "Invalid discussion action." }, { status: 400 });
  } catch (error: any) {
    console.error("[DISCUSSION API ERROR]", error);
    return NextResponse.json({ error: "Discussion failed." }, { status: 500 });
  }
}
