"use client";

import React from "react";
import Link from "next/link";
import { FiArrowLeft, FiLogOut } from "react-icons/fi";

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
    <header className="sticky top-0 z-40 bg-black text-white border-b border-neutral-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Back to Curriculum + Course Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link
            href="/my-courses"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold transition-colors shrink-0 border border-neutral-800"
          >
            <FiArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to My Courses</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="h-5 w-[1px] bg-neutral-800 shrink-0 hidden sm:block" />

          <div className="min-w-0 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A373] hidden md:inline shrink-0">
              {category}
            </span>
            <span className="text-neutral-600 hidden md:inline">•</span>
            <h2 className="text-sm font-semibold text-white truncate">
              {courseTitle}
            </h2>
          </div>
        </div>

        {/* Right: Student info & Sign Out */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-300">{studentName}</span>
            <span className="text-[10px] font-mono uppercase text-[#D4A373] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
              Student
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-neutral-900 transition-colors"
            title="Sign Out"
          >
            <FiLogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
