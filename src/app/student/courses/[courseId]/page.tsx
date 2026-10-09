import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StudentPlayerNavbar } from "@/components/student/StudentPlayerNavbar";
import { CoursePlayerClient } from "./CoursePlayerClient";
import { notFound, redirect } from "next/navigation";
import { resolveStorageUrl } from "@/lib/storage";

export const revalidate = 0;

interface PageProps {
  params: {
    courseId: string;
  };
}

export default async function CoursePlayerPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();

  // LOOPHOLE FIX: Redirect unauthenticated guests to login
  if (!currentUser) {
    redirect("/login");
  }

  // Course player is for students only
  if (currentUser.role === "TUTOR" || currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN") {
    redirect(currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN" ? "/admin" : "/instructor");
  }


  const courseData = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            include: {
              assignments: {
                include: {
                  submissions: {
                    where: { studentId: currentUser.id },
                    orderBy: { submittedAt: "desc" },
                  },
                },
              },
              lessonProgress: {
                where: { studentId: currentUser.id },
              },
              discussionPosts: {
                include: {
                  user: true,
                  replies: {
                    include: { user: true },
                    orderBy: { createdAt: "asc" },
                  },
                },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });

  if (!courseData) {
    notFound();
  }

  // LOOPHOLE FIX: Check if student is actually enrolled in this course
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: currentUser.id,
        courseId: courseData.id,
      },
    },
  });

  if (!enrollment) {
    redirect("/");
  }

  // Lesson media is private: sign short-lived links for this enrolled student only
  const course = {
    ...courseData,
    modules: await Promise.all(
      courseData.modules.map(async (mod) => ({
        ...mod,
        lessons: await Promise.all(
          mod.lessons.map(async (lesson) => ({
            ...lesson,
            videoUrl: await resolveStorageUrl(lesson.videoUrl),
            resourceUrl: await resolveStorageUrl(lesson.resourceUrl),
          }))
        ),
      }))
    ),
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 pb-16">
      <StudentPlayerNavbar
        courseTitle={course.title}
        category={course.category}
        studentName={currentUser.name}
      />
      <CoursePlayerClient course={course} enrollment={enrollment} student={currentUser} />
    </div>
  );
}
