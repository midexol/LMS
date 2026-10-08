"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LandingNavbar } from "@/components/ui/LandingNavbar";
import {
  FiBookOpen, FiArrowRight, FiCheck, FiUsers, FiAward,
  FiTrendingUp, FiCpu, FiStar, FiFileText, FiShield,
  FiCheckCircle, FiCompass, FiMenu, FiX, FiClock, FiLock, FiBarChart2
} from "react-icons/fi";
import { formatNgn } from "@/lib/utils";


// Category-based visual palette for course cards (no image required)
const CATEGORY_VISUALS: Record<string, { bg: string; accent: string; label: string }> = {
  "Software Engineering": { bg: "from-neutral-950 to-neutral-800", accent: "#D4A373", label: "SE" },
  "Computer Science":     { bg: "from-neutral-900 to-neutral-700", accent: "#D4A373", label: "CS" },
  "Data Science & AI":    { bg: "from-neutral-950 to-[#2a1a0e]",   accent: "#D4A373", label: "AI" },
  "Design & UX":          { bg: "from-[#1a0e05] to-neutral-900",   accent: "#D4A373", label: "UX" },
  "Business & Management":{ bg: "from-neutral-900 to-neutral-950", accent: "#D4A373", label: "BM" },
  General:                { bg: "from-neutral-800 to-neutral-950", accent: "#D4A373", label: "GN" },
};
function getCourseVisual(category: string) {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS["General"];
}

export interface DynamicPlatformStats {
  totalStudents: number;
  totalTutors: number;
  publishedCourses: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalSubmissions: number;
  avgScore: number;
  passVelocity: number;
  highDistinctionPct: number;
  standardPassPct: number;
  interventionPct: number;
  latestScore: number;
  weeklyTrajectory: { week: string; score: number }[];
}

