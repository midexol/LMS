import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PASS_MARK_PERCENT } from "@/lib/grading";
import { Navbar } from "@/components/ui/Navbar";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FiBookOpen, FiArrowRight, FiCheckCircle, FiClock, FiAward, FiLayers,
} from "react-icons/fi";

export const revalidate = 0;

export default async function MyCoursesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.role !== "STUDENT") redirect("/instructor");

  // Students who signed up with Google (or older accounts) still need to choose a faculty and department
  if (!currentUser.faculty || !currentUser.department) redirect("/onboarding");

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: currentUser.id },
    include: {
      course: {
        include: {
          tutor: { select: { name: true } },
          modules: {
            include: {
              lessons: {
                include: { lessonProgress: { where: { studentId: currentUser.id } } },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const activeEnrollment = enrollments.find((e) => e.status === "ACTIVE");
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED");

  function getProgress(enrollment: (typeof enrollments)[0]) {
    const allLessons = enrollment.course.modules.flatMap((m) => m.lessons);
    const completed = allLessons.filter((l) => l.lessonProgress?.[0]?.completed).length;
    return { completed, total: allLessons.length };
  }

  return (
    <div className="min-h-screen bg-paper text-black pb-20 font-sans">
      <Navbar currentUser={currentUser} />

      {/* Page Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <span className="text-[11px] font-bold text-[#4A1A45] uppercase tracking-wider">Student Academic Record</span>
          <h1 className="font-bold text-3xl text-black mt-1">My Enrolled Courses</h1>
          <p className="text-xs text-neutral-500 mt-1">Track your active course learning trajectory and review completed curriculum milestones.</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Active Course */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FiClock className="w-4 h-4 text-[#4A1A45]" />
            <h2 className="font-bold text-lg text-black">Active Course Enrollment</h2>
          </div>

          {activeEnrollment ? (() => {
            const { completed, total } = getProgress(activeEnrollment);
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const lessonCount = total;

            return (
              <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                <div className="p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#4A1A45]/10 text-[#4A1A45] border border-[#4A1A45]/30 uppercase">
                          In Progress
                        </span>
                        <span className="text-xs text-neutral-500">{activeEnrollment.course.category}</span>
                      </div>
                      <h3 className="font-bold text-2xl text-black">{activeEnrollment.course.title}</h3>
                      <p className="text-xs text-neutral-500">
                        Instructor: <strong className="text-black">{activeEnrollment.course.tutor?.name}</strong> · Enrolled {formatDate(activeEnrollment.enrolledAt)}
                      </p>
                    </div>
                    <Link
                      href={`/student/courses/${activeEnrollment.courseId}`}
                      className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Continue Learning <FiArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-neutral-600">Curriculum Progress</span>
                      <span className="text-[#4A1A45] font-bold">{pct}% ({completed}/{total} lessons)</span>
                    </div>
                    <div className="w-full bg-[#F7F2F6] rounded-full h-2.5 overflow-hidden p-0.5">
                      <div
                        className="bg-[#4A1A45] h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="pt-4 border-t border-neutral-200 flex items-center gap-6 text-xs text-neutral-600">
                    <div className="flex items-center gap-1.5">
                      <FiLayers className="w-3.5 h-3.5 text-[#4A1A45]" />
                      <span>{activeEnrollment.course.modules.length} modules</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FiBookOpen className="w-3.5 h-3.5 text-[#4A1A45]" />
                      <span>{lessonCount} lessons total</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FiCheckCircle className="w-3.5 h-3.5 text-[#4A1A45]" />
                      <span>{completed} completed</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="bg-white rounded-lg border border-neutral-200 py-14 text-center space-y-4">
              <div className="w-14 h-14 rounded-lg bg-[#F7F2F6] flex items-center justify-center mx-auto text-neutral-400">
                <FiBookOpen className="w-7 h-7 text-[#4A1A45]" />
              </div>
              <div>
                <p className="font-bold text-base text-black">No Active Course Enrollment</p>
                <p className="text-xs text-neutral-500 mt-1">Browse our academic catalog to register for your next learning track.</p>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Browse Course Catalog <FiArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* Completed Courses */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FiAward className="w-4 h-4 text-[#4A1A45]" />
            <h2 className="font-bold text-lg text-black">
              Completed Curriculum ({completedEnrollments.length})
            </h2>
          </div>

          {completedEnrollments.length === 0 ? (
            <div className="bg-white rounded-lg border border-neutral-200 py-10 text-center">
              <p className="text-xs text-neutral-500 italic">No completed courses yet. Keep working towards your {PASS_MARK_PERCENT}% average pass mark!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedEnrollments.map((e) => {
                const { completed, total } = getProgress(e);
                return (
                  <div
                    key={e.id}
                    className="bg-white rounded-lg border border-neutral-200 p-6 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#4A1A45] uppercase">{e.course.category}</span>
                        <h3 className="font-bold text-base text-black mt-0.5">{e.course.title}</h3>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#4A1A45] text-white shrink-0">
                        Completed
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-black font-semibold">
                      <FiCheckCircle className="w-3.5 h-3.5 text-[#4A1A45]" /> Completed {formatDate(e.completedAt)}
                    </div>
                    <p className="text-[11px] text-neutral-500">{completed}/{total} lessons · Instructor: {e.course.tutor?.name}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                      <Link
                        href={`/student/courses/${e.courseId}`}
                        className="text-xs text-black font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <FiAward className="w-3.5 h-3.5 text-[#4A1A45]" /> View Course &amp; Certificate
                      </Link>
                      <Link
                        href={`/courses/${e.courseId}`}
                        className="text-xs text-[#4A1A45] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        Syllabus <FiArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
