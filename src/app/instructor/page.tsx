import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InstructorClient } from "./InstructorClient";
import { summarizeScores, scorePercent } from "@/lib/grading";

export const revalidate = 0;

interface InstructorStudioPageProps {
  searchParams?: { tab?: string };
}

export default async function InstructorStudioPage({ searchParams }: InstructorStudioPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }
  if (currentUser.role === "STUDENT") {
    redirect("/my-courses");
  }

  const validTabs = ["dashboard", "classes", "submissions", "students", "announcements", "settings"];
  const initialTab = typeof searchParams?.tab === "string" && validTabs.includes(searchParams.tab)
    ? (searchParams.tab as any)
    : "dashboard";

  const tutorCourses = await prisma.course.findMany({
    where: { tutorId: currentUser.id },
    include: {
      modules: {
        include: {
          lessons: {
            include: {
              assignments: {
                include: {
                  submissions: {
                    include: { student: true, assignment: true },
                    orderBy: { submittedAt: "desc" },
                  },
                },
              },
            },
          },
        },
      },
      enrollments: { include: { student: true } },
      announcements: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Flatten all submissions with context
  const allSubmissions: any[] = [];
  tutorCourses.forEach((c) => {
    c.modules.forEach((m) => {
      m.lessons.forEach((l) => {
        l.assignments.forEach((a) => {
          a.submissions.forEach((sub) => {
            allSubmissions.push({
              ...sub,
              courseTitle: c.title,
              lessonTitle: l.title,
            });
          });
        });
      });
    });
  });

  const totalLessons = tutorCourses.reduce(
    (acc, c) => acc + c.modules.reduce((a, m) => a + m.lessons.length, 0),
    0
  );
  const totalEnrollments = tutorCourses.reduce((acc, c) => acc + c.enrollments.length, 0);
  const publishedCourses = tutorCourses.filter((c) => c.published).length;

  // Real figures only: with no graded work every value is null and the screen says so
  const summary = summarizeScores(
    allSubmissions
      .filter((s) => s.score !== null && s.score !== undefined)
      .map((s) => scorePercent(s.score, s.assignment?.maxScore))
  );

  return (
    <InstructorClient
      currentUser={currentUser}
      tutorCourses={tutorCourses}
      allSubmissions={allSubmissions}
      initialTab={initialTab}
      metrics={{
        totalEnrollments,
        publishedCourses,
        totalSubmissions: allSubmissions.length,
        totalLessons,
        avgScore: summary.average,
        avgGradeLetter: summary.letter,
        passRate: summary.passRate,
        gradeDistribution: summary.distribution,
      }}
    />
  );
}
