import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import {  } from "react-icons/pi";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const revalidate = 0;

interface AdminPageProps {
  searchParams?: { tab?: string };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const currentUser = await getCurrentUser();

  // If not logged in at all, redirect to admin login
  if (!currentUser) {
    redirect("/admin/login");
  }

  // If logged in but not an ADMIN/SUPERADMIN, users cannot access or even see admin
  if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN") {
    redirect("/my-courses");
  }

  const validTabs = ["overview", "users", "courses", "enrollments", "submissions", "messages", "settings"];
  const initialTab = typeof searchParams?.tab === "string" && validTabs.includes(searchParams.tab)
    ? (searchParams.tab as any)
    : "overview";

  // Fetch comprehensive platform data for the superadmin
  const [users, courses, enrollments, submissions, messages] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        faculty: true,
        department: true,
        phone: true,
        lastLoginAt: true,
        emailVerified: true,
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
          select: { id: true, name: true, email: true, faculty: true, department: true },
        },
        course: {
          select: { id: true, title: true, price: true, category: true, faculty: true, department: true },
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
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
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
      initialMessages={messages}
      initialTab={initialTab}
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
