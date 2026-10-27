"use client";

import React from "react";
import Link from "next/link";
import { FiHome, FiBookOpen, FiArrowLeft, FiCompass, FiShield, FiHelpCircle } from "react-icons/fi";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-black select-none">
      {/* Background radial accent glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-[#4A1A45]/10 rounded-full blur-3xl -translate-y-12"></div>
      </div>

      <div className="relative z-10 max-w-xl w-full text-center space-y-8">
        <div className="flex justify-center">
          <BrandLogo href="/" size="md" />
        </div>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
          404 Error · Academic Archive
        </p>

        {/* Big Glitch / Architectural Typography */}
        <div className="space-y-3">
          <h1 className="text-8xl sm:text-9xl font-bold tracking-tighter text-black leading-none font-mono">
            4<span className="text-[#4A1A45]">0</span>4
          </h1>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
            Page Not Found in Academic Records
          </h2>
          <p className="text-neutral-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            The curriculum, lesson, or resource you are searching for has been moved, unlisted, or does not exist.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FiHome className="w-4 h-4" /> Return to Homepage
          </Link>

          <Link
            href="/courses"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-white hover:bg-[#F7F2F6] border border-[#4A1A45]/30 text-[#4A1A45] font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FiBookOpen className="w-4 h-4 text-[#4A1A45]" /> Browse Course Catalog
          </Link>
        </div>

        {/* Helpful Shortcut Cards */}
        <div className="pt-6 border-t border-neutral-200">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mb-4">
            Quick Academic Destinations
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <Link
              href="/my-courses"
              className="p-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-[#4A1A45] transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <FiCompass className="w-4 h-4 text-[#4A1A45] group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-neutral-400 font-mono">STUDENT</span>
              </div>
              <h3 className="text-xs font-bold text-black group-hover:underline">My Courses</h3>
              <p className="text-[11px] text-neutral-500 line-clamp-1">Active enrollments & lectures</p>
            </Link>

            <Link
              href="/profile"
              className="p-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-[#4A1A45] transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <FiShield className="w-4 h-4 text-[#4A1A45] group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-neutral-400 font-mono">ACCOUNT</span>
              </div>
              <h3 className="text-xs font-bold text-black group-hover:underline">Student Profile</h3>
              <p className="text-[11px] text-neutral-500 line-clamp-1">Tuition receipts & details</p>
            </Link>

            <Link
              href="/login"
              className="p-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-[#4A1A45] transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <FiHelpCircle className="w-4 h-4 text-[#4A1A45] group-hover:scale-110 transition-transform" />
                <span className="text-[10px] text-neutral-400 font-mono">PORTAL</span>
              </div>
              <h3 className="text-xs font-bold text-black group-hover:underline">Sign In / Up</h3>
              <p className="text-[11px] text-neutral-500 line-clamp-1">Access your account</p>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-neutral-400 font-mono">
          Status: 404_HTTP_NOT_FOUND &bull; Academia LMS Portal
        </p>
      </div>
    </div>
  );
}
