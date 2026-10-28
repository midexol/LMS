"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CourseBuilderWizard } from "@/components/tutor/CourseBuilderWizard";
import { TutorSubmissionsReviewer } from "@/components/tutor/TutorSubmissionsReviewer";
import { AnnouncementManager } from "@/components/tutor/AnnouncementManager";
import { PiBook, PiChatCircle, PiFileText, PiGear, PiSquaresFour, PiUsers } from "react-icons/pi";
import { formatNgn } from "@/lib/utils";
import { PASS_MARK_PERCENT } from "@/lib/grading";
import { BrandLogo } from "@/components/ui/BrandLogo";


interface InstructorClientProps {
  currentUser: any;
  tutorCourses: any[];
  allSubmissions: any[];
  metrics: {
    totalEnrollments: number;
    publishedCourses: number;
    totalSubmissions: number;
    totalLessons: number;
    avgScore?: number | null;
    avgGradeLetter?: string | null;
    passRate?: number | null;
    gradeDistribution?: { pctA: number; pctB: number; pctBelow80: number } | null;
  };
  initialTab?: "dashboard" | "classes" | "submissions" | "students" | "announcements" | "settings";
}

export function InstructorClient({
  currentUser,
  tutorCourses,
  allSubmissions,
  metrics,
  initialTab = "dashboard",
}: InstructorClientProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "classes" | "submissions" | "students" | "announcements" | "settings">(initialTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);

  const switchTab = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const pendingSubmissions = allSubmissions.filter((s) => s.score === null);
  const gradedSubmissions = allSubmissions.filter((s) => s.score !== null);

  // No graded work yet means no figures: never show invented averages or grade splits
  const avgScore = metrics.avgScore ?? null;
  const avgGradeLetter = metrics.avgGradeLetter ?? null;
  const passRate = metrics.passRate ?? null;
  const gradeDistribution = metrics.gradeDistribution ?? null;
  // Zeros draw an empty ring when there is no data; the labels show a dash instead of a percentage
  const dist = gradeDistribution ?? { pctA: 0, pctB: 0, pctBelow80: 0 };
  const avgLabel = avgScore === null ? "No grades yet" : `${avgScore}% (${avgGradeLetter})`;

  const currentDateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#FBFBFB] text-black flex">
      {/* ───────────────── LEFT SIDEBAR (COMMAND CENTER - RICH BLACK) ───────────────── */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1E0A1C] text-white border-r border-[#3B1537] p-5 flex flex-col justify-between transition-transform duration-300  lg:shadow-none`}
      >
        <div className="space-y-6">
          {/* Logo & School Header */}
          <div className="px-1">
            <BrandLogo href="/instructor" variant="light" size="sm" />
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1.5 pl-9">
              Instructor Studio
            </p>
          </div>

          {/* TEACHING Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-3 mb-2">Teaching</p>
            {[
              { id: "dashboard", label: "Dashboard", icon: PiSquaresFour },
              { id: "classes", label: "My Classes", icon: PiBook },
              { id: "submissions", label: "Assignments", icon: PiFileText },
              { id: "students", label: "Students", icon: PiUsers },
              { id: "announcements", label: "Announcements", icon: PiChatCircle },
              { id: "settings", label: "Settings", icon: PiGear },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => switchTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    active
                      ? "bg-white text-[#4A1A45]  font-bold"
                      : "text-neutral-400 hover:text-white hover:bg-[#2D0F2A]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* PLATFORM Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-3 mb-2">Platform</p>
            <Link
              href="/courses"
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white hover:bg-[#2D0F2A] transition-all"
            >
              <span>Course Catalog</span>
            </Link>
          </div>
        </div>

        {/* Lower Sidebar Widgets */}
        <div className="space-y-4 pt-4 border-t border-[#3B1537]">
          {/* Cohort Health / Learning Activity Widget */}
          <div className="bg-neutral-900/90 rounded-lg p-4 border border-[#3B1537] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Active Learners</span>
              <span className="text-[10px] text-[#D6BDD4] font-semibold">{metrics.totalEnrollments} enrolled</span>
            </div>
            <div className="flex items-center gap-1.5">
              {tutorCourses.flatMap((c) => c.enrollments.map((e: any) => e.student?.name || "Student")).slice(0, 3).map((name: string, i: number) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white bg-[#4A1A45] border border-[#4A1A45]"
                >
                  {name.charAt(0)}
                </div>
              ))}
              {metrics.totalEnrollments > 3 && (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-neutral-300 bg-[#3B1537] border border-[#4A1A45]">
                  +{metrics.totalEnrollments - 3}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="w-full bg-[#3B1537] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#D6BDD4] h-full rounded-full transition-all duration-500"
                  style={{ width: `${allSubmissions.length > 0 ? Math.min(100, Math.round((gradedSubmissions.length / allSubmissions.length) * 100)) : 100}%` }}
                />
              </div>
              <p className="text-[10px] text-neutral-400">
                {allSubmissions.length > 0
                  ? `${Math.round((gradedSubmissions.length / allSubmissions.length) * 100)}% submission review rate`
                  : "All assignments up to date"}
              </p>
            </div>
          </div>

          {/* Instructor Identity Card with Direct Sign Out (NO redundant settings trigger) */}
          <div className="bg-neutral-900/90 rounded-lg p-3 border border-[#3B1537] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#4A1A45] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-neutral-400 truncate">Instructor</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[#3B1537] transition-colors shrink-0"
              title="Sign Out"
            >
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ───────────────── MAIN CANVAS ───────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="px-8 py-5 flex items-center justify-between gap-4 bg-white border-b border-rule">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl border border-rule text-black"
              onClick={() => setSidebarOpen(true)}
            >
            </button>
            <div>
              <h1 className="font-bold text-2xl text-black leading-tight">Dashboard</h1>
              <p className="text-xs text-neutral-500 font-medium">{currentDateStr}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/courses"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-neutral-300 text-xs font-bold text-black hover:border-black transition-all"
            >
              <span>Course Catalog</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#4A1A45] text-white hover:bg-[#3B1537] text-xs font-bold transition-all"
              title="Sign Out"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="px-8 py-8 space-y-6">
          {activeTab === "dashboard" && (
            <>
              {/* 1. HERO BANNER - PURE JET BLACK WITH BROWN GRADIENT ACCENT */}
              <div
                className="rounded-lg p-8 text-white relative overflow-hidden"
                style={{
                  background: "linear-gradient(115deg, #1E0A1C 0%, #2D0F2A 55%, #4A1A45 85%, #6B2764 100%)",
                }}
              >
                <div className="relative max-w-xl space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D6BDD4]">Your Studio</p>
                  <h2 className="font-bold text-3xl leading-snug">
                    Welcome back, {currentUser.name.split(" ")[0]}
                  </h2>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {pendingSubmissions.length > 0 ? (
                      <>
                        Your grading queue has{" "}
                        <strong className="text-white underline decoration-[#D6BDD4]">
                          {pendingSubmissions.length} {pendingSubmissions.length === 1 ? "submission" : "submissions"}
                        </strong>{" "}
                        waiting for review.
                      </>
                    ) : (
                      "Nothing is waiting for review right now."
                    )}
                  </p>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      onClick={() => setActiveTab("classes")}
                      className="px-5 py-2.5 rounded-md bg-white text-[#4A1A45] hover:bg-[#F7F2F6] font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      Create assignment
                    </button>
                    <button
                      onClick={() => setActiveTab("submissions")}
                      className="px-5 py-2.5 rounded-md border border-white/40 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      Download report
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. STAT CARDS (EXECUTIVE HIGH-CONTRAST METRICS) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    value: metrics.totalEnrollments,
                    label: "Students Enrolled",
                    sub: "Directly under your instruction",
                  },
                  {
                    value: `${metrics.publishedCourses || tutorCourses.filter((c) => c.published).length} / ${tutorCourses.length}`,
                    label: "Published Courses",
                    sub: "Curriculum modules live",
                  },
                  {
                    value: pendingSubmissions.length,
                    label: "Pending Review",
                    sub: "Submissions awaiting feedback",
                  },
                  {
                    value: avgLabel,
                    label: "Average Cohort Score",
                    sub: "Aggregated performance",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-[#1E0A1C] text-white rounded-lg p-6 border border-[#3B1537] flex flex-col justify-between space-y-4 hover:border-[#4A1A45] transition-all"
                  >
                    <p className="text-xs text-neutral-400 font-semibold tracking-wide uppercase">{stat.label}</p>
                    <div>
                      <div className="text-2xl font-bold text-white tracking-tight">{stat.value}</div>
                      <p className="text-[11px] text-neutral-400 mt-1">{stat.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. VISUALIZATION ROW: MODERN COURSE THROUGHPUT & GRADE DISTRIBUTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Course Performance & Cohort Engagement */}
                <div className="lg:col-span-2 bg-white rounded-lg p-6 sm:p-8 border border-rule space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rule">
                    <div>
                      <h3 className="font-bold text-lg text-black tracking-tight">Course Enrollment &amp; Evaluation Throughput</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">Live student enrollment vs submission volume across your courses</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#4A1A45] inline-block" />
                        <span>Enrolled Students</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#4A1A45] inline-block" />
                        <span>Evaluations Logged</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Executive KPI Capsules */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-lg bg-[#F7F2F6] border border-rule flex items-center gap-3.5">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total Learners</span>
                        <span className="text-lg font-bold text-neutral-900 leading-tight">
                          {metrics.totalEnrollments} <span className="text-xs font-semibold text-neutral-500">enrolled</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F2F6] border border-rule flex items-center gap-3.5">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Submissions Logged</span>
                        <span className="text-lg font-bold text-[#4A1A45] leading-tight">
                          {allSubmissions.length} <span className="text-xs font-semibold text-neutral-500">total</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-[#F7F2F6] border border-rule flex items-center gap-3.5">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Cohort Mean Score</span>
                        <span className="text-lg font-bold text-neutral-900 leading-tight">
                          {avgScore === null ? (
                            <span className="text-sm font-semibold text-neutral-500">No grades yet</span>
                          ) : (
                            <>
                              {avgScore}% <span className="text-xs font-semibold text-neutral-500">({avgGradeLetter})</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Course-by-Course Comparative Dual Bar Tracks */}
                  <div className="space-y-4 pt-2">
                    <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Course Performance Breakdown</p>
                    {tutorCourses.length === 0 ? (
                      <div className="p-8 text-center bg-[#F7F2F6] rounded-lg border border-dashed border-rule">
                        <p className="text-xs text-neutral-500">No courses created yet. Use the Course Builder tab to publish your first course.</p>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {tutorCourses.map((c) => {
                          const courseSubs = allSubmissions.filter((s) => s.courseTitle === c.title);
                          const courseGraded = courseSubs.filter((s) => s.score !== null);
                          const cScore = courseGraded.length > 0
                            ? Math.round(
                                courseGraded.reduce((a, s) => a + ((s.score || 0) / (s.assignment?.maxScore || 100)) * 100, 0) /
                                  courseGraded.length
                              )
                            : null;
                          const maxMetric = Math.max(10, ...tutorCourses.map((tc) => Math.max(tc.enrollments.length, allSubmissions.filter((s) => s.courseTitle === tc.title).length)));
                          const enrPct = Math.min(100, Math.round((c.enrollments.length / maxMetric) * 100));
                          const subPct = Math.min(100, Math.round((courseSubs.length / maxMetric) * 100));

                          return (
                            <div key={c.id} className="p-4 rounded-lg bg-[#F7F2F6] border border-rule space-y-2.5 hover:bg-[#F7F2F6] transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-neutral-900 truncate max-w-xs">{c.title}</span>
                                  {c.department && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-rule text-neutral-600 font-semibold">
                                      {c.department}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] font-bold text-neutral-500">
                                  <span className="text-black">{c.enrollments.length} enrolled</span>
                                  <span>·</span>
                                  <span className="text-[#4A1A45]">{courseSubs.length} submissions</span>
                                  <span>·</span>
                                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-mono">
                                    {cScore === null ? "no grades yet" : `${cScore}% avg`}
                                  </span>
                                </div>
                              </div>

                              {/* Dual comparative progress bar */}
                              <div className="space-y-1">
                                <div className="w-full bg-[#E4D5E2]/70 h-2.5 rounded-full overflow-hidden flex gap-1 p-0.5">
                                  <div
                                    className="bg-[#4A1A45] h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(5, enrPct)}%` }}
                                    title={`Enrollments: ${c.enrollments.length}`}
                                  />
                                  <div
                                    className="bg-[#4A1A45] h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(5, subPct)}%` }}
                                    title={`Submissions: ${courseSubs.length}`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Grade Distribution Breakdown */}
                <div className="bg-white rounded-lg p-6 sm:p-8 border border-rule space-y-6 flex flex-col justify-between">
                  <div className="pb-3 border-b border-rule">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-black tracking-tight">Grade Distribution</h3>
                      <span className="text-xs font-bold text-[#4A1A45]">
                        {passRate === null ? "" : `${passRate}% Passing`}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {gradeDistribution ? `Cohort performance against the ${PASS_MARK_PERCENT}% pass mark` : "No graded submissions yet. Results appear here as work is graded."}
                    </p>
                  </div>

                  {/* Clean SVG Donut with Clear Central Metric */}
                  <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                    {(() => {
                      const dashA = Math.round((dist.pctA / 100) * 239);
                      const dashB = Math.round((dist.pctB / 100) * 239);
                      const dashC = Math.max(0, 239 - dashA - dashB);
                      return (
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
                          <circle cx="50" cy="50" r="38" stroke="#F4F4F5" strokeWidth="12" fill="none" />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#000000"
                            strokeWidth="12"
                            strokeDasharray={`${dashA} 239`}
                            strokeDashoffset="0"
                            fill="none"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#4A1A45"
                            strokeWidth="12"
                            strokeDasharray={`${dashB} 239`}
                            strokeDashoffset={`-${dashA}`}
                            fill="none"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#D4D4D8"
                            strokeWidth="12"
                            strokeDasharray={`${dashC} 239`}
                            strokeDashoffset={`-${dashA + dashB}`}
                            fill="none"
                          />
                        </svg>
                      );
                    })()}
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="font-bold text-3xl text-black">{avgGradeLetter ?? "—"}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Cohort Avg</span>
                      <span className="text-[10px] font-bold text-[#4A1A45] mt-0.5">{avgScore === null ? "No grades yet" : `${avgScore}% Mean`}</span>
                    </div>
                  </div>

                  {/* Clean Direct Breakdown Bars & Legend */}
                  <div className="space-y-3 pt-2 border-t border-rule">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-black flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#4A1A45] inline-block" />
                          Grade A (90–100%)
                        </span>
                        <span className="font-bold text-black">{gradeDistribution ? `${dist.pctA}%` : "—"}</span>
                      </div>
                      <div className="w-full bg-[#F3EAF2] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#4A1A45] h-full rounded-full" style={{ width: `${dist.pctA}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-black flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#4A1A45] inline-block" />
                          Grade B (80–89%)
                        </span>
                        <span className="font-bold text-[#4A1A45]">{gradeDistribution ? `${dist.pctB}%` : "—"}</span>
                      </div>
                      <div className="w-full bg-[#F3EAF2] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#4A1A45] h-full rounded-full" style={{ width: `${dist.pctB}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-700 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
                          Below 80%
                        </span>
                        <span className="font-bold text-neutral-700">{gradeDistribution ? `${dist.pctBelow80}%` : "—"}</span>
                      </div>
                      <div className="w-full bg-[#F3EAF2] h-2 rounded-full overflow-hidden">
                        <div className="bg-neutral-400 h-full rounded-full" style={{ width: `${dist.pctBelow80}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ──────────────── MY CLASSES TAB ──────────────── */}
          {activeTab === "classes" && (
            <div className="space-y-6">
              {editingCourse ? (
                <div className="bg-white rounded-lg p-8 border-2 border-[#4A1A45] space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-rule">
                    <div>
                      <span className="text-[10px] font-bold text-[#4A1A45] uppercase tracking-wider">Editing Mode</span>
                      <h2 className="font-bold text-2xl text-black">Update Course: {editingCourse.title}</h2>
                    </div>
                    <button
                      onClick={() => setEditingCourse(null)}
                      className="px-4 py-2 rounded-xl bg-[#F3EAF2] hover:bg-[#E4D5E2] text-black text-xs font-bold transition-all"
                    >
                      Close Editor
                    </button>
                  </div>
                  <CourseBuilderWizard
                    initialCourse={editingCourse}
                    onClose={() => setEditingCourse(null)}
                    onSuccess={() => {
                      setEditingCourse(null);
                      window.location.reload();
                    }}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg p-8 border border-rule space-y-6">
                  <div>
                    <h2 className="font-bold text-2xl text-black">Curriculum &amp; Course Builder</h2>
                    <p className="text-xs text-neutral-500">Create new course modules, integrate automated grading rubrics, and upload lecture content.</p>
                  </div>
                  <CourseBuilderWizard />
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-bold text-xl text-black">Existing Courses ({tutorCourses.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tutorCourses.map((c) => (
                    <div key={c.id} className="bg-white rounded-lg p-6 border border-rule space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {c.department && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#4A1A45] text-white">
                                {c.department}
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-[#4A1A45] uppercase">
                              {c.faculty || c.category} · {c.level}
                            </span>
                          </div>
                          <span className="font-bold text-sm text-black">
                            {c.price === 0 ? "Free" : formatNgn(c.price)}
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-black">{c.title}</h4>
                        <p className="text-xs text-neutral-500 line-clamp-2">{c.description}</p>
                      </div>

                      <div className="pt-3 border-t border-rule flex items-center justify-between text-xs text-neutral-500">
                        <div className="flex items-center gap-2">
                          <span>{c.modules.length} modules</span>
                          <span>·</span>
                          <span>{c.enrollments.length} enrolled</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditingCourse(c);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-[11px] transition-all"
                        >
                          Edit Course
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── SUBMISSIONS TAB ──────────────── */}
          {activeTab === "submissions" && (
            <div className="bg-white rounded-lg p-8 border border-rule space-y-6">
              <div>
                <h2 className="font-bold text-2xl text-black">Student Submissions &amp; Grading Queue</h2>
                <p className="text-xs text-neutral-500">Review automated rubric evaluations, verify benchmark accuracy, and issue manual score overrides.</p>
              </div>
              <TutorSubmissionsReviewer initialSubmissions={allSubmissions} />
            </div>
          )}

          {/* ──────────────── STUDENTS TAB ──────────────── */}
          {activeTab === "students" && (
            <div className="bg-white rounded-lg p-8 border border-rule space-y-6">
              <div>
                <h2 className="font-bold text-2xl text-black">Enrolled Students</h2>
                <p className="text-xs text-neutral-500">Student roster across all your classes.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-rule text-neutral-500 font-bold bg-[#F7F2F6]">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {tutorCourses.flatMap((c) =>
                      c.enrollments.map((e: any) => (
                        <tr key={e.id} className="hover:bg-[#F7F2F6]">
                          <td className="p-3 font-bold text-black">{e.student.name}</td>
                          <td className="p-3 text-neutral-600">{e.student.email}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F3EAF2] text-black border border-rule">
                              {e.student.department || "General"}
                            </span>
                          </td>
                          <td className="p-3 text-[#4A1A45] font-bold">{c.title}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#4A1A45] text-white">
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ──────────────── ANNOUNCEMENTS TAB ──────────────── */}
          {activeTab === "announcements" && (
            <div className="bg-white rounded-lg p-8 border border-rule space-y-6">
              <div>
                <h2 className="font-bold text-2xl text-black">Class Announcements</h2>
                <p className="text-xs text-neutral-500">Broadcast updates, exam guidelines, and reminders to your active classes.</p>
              </div>
              <AnnouncementManager
                courses={tutorCourses.map((c) => ({
                  id: c.id,
                  title: c.title,
                  announcements: c.announcements,
                }))}
              />
            </div>
          )}

          {/* ──────────────── SETTINGS & PROFILE TAB ──────────────── */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="font-bold text-2xl text-black">Instructor Profile &amp; Settings</h2>
                <p className="text-xs text-neutral-500">Manage your faculty account, studio preferences, and session security.</p>
              </div>

              {/* Profile Card */}
              <div className="bg-white rounded-lg p-8 border border-rule space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-rule">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-[#4A1A45] text-white flex items-center justify-center text-2xl font-bold">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-black">{currentUser.name}</h3>
                      <p className="text-xs text-neutral-500">{currentUser.email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F3EAF2] border border-rule text-[#4A1A45]">
                          {currentUser.role === "ADMIN" ? "Administrator & Faculty" : "Faculty Instructor"}
                        </span>
                        {currentUser.department && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#4A1A45] text-white">
                            {currentUser.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-neutral-600 bg-[#F7F2F6] p-4 rounded-lg border border-rule">
                    <div>
                      <span className="block font-bold text-base text-black">{tutorCourses.length}</span>
                      <span className="text-[11px] text-neutral-500">Active Courses</span>
                    </div>
                    <div className="w-[1px] h-8 bg-[#E4D5E2]" />
                    <div>
                      <span className="block font-bold text-base text-black">{metrics.totalEnrollments || 0}</span>
                      <span className="text-[11px] text-neutral-500">Students Taught</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      readOnly
                      value={currentUser.name}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-xs font-semibold text-black outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      readOnly
                      value={currentUser.email}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-xs font-semibold text-black outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Studio Preferences */}
              <div className="bg-white rounded-lg p-8 border border-rule space-y-4">
                <h3 className="font-bold text-base text-black">Studio Preferences</h3>
                <div className="divide-y divide-rule text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-black">Rubric Evaluation Sensitivity</p>
                      <p className="text-neutral-500 text-[11px]">Courses are completed at an average of {PASS_MARK_PERCENT}% or more</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#F3EAF2] text-neutral-700 font-bold text-[10px]">Pass mark {PASS_MARK_PERCENT}%</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-black">Single Course Immersion Lock</p>
                      <p className="text-neutral-500 text-[11px]">Restrict students to one active course at a time</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#4A1A45] text-white font-bold text-[10px]">Enforced</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-black">Email Submission Alerts</p>
                      <p className="text-neutral-500 text-[11px]">Receive digests when students submit assignments</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#F3EAF2] text-neutral-700 font-bold text-[10px]">Enabled</span>
                  </div>
                </div>
              </div>

              {/* Session Management & Logout */}
              <div className="bg-white rounded-lg p-8 border border-red-100 space-y-4">
                <div>
                  <h3 className="font-bold text-base text-black">Session &amp; Security</h3>
                  <p className="text-xs text-neutral-500">Sign out of your active instructor session on this device.</p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-xs text-neutral-600">
                    <p className="font-semibold">Active Faculty Session</p>
                    <p className="text-[11px] text-neutral-400">Authenticated via secure session cookie</p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="px-6 py-2.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <span>Sign Out of Instructor Studio</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
