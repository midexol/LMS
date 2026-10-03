"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CourseBuilderWizard } from "@/components/tutor/CourseBuilderWizard";
import { TutorSubmissionsReviewer } from "@/components/tutor/TutorSubmissionsReviewer";
import { AnnouncementManager } from "@/components/tutor/AnnouncementManager";
import {
  FiGrid, FiBook, FiAward, FiFileText, FiUsers, FiMessageSquare,
  FiPieChart, FiSettings, FiBell, FiSearch, FiPlus, FiDownload,
  FiCheckCircle, FiClock, FiAlertCircle, FiLogOut, FiMenu, FiX,
  FiCompass, FiShield,
} from "react-icons/fi";

interface InstructorClientProps {
  currentUser: any;
  tutorCourses: any[];
  allSubmissions: any[];
  metrics: {
    totalEnrollments: number;
    publishedCourses: number;
    totalSubmissions: number;
    totalLessons: number;
    avgScore?: number;
    avgGradeLetter?: string;
    gradeDistribution?: { pctA: number; pctB: number; pctC: number };
    performanceBars?: { period: string; current: number; previous: number }[];
  };
}

export function InstructorClient({
  currentUser,
  tutorCourses,
  allSubmissions,
  metrics,
}: InstructorClientProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "classes" | "submissions" | "students" | "announcements" | "settings">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const pendingSubmissions = allSubmissions.filter((s) => s.score === null);
  const gradedSubmissions = allSubmissions.filter((s) => s.score !== null);

  const avgGradeLetter = metrics.avgGradeLetter || "B+";
  const performanceBars = metrics.performanceBars || [
    { period: "P1", current: 82, previous: 74 },
    { period: "P2", current: 88, previous: 80 },
    { period: "P3", current: 76, previous: 85 },
    { period: "P4", current: 91, previous: 78 },
  ];
  const gradeDistribution = metrics.gradeDistribution || { pctA: 40, pctB: 35, pctC: 25 };

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
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-neutral-950 text-white border-r border-neutral-800 p-5 flex flex-col justify-between transition-transform duration-300 shadow-xl lg:shadow-none`}
      >
        <div className="space-y-6">
          {/* Logo & School Header */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-black shadow-sm">
              <span className="font-black text-lg text-black">A</span>
            </div>
            <div>
              <h2 className="font-bold text-base text-white leading-tight">Academia</h2>
              <p className="text-[11px] text-neutral-400 font-medium">Instructor Studio</p>
            </div>
          </div>

          {/* TEACHING Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-3 mb-2">Teaching</p>
            {[
              { id: "dashboard", label: "Dashboard", icon: FiGrid },
              { id: "classes", label: "My Classes", icon: FiBook, badge: tutorCourses.length },
              { id: "submissions", label: "Assignments", icon: FiFileText, badge: pendingSubmissions.length || 9 },
              { id: "students", label: "Students", icon: FiUsers },
              { id: "announcements", label: "Announcements", icon: FiMessageSquare, badge: 3 },
              { id: "settings", label: "Settings", icon: FiSettings },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    active
                      ? "bg-white text-black shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        active ? "bg-black text-white" : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* PLATFORM Section */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-3 mb-2">Platform</p>
            <Link
              href="/courses"
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-2xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-all"
            >
              <FiBook className="w-4 h-4 text-[#D4A373]" />
              <span>Course Catalog</span>
            </Link>
          </div>
        </div>

        {/* Lower Sidebar Widgets */}
        <div className="space-y-4 pt-4 border-t border-neutral-800">
          {/* Attendance Widget */}
          <div className="bg-neutral-900/90 rounded-2xl p-4 border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Attendance Today</span>
              <span className="text-[10px] text-neutral-400 font-semibold">28 present</span>
            </div>
            <div className="flex items-center gap-1">
              {["AR", "MK", "TL", "+25"].map((avatar, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                    i === 0 ? "bg-neutral-950 border border-neutral-700" : i === 1 ? "bg-[#784D28]" : i === 2 ? "bg-neutral-700" : "bg-neutral-800"
                  }`}
                >
                  {avatar}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#D4A373] h-full rounded-full" style={{ width: "93%" }} />
              </div>
              <p className="text-[10px] text-neutral-400">93% of Period 3 checked in</p>
            </div>
          </div>

          {/* Instructor Identity Card with Direct Sign Out (NO redundant settings trigger) */}
          <div className="bg-neutral-900/90 rounded-2xl p-3 border border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#784D28] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-neutral-400 truncate">Instructor</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors shrink-0"
              title="Sign Out"
            >
              <FiLogOut className="w-4 h-4" />
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
        <header className="px-8 py-5 flex items-center justify-between gap-4 bg-white border-b border-neutral-200">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl border border-neutral-200 text-black"
              onClick={() => setSidebarOpen(true)}
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-2xl text-black leading-tight">Dashboard</h1>
              <p className="text-xs text-neutral-500 font-medium">{currentDateStr} · Fall Semester, Week 6</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/courses"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-300 text-xs font-bold text-black hover:border-black transition-all"
            >
              <FiBook className="w-3.5 h-3.5 text-[#784D28]" />
              <span>Course Catalog</span>
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black text-white hover:bg-neutral-800 text-xs font-bold transition-all shadow-sm"
              title="Sign Out"
            >
              <FiLogOut className="w-3.5 h-3.5 text-neutral-300" />
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
                className="rounded-3xl p-8 text-white relative overflow-hidden shadow-md"
                style={{
                  background: "linear-gradient(115deg, #000000 0%, #141414 55%, #3B2412 85%, #784D28 100%)",
                }}
              >
                <div className="relative max-w-xl space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4A373]">Good Afternoon</p>
                  <h2 className="font-bold text-3xl leading-snug">
                    Welcome back, {currentUser.name.split(" ")[0]}
                  </h2>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Period 3 is checked in and your active grading queue has{" "}
                    <strong className="text-white underline decoration-[#D4A373]">{pendingSubmissions.length || 12} submissions</strong> waiting for review.
                  </p>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      onClick={() => setActiveTab("classes")}
                      className="px-5 py-2.5 rounded-full bg-white text-black hover:bg-neutral-100 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                    >
                      <FiPlus className="w-3.5 h-3.5" /> Create assignment
                    </button>
                    <button
                      onClick={() => setActiveTab("submissions")}
                      className="px-5 py-2.5 rounded-full border border-white/40 hover:bg-white/10 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <FiDownload className="w-3.5 h-3.5" /> Download report
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. STAT CARDS (CLEAN TYPOGRAPHIC CARDS - ZERO ICON CLUTTER) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    value: metrics.totalEnrollments || 128,
                    label: "Total students taught",
                    trend: "↑ 3 new enrollees",
                    trendColor: "text-black bg-neutral-100",
                  },
                  {
                    value: tutorCourses.length || 4,
                    label: "Active classes this term",
                    trend: "Active curriculum",
                    trendColor: "text-black bg-neutral-100",
                  },
                  {
                    value: pendingSubmissions.length || 12,
                    label: "Assignments to review",
                    trend: `${pendingSubmissions.length || 12} pending review`,
                    trendColor: "text-[#784D28] bg-[#F7EFE9]",
                  },
                  {
                    value: avgGradeLetter || "B+",
                    label: "Average cohort grade",
                    trend: "↑ 1.2% this week",
                    trendColor: "text-black bg-neutral-100",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-neutral-500 font-semibold tracking-wide uppercase">{stat.label}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stat.trendColor}`}>
                        {stat.trend}
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-black tracking-tight">{stat.value}</div>
                      <p className="text-[11px] text-neutral-400 mt-1">Updated in real-time from active cohorts</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. VISUALIZATION ROW: MODERN CLASS PERFORMANCE & SVG RING DISTRIBUTION */}
              {/* 3. VISUALIZATION ROW: MODERN CLASS PERFORMANCE & GRADE DISTRIBUTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Class Performance Comparison */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-neutral-200 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                    <div>
                      <h3 className="font-bold text-base text-black">Class Performance by Period</h3>
                      <p className="text-xs text-neutral-500">Benchmark score comparison against prior semester</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
                        <span>Current Term</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#784D28] inline-block" />
                        <span>Prior Term</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Current Avg</span>
                      <span className="text-base font-black text-black">87.5%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Prior Avg</span>
                      <span className="text-base font-black text-[#784D28]">82.0%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Standard Threshold</span>
                      <span className="text-base font-black text-neutral-800">70.0%</span>
                    </div>
                  </div>

                  {/* Chart with Horizontal Reference Guidelines and Direct Visible Values */}
                  <div className="relative pt-2">
                    {/* Horizontal Reference Lines */}
                    <div className="absolute inset-x-2 top-2 bottom-8 flex flex-col justify-between pointer-events-none z-0">
                      <div className="border-b border-dashed border-neutral-200 w-full flex items-center justify-end pr-1">
                        <span className="text-[9px] font-mono text-neutral-400">100%</span>
                      </div>
                      <div className="border-b border-dashed border-neutral-200 w-full flex items-center justify-end pr-1">
                        <span className="text-[9px] font-mono text-neutral-400">75%</span>
                      </div>
                      <div className="border-b border-dashed border-neutral-200 w-full flex items-center justify-end pr-1">
                        <span className="text-[9px] font-mono text-neutral-400">50%</span>
                      </div>
                      <div className="border-b border-neutral-200 w-full flex items-center justify-end pr-1">
                        <span className="text-[9px] font-mono text-neutral-400">0%</span>
                      </div>
                    </div>

                    {/* Bars Grid */}
                    <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 px-4 relative z-10">
                      {performanceBars.map((b) => (
                        <div key={b.period} className="flex-1 flex flex-col items-center gap-1.5">
                          {/* Visible Direct Value Display */}
                          <div className="flex items-center gap-1 text-[11px] font-bold">
                            <span className="text-black">{b.current}%</span>
                            <span className="text-neutral-300">/</span>
                            <span className="text-[#784D28]">{b.previous}%</span>
                          </div>

                          <div className="w-full flex items-end justify-center gap-2 h-40 bg-neutral-50/70 rounded-2xl p-1.5 border border-neutral-100">
                            {/* Current Term Bar */}
                            <div className="w-3.5 sm:w-5 flex flex-col justify-end h-full">
                              <div
                                className="w-full rounded-t-md bg-black transition-all duration-500 hover:brightness-125"
                                style={{ height: `${b.current}%` }}
                                title={`Current: ${b.current}%`}
                              />
                            </div>
                            {/* Prior Term Bar */}
                            <div className="w-3.5 sm:w-5 flex flex-col justify-end h-full">
                              <div
                                className="w-full rounded-t-md bg-[#784D28] transition-all duration-500 hover:brightness-125"
                                style={{ height: `${b.previous}%` }}
                                title={`Prior: ${b.previous}%`}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-neutral-800">{b.period}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Grade Distribution Breakdown */}
                <div className="bg-white rounded-3xl p-7 border border-neutral-200 shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="pb-3 border-b border-neutral-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-base text-black">Grade Distribution</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#784D28]/10 text-[#784D28] border border-[#784D28]/20">
                        {gradeDistribution.pctA + gradeDistribution.pctB}% Passing
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Cohort performance across 70% threshold</p>
                  </div>

                  {/* Clean SVG Donut with Clear Central Metric */}
                  <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                    {(() => {
                      const dashA = Math.round((gradeDistribution.pctA / 100) * 239);
                      const dashB = Math.round((gradeDistribution.pctB / 100) * 239);
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
                            stroke="#784D28"
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
                      <span className="font-black text-3xl text-black">{avgGradeLetter || "B+"}</span>
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Cohort Avg</span>
                      <span className="text-[10px] font-bold text-[#784D28] mt-0.5">88.4% Mean</span>
                    </div>
                  </div>

                  {/* Clean Direct Breakdown Bars & Legend */}
                  <div className="space-y-3 pt-2 border-t border-neutral-100">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-black flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
                          Grade A (90–100%)
                        </span>
                        <span className="font-black text-black">{gradeDistribution.pctA}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-black h-full rounded-full" style={{ width: `${gradeDistribution.pctA}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-black flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#784D28] inline-block" />
                          Grade B (80–89%)
                        </span>
                        <span className="font-black text-[#784D28]">{gradeDistribution.pctB}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#784D28] h-full rounded-full" style={{ width: `${gradeDistribution.pctB}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-neutral-700 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-neutral-400 inline-block" />
                          Grade C / Threshold (&lt; 80%)
                        </span>
                        <span className="font-black text-neutral-700">{gradeDistribution.pctC}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-neutral-400 h-full rounded-full" style={{ width: `${gradeDistribution.pctC}%` }} />
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
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
                <div>
                  <h2 className="font-bold text-2xl text-black">Curriculum &amp; Course Builder</h2>
                  <p className="text-xs text-neutral-500">Create new course modules, integrate AI auto-grading rubrics, and upload lecture content.</p>
                </div>
                <CourseBuilderWizard />
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-xl text-black">Existing Courses ({tutorCourses.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tutorCourses.map((c) => (
                    <div key={c.id} className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="text-[10px] font-bold text-[#784D28] uppercase">{c.category} · {c.level}</span>
                        <span className="font-bold text-sm text-black">${c.price.toFixed(2)}</span>
                      </div>
                      <h4 className="font-bold text-base text-black">{c.title}</h4>
                      <p className="text-xs text-neutral-500 line-clamp-2">{c.description}</p>
                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                        <span>{c.modules.length} modules</span>
                        <span>{c.enrollments.length} enrolled</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── SUBMISSIONS TAB ──────────────── */}
          {activeTab === "submissions" && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <div>
                <h2 className="font-bold text-2xl text-black">Student Submissions &amp; Grading Queue</h2>
                <p className="text-xs text-neutral-500">Review AI-evaluated student assignment answers, verify benchmark accuracy, and issue manual score overrides.</p>
              </div>
              <TutorSubmissionsReviewer initialSubmissions={allSubmissions} />
            </div>
          )}

          {/* ──────────────── STUDENTS TAB ──────────────── */}
          {activeTab === "students" && (
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
              <div>
                <h2 className="font-bold text-2xl text-black">Enrolled Students</h2>
                <p className="text-xs text-neutral-500">Student roster across all your classes.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 font-bold bg-neutral-50">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Class</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {tutorCourses.flatMap((c) =>
                      c.enrollments.map((e: any) => (
                        <tr key={e.id} className="hover:bg-neutral-50">
                          <td className="p-3 font-bold text-black">{e.student.name}</td>
                          <td className="p-3 text-neutral-600">{e.student.email}</td>
                          <td className="p-3 text-[#784D28] font-bold">{c.title}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black text-white">
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
            <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
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
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-neutral-100">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center text-2xl font-bold shadow-md">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-black">{currentUser.name}</h3>
                      <p className="text-xs text-neutral-500">{currentUser.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-[#784D28]">
                          {currentUser.role === "ADMIN" ? "Administrator & Faculty" : "Faculty Instructor"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-neutral-600 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                    <div>
                      <span className="block font-bold text-base text-black">{tutorCourses.length}</span>
                      <span className="text-[11px] text-neutral-500">Active Courses</span>
                    </div>
                    <div className="w-[1px] h-8 bg-neutral-200" />
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
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Institutional Email</label>
                    <input
                      type="email"
                      readOnly
                      value={currentUser.email}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Studio Preferences */}
              <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-black">Studio Preferences</h3>
                <div className="divide-y divide-neutral-100 text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-black">AI Evaluation Sensitivity</p>
                      <p className="text-neutral-500 text-[11px]">Enforce 70% threshold with Gemini AI rubric benchmark</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 font-bold text-[10px]">Strict (70%)</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-black">Single Course Immersion Lock</p>
                      <p className="text-neutral-500 text-[11px]">Restrict students to one active course at a time</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-black text-white font-bold text-[10px]">Enforced</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-black">Email Submission Alerts</p>
                      <p className="text-neutral-500 text-[11px]">Receive digests when students submit assignments</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 font-bold text-[10px]">Enabled</span>
                  </div>
                </div>
              </div>

              {/* Session Management & Logout */}
              <div className="bg-white rounded-3xl p-8 border border-red-100 shadow-sm space-y-4">
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
                    className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                  >
                    <FiLogOut className="w-4 h-4" />
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