export function LandingPage({
  currentUser,
  featuredCourses,
  dynamicStats,
}: {
  currentUser?: any;
  featuredCourses: any[];
  dynamicStats?: DynamicPlatformStats;
}) {

  const stats = dynamicStats || {
    totalStudents: 1,
    totalTutors: 1,
    publishedCourses: 1,
    activeEnrollments: 1,
    completedEnrollments: 0,
    totalSubmissions: 1,
    avgScore: 88,
    passVelocity: 94,
    highDistinctionPct: 44,
    standardPassPct: 50,
    interventionPct: 6,
    latestScore: 92,
    weeklyTrajectory: [
      { week: "W1", score: 62 },
      { week: "W2", score: 68 },
      { week: "W3", score: 74 },
      { week: "W4", score: 80 },
      { week: "W5", score: 84 },
      { week: "W6", score: 88 },
      { week: "W7", score: 92 },
      { week: "W8", score: 96 },
    ],
  };

  const [policyModal, setPolicyModal] = useState<"integrity" | "privacy" | "terms" | "honor" | "accessibility" | "security" | null>(null);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* ───────────────── UNIQUE LANDING PAGE NAVBAR ───────────────── */}
      <LandingNavbar currentUser={currentUser} />

      {/* ───────────────── HERO SECTION (TEACHABLE STYLE) ───────────────── */}
      <section className="pt-12 sm:pt-16 pb-16 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="font-heading font-normal text-4xl sm:text-6xl text-black leading-[1.08] tracking-tight">
              Where great teaching finds its <span className="italic text-[#784D28]">platform.</span>
            </h1>

            <p className="text-base sm:text-lg text-neutral-600 leading-relaxed max-w-xl">
              Academia LMS builds the university-grade teaching and learning environment your students need. Single active course lock for deep immersion, authentic collegiate curriculum, and instant automated rubrics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/signup"
                className="px-8 py-3.5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm shadow-sm transition-all text-center"
              >
                Join as Student
              </Link>
              <Link
                href="/courses"
                className="px-8 py-3.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-300 text-black font-bold text-sm transition-all text-center shadow-sm"
              >
                Browse Courses
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 pt-6 border-t border-neutral-200 text-xs text-neutral-600 font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-black" />
                <span>Single enrollment lock</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#784D28]" />
                <span>Automated benchmark grading</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-black" />
                <span>70% mastery standard</span>
              </div>
            </div>
          </div>
      </section>


      {/* ───────────────── CAMPUS COLLABORATION & RIGOR ───────────────── */}
      <section className="py-20 px-6 max-w-7xl mx-auto" id="campus-life">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Text Content */}
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#784D28]">Academic Experience</span>
            <h2 className="font-heading font-normal text-3xl sm:text-5xl text-black leading-tight tracking-tight">
              Designed for serious learners. <span className="italic text-[#784D28]">Built for lasting mastery.</span>
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Unlike generic online course marketplaces, Academia enforces rigorous academic standards proven to drive retention. Students work closely with instructor-crafted rubrics, receive prompt feedback, and complete assignments that build upon one another.
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-lg font-bold text-[#784D28]">01</span>
                  <h4 className="text-sm font-bold text-black tracking-tight">Single Active Enrollment Barrier</h4>
                </div>
                <p className="text-xs text-neutral-600 pl-8 leading-relaxed">
                  Students can register for only one course at any time. Multi-tab distractions are eliminated until the 70% completion threshold is certified.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-heading text-lg font-bold text-[#784D28]">02</span>
                  <h4 className="text-sm font-bold text-black tracking-tight">Automated &amp; Faculty Grading</h4>
                </div>
                <p className="text-xs text-neutral-600 pl-8 leading-relaxed">
                  Submissions are evaluated against benchmark model answers. Instructors have override tools to customize grades and leave detailed mentorship notes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── FEATURED COURSES CURRICULUM ───────────────── */}
      <section className="py-20 px-6 bg-neutral-50 border-t border-neutral-200" id="curriculum">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-neutral-200 pb-8">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#784D28]">Curriculum Offerings</span>
              <h2 className="font-heading font-normal text-3xl sm:text-4xl text-black">
                Explore University-Caliber <span className="italic">Courses</span>
              </h2>
            </div>
            <Link
              href="/courses"
              className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              Browse All Courses
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses && featuredCourses.length > 0 ? (
              featuredCourses.map((course, idx) => (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Course Card Visual Header — fixed by default, or tutor custom image */}
                    {(() => {
                      const vis = getCourseVisual(course.category);
                      if (course.coverImage) {
                        return (
                          <div className="relative h-48 w-full overflow-hidden bg-neutral-900 group">
                            <img
                              src={course.coverImage}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white border border-white/20">
                              {course.category}
                            </span>
                            <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black bg-white text-black shadow-md">
                              {course.price === 0 ? "Free" : formatNgn(course.price)}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className={`relative h-48 w-full bg-gradient-to-br ${vis.bg} flex flex-col items-start justify-end p-5 overflow-hidden`}>
                          {/* Large muted initials watermark */}
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[96px] font-black text-white/5 select-none pointer-events-none leading-none">
                            {vis.label}
                          </span>
                          {/* Category badge */}
                          <span className="relative px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-sm text-white border border-white/15">
                            {course.category}
                          </span>
                          {/* Price pill */}
                          <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black bg-white text-black shadow-md">
                            {course.price === 0 ? "Free" : formatNgn(course.price)}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Card Body */}
                    <div className="p-6 space-y-3">
                      <h3 className="font-bold text-lg text-black line-clamp-1 leading-snug group-hover:text-[#784D28] transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {course.description || "In-depth collegiate curriculum with structured lesson modules, assignments, and automated grading."}
                      </p>

                      <div className="flex items-center gap-2 pt-2 text-xs text-neutral-600 font-medium">
                        <span className="text-black font-semibold">{course.modules?.length || 0} Modules</span>
                        <span>·</span>
                        <span>Instructor: {course.tutor?.name || "Faculty Member"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border-t border-neutral-100 bg-neutral-50/50">
                    <Link
                      href="/courses"
                      className="w-full py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider text-center shadow-sm transition-all block"
                    >
                      Enroll in Course
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 text-neutral-500 text-sm">
                Course catalog is loading. Sign in to browse all active courses.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────── 3 PILLARS ACADEMIC MODEL ───────────────── */}
      <section className="py-20 px-6 max-w-7xl mx-auto" id="how-it-works">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-[#784D28]">Academic Architecture</span>
          <h2 className="font-heading font-normal text-3xl sm:text-4xl text-black">
            Structured learning designed for <span className="italic text-[#784D28]">true mastery.</span>
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
            Academia enforces discipline through single-enrollment focus and instant assignment benchmark verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Focused Single Enrollment",
              desc: "Students can only register for one course at a time. This deliberate constraint eliminates choice fatigue and ensures 100% curriculum focus.",
            },
            {
              step: "02",
              title: "Automated & Faculty Evaluation",
              desc: "Every lesson assignment is evaluated against instructor model rubrics with actionable feedback returned in seconds.",
            },
            {
              step: "03",
              title: "70% Minimum Threshold",
              desc: "To earn course completion and unlock further coursework, students must maintain a verified 70% average across all assignments.",
            },
          ].map((pillar) => (
            <div
              key={pillar.step}
              className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm space-y-3 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="text-5xl font-black text-neutral-200 select-none">{pillar.step}</div>
              <h3 className="font-bold text-xl text-black">{pillar.title}</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────── INSTRUCTOR STUDIO (PURE JET BLACK) ───────────────── */}
      <section className="bg-black text-white py-24 px-6 border-y border-neutral-900" id="instructors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D4A373]">Faculty &amp; Creator Studio</span>
            <h2 className="font-heading font-normal text-3xl sm:text-5xl leading-tight text-white tracking-tight">
              Powerful tools built for <span className="italic text-[#D4A373]">educators who care.</span>
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Build entire syllabi with automated outline generation, create modular lesson plans with rich attachments, and monitor student comprehension through real-time telemetry.
            </p>

            <div className="space-y-3 pt-2">
              {[
                "Cohort mastery trajectories with real-time rubric tracking",
                "Dynamic grade distribution analytics across active terms",
                "Automated syllabus outline generator and standardized benchmark rubrics",
                "Full grade override desk with mentor feedback notes",
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-neutral-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4A373] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="pt-4">
              <Link
                href="/courses"
                className="inline-block px-8 py-3.5 rounded-full bg-white hover:bg-neutral-100 text-black font-bold text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Explore All Courses
              </Link>
            </div>
          </div>

          {/* Elevated Modern SaaS Telemetry & Cohort Trajectory Chart (FULLY DYNAMIC) */}
          <div className="lg:col-span-7">
            <div className="bg-neutral-950 text-white rounded-3xl p-7 border border-neutral-800 shadow-2xl space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
                <div>
                  <h3 className="font-bold text-base text-white">Cohort Mastery &amp; Trajectory</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Real-time benchmark tracking across active curriculum tracks</p>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-900 p-1 rounded-full border border-neutral-800 text-[11px] font-bold text-neutral-400">
                  <span className="px-3 py-1 rounded-full bg-white text-black shadow-sm">Term 2026</span>
                  <span className="px-3 py-1">All Cohorts</span>
                </div>
              </div>

              {/* KPI Highlights Row (FULLY DYNAMIC DATA) */}
              <div className="grid grid-cols-3 gap-4 pt-1">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Active Students</p>
                  <p className="text-2xl font-bold text-white">{stats.activeEnrollments}</p>
                  <p className="text-[10px] text-[#D4A373] font-semibold">{stats.totalStudents} total registered</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Pass Velocity</p>
                  <p className="text-2xl font-bold text-white">{stats.passVelocity}%</p>
                  <p className="text-[10px] text-neutral-400 font-semibold">&gt; 70% threshold</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">Avg Cohort Score</p>
                  <p className="text-2xl font-bold text-white">{stats.avgScore}<span className="text-xs text-neutral-400">/100</span></p>
                  <p className="text-[10px] text-neutral-400 font-semibold">{stats.totalSubmissions} submissions logged</p>
                </div>
              </div>

              {/* SVG Curve Chart (FULLY DYNAMIC TRAJECTORY) */}
              <div className="relative pt-2">
                <div className="h-44 w-full">
                  <svg viewBox="0 0 540 160" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
                        <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="brownGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#784D28" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#784D28" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Gridlines */}
                    <line x1="0" y1="20" x2="540" y2="20" stroke="#262626" strokeDasharray="3 3" />
                    <line x1="0" y1="65" x2="540" y2="65" stroke="#262626" strokeDasharray="3 3" />
                    <line x1="0" y1="110" x2="540" y2="110" stroke="#262626" strokeDasharray="3 3" />

                    {/* 70% Mastery Standard Benchmark Line */}
                    <line x1="0" y1="65" x2="540" y2="65" stroke="#784D28" strokeWidth="1.5" strokeDasharray="4 4" />
                    <text x="535" y="58" textAnchor="end" fill="#D4A373" fontSize="10" fontWeight="bold">
                      70% Mastery Threshold Standard
                    </text>

                    {/* Area under Student Mastery Curve */}
                    <path
                      d={`M 20 ${150 - (stats.weeklyTrajectory[0]?.score || 60) * 1.2} ${stats.weeklyTrajectory.map((p, idx) => `L ${20 + idx * 70} ${150 - (p.score / 100) * 130}`).join(" ")} L 510 150 L 20 150 Z`}
                      fill="url(#chartGradient)"
                    />

                    {/* Student Mastery Line */}
                    <path
                      d={`M 20 ${150 - (stats.weeklyTrajectory[0]?.score || 60) * 1.2} ${stats.weeklyTrajectory.map((p, idx) => `L ${20 + idx * 70} ${150 - (p.score / 100) * 130}`).join(" ")}`}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />

                    {/* Interactive-style Node Marker at Week 6 */}
                    <circle cx="370" cy={150 - ((stats.weeklyTrajectory[5]?.score || stats.avgScore) / 100) * 130} r="5" fill="#FFFFFF" stroke="#000000" strokeWidth="2.5" />
                    <g transform={`translate(295, ${Math.max(10, 150 - ((stats.weeklyTrajectory[5]?.score || stats.avgScore) / 100) * 130 - 35)})`}>
                      <rect width="150" height="28" rx="6" fill="#000000" stroke="#784D28" strokeWidth="1" />
                      <text x="75" y="18" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                        Avg Mastery: {stats.avgScore}%
                      </text>
                    </g>
                  </svg>
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between text-xs font-bold text-neutral-400 pt-3 border-t border-neutral-800">
                  {stats.weeklyTrajectory.map((w, idx) => (
                    <span key={idx} className={idx === 5 ? "text-white font-extrabold" : ""}>
                      {w.week}
                    </span>
                  ))}
                </div>
              </div>

              {/* Segmented Cohort Mastery Breakdown (DYNAMIC) */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 font-medium">Cohort Grade Distribution</span>
                  <span className="text-white font-bold">{stats.passVelocity}% Certified</span>
                </div>
                <div className="h-2.5 w-full bg-neutral-900 rounded-full overflow-hidden flex">
                  <div style={{ width: `${stats.highDistinctionPct}%` }} className="bg-white h-full" title={`High Distinction: ${stats.highDistinctionPct}%`} />
                  <div style={{ width: `${stats.standardPassPct}%` }} className="bg-[#784D28] h-full" title={`Certified Pass: ${stats.standardPassPct}%`} />
                  <div style={{ width: `${stats.interventionPct}%` }} className="bg-neutral-600 h-full" title={`Review Needed: ${stats.interventionPct}%`} />
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-neutral-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white inline-block" />
                    <span>High Distinction: {stats.highDistinctionPct}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#784D28] inline-block" />
                    <span>Certified Pass: {stats.standardPassPct}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-neutral-600 inline-block" />
                    <span>Review Needed: {stats.interventionPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── TEACHABLE-STYLE FOOTER (PURE BLACK) ───────────────── */}
      <footer className="bg-black text-neutral-400 pt-20 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
            {/* Brand column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-black font-bold text-lg">
                  A
                </div>
                <span className="font-black text-xl text-white tracking-tight">ACADEMIA</span>
              </div>
              <p className="text-xs leading-relaxed max-w-sm text-neutral-400">
                The academic learning platform combining structured university curricula, automated assignment evaluation, and comprehensive instructor analytics.
              </p>
            </div>

            {/* Column 1: Curriculum */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Curriculum</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/courses" className="hover:text-white transition-colors">Course Catalog</Link></li>
                <li><Link href="/courses" className="hover:text-white transition-colors">Software Engineering</Link></li>
                <li><Link href="/courses" className="hover:text-white transition-colors">Data Science &amp; AI</Link></li>
                <li><Link href="/courses" className="hover:text-white transition-colors">Design &amp; UX</Link></li>
              </ul>
            </div>

            {/* Column 2: Academics */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Academics</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Single Course Lock</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Rubric Evaluation Standard</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">70% Mastery Threshold</a></li>
                <li><a href="#campus-life" className="hover:text-white transition-colors">Peer Discussions</a></li>
              </ul>
            </div>

            {/* Column 3: Students */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Students</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/signup" className="hover:text-white transition-colors">Join as Student</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/courses" className="hover:text-white transition-colors">Browse Courses</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Academic Record</Link></li>
              </ul>
            </div>

            {/* Column 4: Institutional */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white">Trust &amp; Standards</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">Curriculum Framework</a></li>
                <li>
                  <button onClick={() => setPolicyModal("integrity")} className="hover:text-white transition-colors text-left">
                    Academic Integrity
                  </button>
                </li>
                <li>
                  <button onClick={() => setPolicyModal("honor")} className="hover:text-white transition-colors text-left">
                    The Honor Code
                  </button>
                </li>
                <li>
                  <button onClick={() => setPolicyModal("security")} className="hover:text-white transition-colors text-left">
                    Platform Security
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Subfooter */}
          <div className="pt-8 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <p>&copy; {new Date().getFullYear()} Academia LMS, Inc. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-6">
              <button onClick={() => setPolicyModal("privacy")} className="hover:text-white transition-colors">
                Privacy Policy
              </button>
              <button onClick={() => setPolicyModal("terms")} className="hover:text-white transition-colors">
                Terms of Service
              </button>
              <button onClick={() => setPolicyModal("honor")} className="hover:text-white transition-colors">
                Honor Code
              </button>
              <button onClick={() => setPolicyModal("accessibility")} className="hover:text-white transition-colors">
                Accessibility
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ───────────────── FOOTER POLICY MODAL ───────────────── */}
      {policyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-neutral-200 relative text-black space-y-6">
            <button
              onClick={() => setPolicyModal(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
              aria-label="Close Modal"
            >
              <FiX className="w-5 h-5" />
            </button>

            {policyModal === "integrity" && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#784D28] uppercase tracking-wider">Academic Standards</span>
                <h3 className="font-heading font-bold text-2xl text-black">Academic Integrity Policy</h3>
                <div className="text-xs text-neutral-600 space-y-3 leading-relaxed">
                  <p>
                    Academia LMS is grounded in rigorous collegiate scholarship. Every course enforces our <strong>Single Active Enrollment Lock</strong>, guaranteeing students maintain deep, unfragmented immersion in their studies.
                  </p>
                  <p>
                    All assignments undergo automated rubric benchmarking. Work must meet or exceed a strict <strong>70% mastery standard</strong> to unlock subsequent lessons.
                  </p>
                  <p>
                    Submissions must represent the student&apos;s authentic intellectual effort. Plagiarism, unauthorized automation, or evasion of rubrics will result in zero-score evaluations and formal review.
                  </p>
                </div>
              </div>
            )}

            {policyModal === "privacy" && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#784D28] uppercase tracking-wider">Data Protection</span>
                <h3 className="font-heading font-bold text-2xl text-black">Student Privacy Policy</h3>
                <div className="text-xs text-neutral-600 space-y-3 leading-relaxed">
                  <p>
                    Your student record, assignment responses, and evaluation metrics are treated with the highest degree of academic confidentiality under FERPA guidelines.
                  </p>
                  <p>
                    Student submissions are processed exclusively to perform real-time rubric evaluations. Your coursework is never sold, licensed, or shared with third-party advertisers.
                  </p>
                  <p>
                    Authentication sessions are secured using encrypted, httpOnly cookies with strict same-origin isolation.
                  </p>
                </div>
              </div>
            )}

            {policyModal === "terms" && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#784D28] uppercase tracking-wider">Institutional Agreement</span>
                <h3 className="font-heading font-bold text-2xl text-black">Terms of Service</h3>
                <div className="text-xs text-neutral-600 space-y-3 leading-relaxed">
                  <p>
                    By registering for Academia LMS, you commit to maintaining authentic academic conduct across all lecture coursework, discussion forums, and evaluations.
                  </p>
                  <p>
                    Enrollment grants non-exclusive, personal access to instructional materials. Course materials, video assets, and rubric prompts may not be redistributed without institutional consent.
                  </p>
                  <p>
                    Completion of a course requires satisfying all module assignments with verified mastery benchmarks.
                  </p>
                </div>
              </div>
            )}

            {policyModal === "honor" && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#784D28] uppercase tracking-wider">Scholarly Pledge</span>
                <h3 className="font-heading font-bold text-2xl text-black">The Academia Honor Code</h3>
                <div className="text-xs text-neutral-600 space-y-3 leading-relaxed">
                  <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 italic text-neutral-800 text-sm font-medium">
                    &ldquo;As a scholar at Academia, I pledge to dedicate my complete attention to my active course, produce honest and rigorous academic work, and support the scholarly growth of my peers.&rdquo;
                  </div>
                  <ul className="space-y-1.5 list-disc pl-4 text-neutral-600">
                    <li>One active course focus until verified completion.</li>
                    <li>Constructive and respectful discourse in peer discussion forums.</li>
                    <li>Original submission of all assignments and project deliverables.</li>
                  </ul>
                </div>
              </div>
            )}

            {policyModal === "security" && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#784D28] uppercase tracking-wider">Platform Security</span>
                <h3 className="font-heading font-bold text-2xl text-black">Security Safeguards</h3>
                <div className="text-xs text-neutral-600 space-y-3 leading-relaxed">
                  <p>
                    Our infrastructure utilizes isolated sandbox environments for AI rubric executions, encrypted database storage, and cryptographically verified session credentials.
                  </p>
                  <p>
                    Rate limiting and CSRF protection are enforced across all authentication endpoints to prevent brute-force attacks and session hijacking.
                  </p>
                </div>
              </div>
            )}

            {policyModal === "accessibility" && (
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#784D28] uppercase tracking-wider">Universal Access</span>
                <h3 className="font-heading font-bold text-2xl text-black">Accessibility Statement</h3>
                <div className="text-xs text-neutral-600 space-y-3 leading-relaxed">
                  <p>
                    Academia LMS is engineered to comply with WCAG 2.1 Level AA specifications. We prioritize high contrast, legible typography, keyboard accessibility, and screen reader compatibility.
                  </p>
                  <p>
                    If you encounter any accessibility barrier, our academic support team is dedicated to providing tailored accommodations.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setPolicyModal(null)}
              className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
