"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FiChevronDown, FiChevronUp, FiMenu, FiX, FiCheck,
  FiArrowRight
} from "react-icons/fi";

export function BbLogo({ className = "h-8 w-auto", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 60 42" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Blackboard Logo">
      {/* Top accent stroke */}
      <line x1="6" y1="8" x2="22" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Script capital B */}
      <path
        d="M 12 9 C 13 16 11 26 12 30 M 12 10 C 18 9 26 11 25 17 C 24 21 19 21.5 13 21.5 C 19 21.5 28 22 27 28 C 26 31 20 31.5 12 30"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Script lowercase b */}
      <path
        d="M 33 28 C 30 25 31 16 34 8 C 36 5 38 6 36 12 C 34 19 32 26 33 30 C 35 31 43 31 44 24 C 45 18 39 18 34 20"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom baseline underline */}
      <line x1="6" y1="36" x2="48" y2="36" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

interface BlackboardNavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN";
  } | null;
}

export function BlackboardNavbar({ currentUser }: BlackboardNavbarProps) {
  const [activeMenu, setActiveMenu] = useState<"solutions" | "resources" | "company" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndustry, setActiveIndustry] = useState<"higher-ed" | "government" | "workforce" | "k-12">("higher-ed");
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const isSolutionsOpen = activeMenu === "solutions";
  const isResourcesOpen = activeMenu === "resources";
  const isCompanyOpen = activeMenu === "company";
  const isDarkActive = isSolutionsOpen || isResourcesOpen || isCompanyOpen;

  return (
    <>
      <div ref={navRef} className="sticky top-0 z-50 transition-colors duration-200">
        {/* ───────────── TOP UTILITY BAR (Students, Community & Support) ───────────── */}
        <div className={`border-b transition-colors duration-200 ${
          isDarkActive
            ? "bg-black border-neutral-900 text-neutral-400"
            : "bg-white border-neutral-200 text-neutral-600"
        }`}>
          <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-end gap-6 text-xs font-medium">
            <Link
              href={currentUser?.role === "STUDENT" ? "/my-courses" : "/login"}
              className={`hover:underline transition-colors ${
                isDarkActive ? "text-neutral-300 hover:text-white" : "text-neutral-700 hover:text-black font-semibold"
              }`}
            >
              Students
            </Link>
            <button
              onClick={() => setContactModalOpen(true)}
              className={`hover:underline transition-colors ${
                isDarkActive ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-black"
              }`}
            >
              Community &amp; Support
            </button>
            {currentUser && (
              <button
                onClick={handleLogout}
                className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  isDarkActive ? "text-neutral-400 hover:text-white" : "text-neutral-400 hover:text-black"
                }`}
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* ───────────── MAIN NAVBAR HEADER (BLACK & WHITE) ───────────── */}
        <header
          className={`transition-colors duration-200 border-b ${
            isDarkActive
              ? "bg-black border-neutral-800 text-white"
              : "bg-white border-neutral-200 text-neutral-900"
          }`}
        >
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
            {/* Left: Brand Logo (Blackboard Bb Script Style) */}
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-3 group" onClick={() => setActiveMenu(null)}>
                <BbLogo
                  className="h-9 w-auto transition-transform group-hover:scale-105 duration-200"
                  color={isDarkActive ? "#ffffff" : "#000000"}
                />
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-2">
                {/* 1. Solutions (With Mega Menu) */}
                <button
                  onClick={() => setActiveMenu(isSolutionsOpen ? null : "solutions")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
                    isSolutionsOpen
                      ? "bg-neutral-800 text-white shadow-inner"
                      : isDarkActive
                      ? "text-neutral-300 hover:text-white hover:bg-neutral-900"
                      : "text-neutral-800 hover:text-black hover:bg-neutral-100"
                  }`}
                  aria-expanded={isSolutionsOpen}
                >
                  <span>Solutions</span>
                  {isSolutionsOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                </button>

                {/* 2. Resources */}
                <button
                  onClick={() => setActiveMenu(isResourcesOpen ? null : "resources")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
                    isResourcesOpen
                      ? "bg-neutral-800 text-white shadow-inner"
                      : isDarkActive
                      ? "text-neutral-300 hover:text-white hover:bg-neutral-900"
                      : "text-neutral-800 hover:text-black hover:bg-neutral-100"
                  }`}
                  aria-expanded={isResourcesOpen}
                >
                  <span>Resources</span>
                  {isResourcesOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                </button>

                {/* 3. Company */}
                <button
                  onClick={() => setActiveMenu(isCompanyOpen ? null : "company")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
                    isCompanyOpen
                      ? "bg-neutral-800 text-white shadow-inner"
                      : isDarkActive
                      ? "text-neutral-300 hover:text-white hover:bg-neutral-900"
                      : "text-neutral-800 hover:text-black hover:bg-neutral-100"
                  }`}
                  aria-expanded={isCompanyOpen}
                >
                  <span>Company</span>
                  {isCompanyOpen ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                </button>
              </nav>
            </div>

            {/* Right: Contact Us Button & Auth */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setContactModalOpen(true)}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isDarkActive
                    ? "border border-white text-white hover:bg-white/10"
                    : "border border-black text-black hover:bg-black hover:text-white"
                }`}
              >
                Contact Us
              </button>

              {currentUser ? (
                <Link
                  href={currentUser.role === "STUDENT" ? "/my-courses" : currentUser.role === "ADMIN" ? "/admin" : "/instructor"}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isDarkActive
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-black text-white hover:bg-neutral-800"
                  }`}
                  onClick={() => setActiveMenu(null)}
                >
                  Portal Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isDarkActive
                      ? "bg-white text-black hover:bg-neutral-200"
                      : "bg-black text-white hover:bg-neutral-800"
                  }`}
                  onClick={() => setActiveMenu(null)}
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              className={`md:hidden p-2 rounded-xl transition-colors ${
                isDarkActive ? "text-white" : "text-black"
              }`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>

          {/* ───────────── SOLUTIONS MEGA MENU DROPDOWN (PURE BLACK & WHITE + WARM ACCENT) ───────────── */}
          {isSolutionsOpen && (
            <div className="bg-black text-white border-t border-neutral-800 shadow-2xl py-12 px-6 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Column 1: By Industry */}
                <div className="md:col-span-3 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">
                      By Industry
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li>
                        <button
                          onClick={() => setActiveIndustry("higher-ed")}
                          className={`w-full text-left py-1.5 transition-colors ${
                            activeIndustry === "higher-ed"
                              ? "border-l-2 border-[#784D28] text-white pl-3 font-semibold"
                              : "text-neutral-400 hover:text-white pl-3 font-normal"
                          }`}
                        >
                          Higher Ed
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => setActiveIndustry("government")}
                          className={`w-full text-left py-1.5 transition-colors ${
                            activeIndustry === "government"
                              ? "border-l-2 border-[#784D28] text-white pl-3 font-semibold"
                              : "text-neutral-400 hover:text-white pl-3 font-normal"
                          }`}
                        >
                          Government
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => setActiveIndustry("workforce")}
                          className={`w-full text-left py-1.5 transition-colors ${
                            activeIndustry === "workforce"
                              ? "border-l-2 border-[#784D28] text-white pl-3 font-semibold"
                              : "text-neutral-400 hover:text-white pl-3 font-normal"
                          }`}
                        >
                          Workforce
                        </button>
                      </li>
                      <li>
                        <button
                          onClick={() => setActiveIndustry("k-12")}
                          className={`w-full text-left py-1.5 transition-colors ${
                            activeIndustry === "k-12"
                              ? "border-l-2 border-[#784D28] text-white pl-3 font-semibold"
                              : "text-neutral-400 hover:text-white pl-3 font-normal"
                          }`}
                        >
                          K-12
                        </button>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-neutral-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                      Explore
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li>
                        <Link
                          href="/courses"
                          onClick={() => setActiveMenu(null)}
                          className="text-neutral-300 hover:text-white transition-colors block py-1 font-medium"
                        >
                          All Solutions
                        </Link>
                      </li>
                      <li>
                        <a
                          href="#how-it-works"
                          onClick={() => setActiveMenu(null)}
                          className="text-neutral-300 hover:text-white transition-colors block py-1 font-medium"
                        >
                          Services
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Column 2: Learning Solutions */}
                <div className="md:col-span-3 space-y-4">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Learning Solutions
                  </h3>
                  <ul className="space-y-3 text-sm text-neutral-300">
                    <li>
                      <Link
                        href="/courses"
                        onClick={() => setActiveMenu(null)}
                        className="hover:text-white hover:underline transition-colors block"
                      >
                        Blackboard LMS
                      </Link>
                    </li>
                    <li>
                      <a
                        href="#how-it-works"
                        onClick={() => setActiveMenu(null)}
                        className="hover:text-white hover:underline transition-colors block"
                      >
                        Blackboard LMS: AVA
                      </a>
                    </li>
                    <li>
                      <a
                        href="#campus-life"
                        onClick={() => setActiveMenu(null)}
                        className="hover:text-white hover:underline transition-colors block"
                      >
                        Blackboard LMS: Adopt
                      </a>
                    </li>
                    <li>
                      <Link
                        href="/instructor/login"
                        onClick={() => setActiveMenu(null)}
                        className="hover:text-white hover:underline transition-colors block"
                      >
                        Blackboard LMS: Video Studio
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/courses"
                        onClick={() => setActiveMenu(null)}
                        className="hover:text-white hover:underline transition-colors block"
                      >
                        Blackboard LMS: Catalog
                      </Link>
                    </li>
                    <li>
                      <a
                        href="#curriculum"
                        onClick={() => setActiveMenu(null)}
                        className="hover:text-white hover:underline transition-colors block"
                      >
                        Blackboard LMS: Milestone
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Column 3: Accessibility & Analytics Solutions */}
                <div className="md:col-span-3 space-y-8">
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide mb-4">
                      Accessibility Solutions
                    </h3>
                    <ul className="space-y-3 text-sm text-neutral-300">
                      <li>
                        <a
                          href="#campus-life"
                          onClick={() => setActiveMenu(null)}
                          className="hover:text-white hover:underline transition-colors block"
                        >
                          Blackboard Ally
                        </a>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide mb-4">
                      Analytics Solutions
                    </h3>
                    <ul className="space-y-3 text-sm text-neutral-300">
                      <li>
                        <a
                          href="#instructors"
                          onClick={() => setActiveMenu(null)}
                          className="hover:text-white hover:underline transition-colors block"
                        >
                          Blackboard Illuminate
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Column 4: Evidence Solutions */}
                <div className="md:col-span-3 space-y-4">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Evidence Solutions
                  </h3>
                  <ul className="space-y-3 text-sm text-neutral-300">
                    <li>
                      <a
                        href="#how-it-works"
                        onClick={() => setActiveMenu(null)}
                        className="hover:text-white hover:underline transition-colors block"
                      >
                        Cursive by Blackboard
                      </a>
                    </li>
                    <li>
                      <a
                        href="#instructors"
                        onClick={() => setActiveMenu(null)}
                        className="hover:text-white hover:underline transition-colors block"
                      >
                        Blackboard Evaluate
                      </a>
                    </li>
                    <li>
                      <div className="font-semibold text-white">
                        Blackboard Institutional Effectiveness
                      </div>
                      <ul className="pl-3 mt-2 space-y-2 border-l border-neutral-700 text-neutral-400 text-xs">
                        <li>
                          <a
                            href="#instructors"
                            onClick={() => setActiveMenu(null)}
                            className="hover:text-white transition-colors block py-0.5"
                          >
                            Blackboard Accreditation
                          </a>
                        </li>
                        <li>
                          <a
                            href="#instructors"
                            onClick={() => setActiveMenu(null)}
                            className="hover:text-white transition-colors block py-0.5"
                          >
                            Blackboard Program Review
                          </a>
                        </li>
                        <li>
                          <a
                            href="#instructors"
                            onClick={() => setActiveMenu(null)}
                            className="hover:text-white transition-colors block py-0.5"
                          >
                            Blackboard Planning
                          </a>
                        </li>
                        <li>
                          <a
                            href="#instructors"
                            onClick={() => setActiveMenu(null)}
                            className="hover:text-white transition-colors block py-0.5"
                          >
                            Blackboard Outcomes
                          </a>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ───────────── RESOURCES DROPDOWN (BLACK & WHITE) ───────────── */}
          {isResourcesOpen && (
            <div className="bg-black text-white border-t border-neutral-800 shadow-2xl py-10 px-6 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Educator Resources</h3>
                  <p className="text-xs text-neutral-400">Teaching best practices, syllabus blueprints, and AI rubric guidelines.</p>
                  <Link
                    href="/instructor/login"
                    onClick={() => setActiveMenu(null)}
                    className="text-xs text-white hover:text-neutral-300 font-bold inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    Instructor Studio <FiArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Student Guides</h3>
                  <p className="text-xs text-neutral-400">How single active course enrollments and AI auto-grading work.</p>
                  <a
                    href="#how-it-works"
                    onClick={() => setActiveMenu(null)}
                    className="text-xs text-white hover:text-neutral-300 font-bold inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    View Pedagogical Model <FiArrowRight className="w-3 h-3" />
                  </a>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Curriculum Directory</h3>
                  <p className="text-xs text-neutral-400">Browse university-grade active modules and accredited coursework.</p>
                  <Link
                    href="/courses"
                    onClick={() => setActiveMenu(null)}
                    className="text-xs text-white hover:text-neutral-300 font-bold inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    Browse Catalog <FiArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Help &amp; Documentation</h3>
                  <p className="text-xs text-neutral-400">Need assistance? Reach our 24/7 academic support helpdesk.</p>
                  <button
                    onClick={() => { setActiveMenu(null); setContactModalOpen(true); }}
                    className="text-xs text-white hover:text-neutral-300 font-bold inline-flex items-center gap-1 underline underline-offset-4"
                  >
                    Contact Support <FiArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ───────────── COMPANY DROPDOWN (BLACK & WHITE) ───────────── */}
          {isCompanyOpen && (
            <div className="bg-black text-white border-t border-neutral-800 shadow-2xl py-10 px-6 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">About Blackboard &amp; Academia</h3>
                  <p className="text-xs text-neutral-400">Building authentic collegiate digital environments for deep immersion and rigor.</p>
                  <a href="#campus-life" onClick={() => setActiveMenu(null)} className="text-xs text-white hover:text-neutral-300 font-bold underline underline-offset-4">Campus Evolution →</a>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Academic Leadership</h3>
                  <p className="text-xs text-neutral-400">Advisory council comprising university deans, professors, and EdTech researchers.</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Trust &amp; Security</h3>
                  <p className="text-xs text-neutral-400">Enterprise data privacy, FERPA compliance, and secure AI evaluation sandboxes.</p>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white">Superadmin Control</h3>
                  <p className="text-xs text-neutral-400">Institutional control panel for user permissions and enrollment throttling.</p>
                  <Link href="/admin/login" onClick={() => setActiveMenu(null)} className="text-xs text-white hover:text-neutral-300 font-bold underline underline-offset-4">Admin Console →</Link>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* ───────────── MOBILE ACCORDION MENU ───────────── */}
        {mobileOpen && (
          <div className="md:hidden bg-black text-white px-6 py-6 space-y-5 border-t border-neutral-800 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-neutral-400 mb-2">Solutions</p>
              <div className="space-y-2 pl-3 border-l border-neutral-700 text-sm">
                <Link href="/courses" onClick={() => setMobileOpen(false)} className="block py-1">Blackboard LMS</Link>
                <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block py-1">AVA &amp; Auto-Grading</a>
                <a href="#campus-life" onClick={() => setMobileOpen(false)} className="block py-1">Blackboard Ally</a>
                <a href="#instructors" onClick={() => setMobileOpen(false)} className="block py-1">Blackboard Illuminate</a>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-neutral-400 mb-2">Resources</p>
              <div className="space-y-2 pl-3 border-l border-neutral-700 text-sm">
                <Link href="/courses" onClick={() => setMobileOpen(false)} className="block py-1">Course Catalog</Link>
                <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block py-1">Pedagogical Standards</a>
                <a href="#campus-life" onClick={() => setMobileOpen(false)} className="block py-1">Campus Life</a>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800 flex flex-col gap-3">
              <button
                onClick={() => { setMobileOpen(false); setContactModalOpen(true); }}
                className="w-full py-3 rounded-lg border border-white text-white text-xs font-bold uppercase tracking-wider text-center"
              >
                Contact Us
              </button>
              {currentUser ? (
                <Link
                  href={currentUser.role === "STUDENT" ? "/my-courses" : currentUser.role === "ADMIN" ? "/admin" : "/instructor"}
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider text-center"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full py-3 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider text-center"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ───────────── CONTACT US MODAL (BLACK & WHITE) ───────────── */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-neutral-200 relative text-black space-y-6">
            <button
              onClick={() => { setContactModalOpen(false); setContactSubmitted(false); }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
              aria-label="Close Modal"
            >
              <FiX className="w-5 h-5" />
            </button>

            {contactSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center mx-auto shadow-md">
                  <FiCheck className="w-7 h-7" />
                </div>
                <h3 className="font-heading font-bold text-2xl text-black">Inquiry Received</h3>
                <p className="text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed">
                  Thank you for reaching out. An academic representative will connect with your institution within 1 business day.
                </p>
                <button
                  onClick={() => { setContactModalOpen(false); setContactSubmitted(false); }}
                  className="px-8 py-3 rounded-full bg-black text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-neutral-800"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BbLogo className="h-6 w-auto" color="#000000" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#784D28]">Academic Inquiries</span>
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-black tracking-tight">Connect with Us</h3>
                  <p className="text-xs text-neutral-500">Discover how our LMS transforms institutional curriculum delivery.</p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContactSubmitted(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Eleanor Vance"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Institutional Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.vance@university.edu"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Institution / Organization</label>
                    <input
                      type="text"
                      required
                      placeholder="Cambridge Academic Council"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Message or Requirement</label>
                    <textarea
                      rows={3}
                      placeholder="Inquiring about syllabus AI benchmarks and LMS faculty deployment..."
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
                  >
                    Submit Institutional Inquiry
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
