import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { action, lessonId, postId, content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Content cannot be empty." }, { status: 400 });
    }

    if (action === "create_post") {
      if (!lessonId) {
        return NextResponse.json({ error: "Lesson ID is required." }, { status: 400 });
      }

      // SECURITY: Verify the user is enrolled in the course that contains this lesson
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

      // SECURITY: Verify the user is enrolled in the course this post belongs to
      const post = await prisma.discussionPost.findUnique({
        where: { id: postId },
        include: {
          lesson: { include: { module: { include: { course: true } } } },
        },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found." }, { status: 404 });
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: {
            studentId: currentUser.id,
            courseId: post.lesson.module.course.id,
          },
        },
      });

      if (!enrollment) {
        return NextResponse.json(
          { error: "Access denied: You are not enrolled in this course." },
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

    return NextResponse.json({ error: "Invalid discussion action." }, { status: 400 });
  } catch (error: any) {
    console.error("[DISCUSSION API ERROR]", error);
    return NextResponse.json({ error: error.message || "Discussion failed." }, { status: 500 });
  }
}
