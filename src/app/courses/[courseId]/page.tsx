import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { PiArrowRight, PiBookOpen, PiCheckCircle, PiLock, PiTag } from "react-icons/pi";
import { CourseEnrollmentAction } from "@/components/course/CourseEnrollmentAction";
import { formatNgn } from "@/lib/utils";



export const revalidate = 0;

interface PageProps {
  params: { courseId: string };
}

export default async function CoursePreviewPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();

  const course = await prisma.course.findUnique({
    where: { id: params.courseId, published: true },
    include: {
      tutor: true,
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, assignments: { select: { id: true } } },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalAssignments = course.modules.reduce(
    (acc, m) => acc + m.lessons.reduce((a, l) => a + l.assignments.length, 0),
    0
  );

  // Check if student is already enrolled
  const enrollment = currentUser
    ? await prisma.enrollment.findUnique({
        where: {
          studentId_courseId: { studentId: currentUser.id, courseId: course.id },
        },
      })
    : null;

  const activeEnrollment = currentUser
    ? await prisma.enrollment.findFirst({
        where: { studentId: currentUser.id, status: "ACTIVE" },
        include: { course: true },
      })
    : null;

  const isWrongDepartment =
    currentUser?.role === "STUDENT" &&
    Boolean(currentUser.department) &&
    Boolean(course.department) &&
    course.department !== currentUser.department;

  return (
    <div className="min-h-screen bg-paper text-black pb-20 font-sans">
      <Navbar currentUser={currentUser} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Course header */}
        <div className="rounded-lg bg-white border border-rule overflow-hidden">
          {course.coverImage && (
            <img
              src={course.coverImage}
              alt={course.title}
              className="w-full h-56 sm:h-72 object-cover"
            />
          )}
          <div className="px-6 sm:px-8 pt-8">
            <p className="text-sm text-neutral-500">
              {[course.department, course.faculty || course.category, course.level].filter(Boolean).join(" · ")}
            </p>
            <h1 className="mt-2 font-heading font-semibold text-3xl sm:text-4xl text-black leading-tight">
              {course.title}
            </h1>
          </div>

          <div className="px-6 sm:px-8 pt-4 pb-8 space-y-5">
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">{course.description}</p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600 pt-4 border-t border-rule">
              <span>Instructor: <strong className="text-black">{course.tutor?.name || "Faculty"}</strong>
              </span>
              <span>{course.modules.length} modules
              </span>
              <span>{totalLessons} lessons
              </span>
              <span>{totalAssignments} graded assignments
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Curriculum */}
          <div className="lg:col-span-2 p-8 rounded-lg bg-white border border-rule space-y-6">
            <h2 className="font-bold text-xl text-black flex items-center gap-2 border-b border-rule pb-3">
              <PiBookOpen className="w-5 h-5 text-[#4A1A45]" />
              Curriculum &amp; Syllabus
            </h2>

            {isWrongDepartment ? (
              <div className="p-8 rounded-lg bg-[#F7F2F6] border border-rule text-center space-y-4 my-4">
                <div className="w-12 h-12 rounded-full bg-[#4A1A45] text-white flex items-center justify-center mx-auto">
                  <PiLock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black">Curriculum Restricted to {course.department}</h3>
                  <p className="text-xs text-neutral-600 max-w-md mx-auto mt-1 leading-relaxed">
                    Lessons, files and assignments for this course are available only to students enrolled in the <strong>{course.department}</strong> department.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[#4A1A45] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#3B1537] transition-all"
                  >
                    Browse Courses For {currentUser.department} <PiArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {course.modules.map((module) => (
                  <div key={module.id} className="space-y-2">
                    <h3 className="text-sm font-bold text-black bg-[#F7F2F6] border border-rule rounded-lg px-4 py-2.5">
                      {module.title}
                    </h3>
                    <div className="pl-4 space-y-1.5 border-l-2 border-rule">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-rule text-xs text-neutral-700"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <PiLock className="w-3.5 h-3.5 text-neutral-400" />
                            {lesson.title}
                          </span>
                          {lesson.assignments.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-[#4A1A45]/10 text-[#4A1A45] text-[10px] font-bold border border-[#4A1A45]/30">
                              Assignment
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Enrollment Card */}
          <div className="space-y-4">
            <div className="p-7 rounded-lg bg-white border border-rule space-y-5 sticky top-24">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">Tuition Fee</span>
                <span className="font-bold text-3xl text-black">
                  {course.price === 0 ? "Free" : formatNgn(course.price)}
                </span>
              </div>

              {enrollment ? (
                enrollment.status === "ACTIVE" ? (
                  <Link
                    href={`/student/courses/${course.id}`}
                    className="w-full py-3 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    Continue Learning <PiArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="w-full py-3 rounded-md bg-[#4A1A45] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                    <PiCheckCircle className="w-4 h-4 text-white" /> Course Completed
                  </div>
                )
              ) : !currentUser ? (
                <div className="space-y-2.5">
                  <Link
                    href="/login"
                    className="w-full py-3 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    Sign In to Enroll
                  </Link>
                  <Link
                    href="/signup"
                    className="w-full py-3 rounded-md border border-neutral-300 bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#F7F2F6] transition-all"
                  >
                    Create Free Account
                  </Link>
                </div>
              ) : isWrongDepartment ? (
                <div className="p-4 rounded-lg bg-[#F3EAF2] border border-rule text-black text-xs font-semibold space-y-2">
                  <p className="font-bold">Department Restricted Course</p>
                  <p className="text-neutral-600">
                    This course is designated exclusively for <strong>{course.department}</strong>. You are currently registered under <strong>{currentUser.department}</strong>.
                  </p>
                  <Link
                    href="/courses"
                    className="block text-center py-2.5 rounded-md bg-[#4A1A45] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#3B1537] transition-all"
                  >
                    View Your Department Courses
                  </Link>
                </div>
              ) : activeEnrollment && activeEnrollment.courseId !== course.id ? (
                <div className="p-4 rounded-lg bg-[#F3EAF2] border border-rule text-black text-xs font-semibold space-y-2">
                  <p className="font-bold">Single Course Lock Active</p>
                  <p className="text-neutral-600">Complete your currently active course before registering for another course.</p>
                  <Link
                    href={`/student/courses/${activeEnrollment.courseId}`}
                    className="block text-center py-2.5 rounded-md bg-[#4A1A45] text-white font-bold text-xs uppercase tracking-wider hover:bg-[#3B1537] transition-all"
                  >
                    Go to Active Course
                  </Link>
                </div>
              ) : (
                <CourseEnrollmentAction
                  currentUser={currentUser}
                  course={course}
                  activeEnrollment={
                    activeEnrollment
                      ? {
                          id: activeEnrollment.id,
                          courseId: activeEnrollment.courseId,
                          courseTitle: activeEnrollment.course.title,
                        }
                      : null
                  }
                />
              )}

              <div className="space-y-2.5 pt-3 border-t border-rule text-xs text-neutral-600 font-medium">
                <div className="flex items-center gap-2">
                  <PiCheckCircle className="w-4 h-4 text-[#4A1A45] shrink-0" />
                  Automated criteria evaluations with instant feedback
                </div>
                <div className="flex items-center gap-2">
                  <PiCheckCircle className="w-4 h-4 text-[#4A1A45] shrink-0" />
                  Instructor grade override &amp; rubric evaluation
                </div>
                <div className="flex items-center gap-2">
                  <PiCheckCircle className="w-4 h-4 text-[#4A1A45] shrink-0" />
                  Lesson Q&amp;A discussion forums
                </div>
                <div className="flex items-center gap-2">
                  <PiCheckCircle className="w-4 h-4 text-[#4A1A45] shrink-0" />
                  Supplementary resource downloads
                </div>
                <div className="flex items-center gap-2">
                  <PiCheckCircle className="w-4 h-4 text-[#4A1A45] shrink-0" />
                  Progress and grades saved to your profile
                </div>
              </div>
            </div>

            <Link
              href="/courses"
              className="flex items-center gap-2 text-xs text-neutral-500 hover:text-black font-semibold transition-all px-2"
            >
              <PiTag className="w-3.5 h-3.5" /> Return to Course Catalog
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
