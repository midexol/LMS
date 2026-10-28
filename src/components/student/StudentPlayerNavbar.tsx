"use client";

import React from "react";
import Link from "next/link";
import { PiArrowLeft, PiSignOut } from "react-icons/pi";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface StudentPlayerNavbarProps {
  courseTitle: string;
  category: string;
  studentName: string;
}

export function StudentPlayerNavbar({ courseTitle, category, studentName }: StudentPlayerNavbarProps) {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-40 bg-[#1E0A1C] text-white border-b border-[#3B1537]">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo + Back to Curriculum + Course Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <BrandLogo href="/my-courses" variant="light" size="sm" />

          <div className="h-5 w-[1px] bg-[#3B1537] shrink-0 hidden sm:block" />

          <Link
            href="/my-courses"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2D0F2A] hover:bg-[#4A1A45] text-neutral-200 hover:text-white text-xs font-semibold transition-colors shrink-0 border border-[#4A1A45]/40"
          >
            <PiArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to My Courses</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="h-5 w-[1px] bg-[#3B1537] shrink-0 hidden sm:block" />

          <div className="min-w-0 flex items-center gap-2">
            <span className="text-xs sm:text-[11px] font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider text-[#D6BDD4] hidden md:inline shrink-0">
              {category}
            </span>
            <span className="text-neutral-500 hidden md:inline">•</span>
            <h2 className="text-sm font-semibold text-white truncate">
              {courseTitle}
            </h2>
          </div>
        </div>

        {/* Right: Student info & Sign Out */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-300">{studentName}</span>
            <span className="text-xs sm:text-[10px] font-mono normal-case sm:uppercase text-[#D6BDD4] px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
              Student
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-[#2D0F2A] transition-colors"
            title="Sign Out"
          >
            <PiSignOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
