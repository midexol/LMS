import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import {
  FiBookOpen, FiUser, FiLayers, FiCheckCircle, FiLock, FiArrowRight, FiTag, FiBarChart2,
} from "react-icons/fi";
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
    <div className="min-h-screen bg-neutral-50 text-black pb-20 font-sans">
      <Navbar currentUser={currentUser} />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Course Header Banner */}
        <div className="rounded-3xl bg-white border border-neutral-200 shadow-sm overflow-hidden">
          <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-neutral-950 flex flex-col justify-end p-6 sm:p-8">
            {course.coverImage ? (
              <>
                <img
                  src={course.coverImage}
                  alt={course.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-950 via-neutral-900 to-[#1e130a]">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[140px] font-black text-white/5 select-none pointer-events-none leading-none">
                  {course.category.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <div className="relative text-white space-y-3 z-10">
              <div className="flex flex-wrap gap-2 items-center">
                {course.department && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white text-black shadow-sm">
                    {course.department}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-neutral-700">
                  {course.faculty || course.category}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-neutral-700">
                  {course.level}
                </span>
              </div>
              <h1 className="font-black text-2xl sm:text-4xl text-white leading-tight">
                {course.title}
              </h1>
            </div>
          </div>

          <div className="p-8 space-y-5">
            <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">{course.description}</p>

            <div className="flex flex-wrap gap-6 text-xs font-bold text-neutral-600 pt-4 border-t border-neutral-200">
              <span className="flex items-center gap-1.5">
                <FiUser className="w-4 h-4 text-[#784D28]" />
                Instructor: <strong className="text-black">{course.tutor?.name || "Faculty"}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <FiLayers className="w-4 h-4 text-[#784D28]" />
                {course.modules.length} Modules
              </span>
              <span className="flex items-center gap-1.5">
                <FiBookOpen className="w-4 h-4 text-[#784D28]" />
                {totalLessons} Lessons
              </span>
              <span className="flex items-center gap-1.5">
                <FiBarChart2 className="w-4 h-4 text-[#784D28]" />
                {totalAssignments} Evaluated Assignments
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Curriculum */}
          <div className="lg:col-span-2 p-8 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-6">
            <h2 className="font-black text-xl text-black flex items-center gap-2 border-b border-neutral-200 pb-3">
              <FiBookOpen className="w-5 h-5 text-[#784D28]" />
              Curriculum &amp; Syllabus
            </h2>

            {isWrongDepartment ? (
              <div className="p-8 rounded-2xl bg-neutral-50 border border-neutral-200 text-center space-y-4 my-4">
                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center mx-auto shadow-sm">
                  <FiLock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black">Curriculum Restricted to {course.department}</h3>
                  <p className="text-xs text-neutral-600 max-w-md mx-auto mt-1 leading-relaxed">
                    Under institutional academic structure, syllabus contents, lesson plans, and assignments for this course are isolated exclusively to students enrolled in the <strong>{course.department}</strong> department.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-all shadow-sm"
                  >
                    Browse Courses For {currentUser.department} <FiArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {course.modules.map((module) => (
                  <div key={module.id} className="space-y-2">
                    <h3 className="text-sm font-bold text-black bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-2.5">
                      {module.title}
                    </h3>
                    <div className="pl-4 space-y-1.5 border-l-2 border-neutral-200">
                      {module.lessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-700"
                        >
                          <span className="flex items-center gap-2 font-medium">
                            <FiLock className="w-3.5 h-3.5 text-neutral-400" />
                            {lesson.title}
                          </span>
                          {lesson.assignments.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[#784D28]/10 text-[#784D28] text-[10px] font-bold border border-[#784D28]/30">
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
            <div className="p-7 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-5 sticky top-24">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1">Tuition Fee</span>
                <span className="font-black text-3xl text-black">
                  {course.price === 0 ? "Free" : formatNgn(course.price)}
                </span>
              </div>

              {enrollment ? (
                enrollment.status === "ACTIVE" ? (
                  <Link
                    href={`/student/courses/${course.id}`}
                    className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    Continue Learning <FiArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="w-full py-3 rounded-full bg-black text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                    <FiCheckCircle className="w-4 h-4 text-white" /> Course Completed
                  </div>
                )
              ) : !currentUser ? (
                <div className="space-y-2.5">
                  <Link
                    href="/login"
                    className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    Sign In to Enroll
                  </Link>
                  <Link
                    href="/signup"
                    className="w-full py-3 rounded-full border border-neutral-300 bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neutral-50 transition-all"
                  >
                    Create Free Account
                  </Link>
                </div>
              ) : isWrongDepartment ? (
                <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-black text-xs font-semibold space-y-2">
                  <p className="font-bold">Department Restricted Course</p>
                  <p className="text-neutral-600">
                    This course is designated exclusively for <strong>{course.department}</strong>. You are currently registered under <strong>{currentUser.department}</strong>.
                  </p>
                  <Link
                    href="/courses"
                    className="block text-center py-2.5 rounded-full bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-all"
                  >
                    View Your Department Courses
                  </Link>
                </div>
              ) : activeEnrollment && activeEnrollment.courseId !== course.id ? (
                <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-black text-xs font-semibold space-y-2">
                  <p className="font-bold">Single Course Lock Active</p>
                  <p className="text-neutral-600">Complete your currently active course before registering for another course.</p>
                  <Link
                    href={`/student/courses/${activeEnrollment.courseId}`}
                    className="block text-center py-2.5 rounded-full bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-neutral-800 transition-all"
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

              <div className="space-y-2.5 pt-3 border-t border-neutral-200 text-xs text-neutral-600 font-medium">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-black shrink-0" />
                  Automated criteria evaluations with instant feedback
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-black shrink-0" />
                  Instructor grade override &amp; rubric evaluation
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-black shrink-0" />
                  Lesson Q&amp;A discussion forums
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-black shrink-0" />
                  Supplementary resource downloads
                </div>
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-black shrink-0" />
                  Official academic transcript recorded
                </div>
              </div>
            </div>

            <Link
              href="/courses"
              className="flex items-center gap-2 text-xs text-neutral-500 hover:text-black font-semibold transition-all px-2"
            >
              <FiTag className="w-3.5 h-3.5" /> Return to Course Catalog
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
