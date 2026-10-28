import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNgn } from "@/lib/utils";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const revalidate = 0;

interface PageProps {
  params: { id: string };
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    GRADED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ACTIVE: "bg-purple-50 text-[#4A1A45] border-purple-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    FAILED: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs sm:text-[10px] font-bold normal-case sm:uppercase border ${
        styles[status] || "bg-[#F3EAF2] text-neutral-700 border-rule"
      }`}
    >
      {status}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-rule p-5">
      <p className="text-xs sm:text-[10px] font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider text-neutral-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-black tracking-tight">{value}</p>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/admin/login");
  }
  if (currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN") {
    redirect("/my-courses");
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      faculty: true,
      department: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: { course: { select: { id: true, title: true } } },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        include: { course: { select: { title: true } } },
      },
      submissions: {
        orderBy: { submittedAt: "desc" },
        take: 50,
        include: {
          assignment: {
            select: {
              title: true,
              maxScore: true,
              lesson: { select: { module: { select: { course: { select: { title: true } } } } } },
            },
          },
        },
      },
      _count: { select: { lessonProgress: { where: { completed: true } }, discussionPosts: true } },
    },
  });

  if (!user) {
    notFound();
  }

  const paidTotal = user.payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);
  const graded = user.submissions.filter((s) => s.score !== null);
  const avgPercent =
    graded.length > 0
      ? Math.round(
          (graded.reduce((sum, s) => sum + (s.score || 0) / (s.assignment.maxScore || 100), 0) / graded.length) * 100
        )
      : null;

  return (
    <div className="min-h-screen bg-paper text-neutral-900">
      <header className="bg-[#2D0F2A] border-b border-[#3B1537]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-4 flex items-center justify-between">
          <BrandLogo href="/admin" variant="light" size="sm" />
          <Link
            href="/admin?tab=users"
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-200 hover:text-white"
          >
            Back to users
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-6 py-7 sm:py-8 space-y-5 sm:space-y-6">
        {/* Profile */}
        <section className="bg-white rounded-lg border border-rule p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <span className="text-xs sm:text-[10px] font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider text-[#4A1A45]">{user.role}</span>
              <h1 className="text-2xl font-bold text-black tracking-tight">{user.name}</h1>
              <div className="mt-2 space-y-1 text-sm text-neutral-600">
                <p className="flex items-center gap-2 break-all">
                  {user.email}
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-xs sm:text-[11px] font-semibold text-emerald-700">
                      verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs sm:text-[11px] font-semibold text-amber-700">
                      not verified
                    </span>
                  )}
                </p>
                <p className="flex items-center gap-2">
                  {user.phone || <span className="text-neutral-400">No phone number</span>}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs">
              <div>
                <dt className="font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider text-neutral-400 text-xs sm:text-[10px]">Faculty</dt>
                <dd className="text-neutral-800 font-semibold">{user.faculty || "—"}</dd>
              </div>
              <div>
                <dt className="font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider text-neutral-400 text-xs sm:text-[10px]">Department</dt>
                <dd className="text-neutral-800 font-semibold">{user.department || "—"}</dd>
              </div>
              <div>
                <dt className="font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider text-neutral-400 text-xs sm:text-[10px]">Registered</dt>
                <dd className="text-neutral-800 font-semibold">{formatDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider text-neutral-400 text-xs sm:text-[10px]">Last login</dt>
                <dd className="text-neutral-800 font-semibold">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Headline numbers */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Enrollments" value={user.enrollments.length} />
          <Stat label="Lessons completed" value={user._count.lessonProgress} />
          <Stat label="Average score" value={avgPercent === null ? "—" : `${avgPercent}%`} />
          <Stat label="Total paid" value={formatNgn(paidTotal)} />
        </section>

        {/* Enrollments */}
        <section className="bg-white rounded-lg border border-rule overflow-hidden">
          <h2 className="px-5 sm:px-6 pt-6 pb-3 font-bold text-base text-black">Enrollments</h2>
          {user.enrollments.length === 0 ? (
            <p className="px-5 sm:px-6 pb-6 text-sm text-neutral-500">Not enrolled in any course.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-rule bg-[#F7F2F6] text-neutral-500 font-bold">
                    <th className="p-4">Course</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Enrolled</th>
                    <th className="p-4">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {user.enrollments.map((e) => (
                    <tr key={e.id}>
                      <td className="p-4 font-semibold text-black">{e.course.title}</td>
                      <td className="p-4"><StatusPill status={e.status} /></td>
                      <td className="p-4 text-neutral-500">{formatDate(e.enrolledAt)}</td>
                      <td className="p-4 text-neutral-500">{e.completedAt ? formatDate(e.completedAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Payments */}
        <section className="bg-white rounded-lg border border-rule overflow-hidden">
          <h2 className="px-5 sm:px-6 pt-6 pb-3 font-bold text-base text-black">Payments</h2>
          {user.payments.length === 0 ? (
            <p className="px-5 sm:px-6 pb-6 text-sm text-neutral-500">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-rule bg-[#F7F2F6] text-neutral-500 font-bold">
                    <th className="p-4">Reference</th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {user.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-4 font-mono text-xs sm:text-[11px] text-neutral-700">{p.reference}</td>
                      <td className="p-4 text-black">{p.course.title}</td>
                      <td className="p-4 font-semibold text-black">{formatNgn(p.amount)}</td>
                      <td className="p-4"><StatusPill status={p.status} /></td>
                      <td className="p-4 text-neutral-500">{formatDate(p.paidAt || p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Submissions */}
        <section className="bg-white rounded-lg border border-rule overflow-hidden">
          <h2 className="px-5 sm:px-6 pt-6 pb-3 font-bold text-base text-black">
            Recent submissions <span className="text-neutral-400 font-normal text-xs">(latest 50)</span>
          </h2>
          {user.submissions.length === 0 ? (
            <p className="px-5 sm:px-6 pb-6 text-sm text-neutral-500">No submissions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-y border-rule bg-[#F7F2F6] text-neutral-500 font-bold">
                    <th className="p-4">Assignment</th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Score</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {user.submissions.map((s) => (
                    <tr key={s.id}>
                      <td className="p-4 font-semibold text-black">{s.assignment.title}</td>
                      <td className="p-4 text-neutral-600">{s.assignment.lesson.module.course.title}</td>
                      <td className="p-4 font-semibold text-black">
                        {s.score === null ? "—" : `${s.score} / ${s.assignment.maxScore}`}
                      </td>
                      <td className="p-4"><StatusPill status={s.status} /></td>
                      <td className="p-4 text-neutral-500">{formatDate(s.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
