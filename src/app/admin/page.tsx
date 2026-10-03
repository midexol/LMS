import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FiShield, FiAlertCircle, FiLogOut, FiArrowLeft } from "react-icons/fi";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const revalidate = 0;

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  // If not logged in at all, redirect to admin login
  if (!currentUser) {
    redirect("/admin/login");
  }

  // If logged in but not an ADMIN, display a clear role barrier with account switch action
  if (currentUser.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6 text-black">
        <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm text-center space-y-6">
          <div className="inline-flex p-4 rounded-2xl bg-neutral-100 text-black border border-neutral-200">
            <FiShield className="w-10 h-10 text-[#784D28]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-black tracking-tight">Admin Privileges Required</h1>
            <p className="text-xs text-neutral-600 leading-relaxed">
              You are currently signed in as <strong className="text-black">{currentUser.name}</strong> (
              <span className="text-[#784D28] font-bold uppercase">{currentUser.role}</span>). This portal is strictly restricted to platform administrators.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-left text-xs space-y-1">
            <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Signed In Email</span>
            <p className="text-black font-semibold">{currentUser.email}</p>
          </div>

          <div className="space-y-3 pt-2">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <FiLogOut className="w-4 h-4" />
                Sign Out &amp; Log In as Admin
              </button>
            </form>

            <Link
              href="/"
              className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <FiArrowLeft className="w-3.5 h-3.5" />
              Return to Course Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch comprehensive platform data for the superadmin
  const [users, courses, enrollments, submissions] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            enrollments: true,
            submissions: true,
            courses: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.findMany({
      include: {
        tutor: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
            announcements: true,
          },
        },
        modules: {
          include: {
            _count: {
              select: { lessons: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.enrollment.findMany({
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        course: {
          select: { id: true, title: true, price: true, category: true },
        },
      },
      orderBy: { enrolledAt: "desc" },
      take: 50,
    }),
    prisma.submission.findMany({
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        assignment: {
          include: {
            lesson: {
              include: {
                module: {
                  include: {
                    course: {
                      select: { id: true, title: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
    }),
  ]);

  // Aggregate metrics
  const totalRevenue = enrollments.reduce((sum, e) => sum + (e.course?.price || 0), 0);
  const totalStudents = users.filter((u) => u.role === "STUDENT").length;
  const totalTutors = users.filter((u) => u.role === "TUTOR").length;
  const activeEnrollmentsCount = enrollments.filter((e) => e.status === "ACTIVE").length;
  const completedEnrollmentsCount = enrollments.filter((e) => e.status === "COMPLETED").length;

  return (
    <AdminDashboardClient
      currentUser={currentUser}
      initialUsers={users}
      initialCourses={courses}
      initialEnrollments={enrollments}
      initialSubmissions={submissions}
      metrics={{
        totalUsers: users.length,
        totalStudents,
        totalTutors,
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.published).length,
        totalEnrollments: enrollments.length,
        activeEnrollmentsCount,
        completedEnrollmentsCount,
        totalSubmissions: submissions.length,
        totalRevenue,
      }}
    />
  );
}
