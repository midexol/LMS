"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/ui/Navbar";
import { MockCheckoutModal } from "@/components/ui/MockCheckoutModal";
import Link from "next/link";
import {
  FiBookOpen, FiLock, FiArrowRight, FiCheckCircle,
  FiLogIn, FiUserPlus, FiSearch, FiBarChart2, FiX,
} from "react-icons/fi";

interface CatalogClientProps {
  currentUser: any;
  courses: any[];
  activeEnrollment: any;
}

const CATEGORIES = ["All", "Software Engineering", "Computer Science", "Data Science & AI", "Design & UX", "Business & Management"];
const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"];

// Category-based visual palette for course cards — no image required
const CATEGORY_VISUALS: Record<string, { bg: string; label: string }> = {
  "Software Engineering":  { bg: "from-neutral-950 to-neutral-800", label: "SE" },
  "Computer Science":      { bg: "from-neutral-900 to-neutral-700", label: "CS" },
  "Data Science & AI":     { bg: "from-neutral-950 to-[#2a1a0e]",  label: "AI" },
  "Design & UX":           { bg: "from-[#1a0e05] to-neutral-900",  label: "UX" },
  "Business & Management": { bg: "from-neutral-900 to-neutral-950", label: "BM" },
  General:                 { bg: "from-neutral-800 to-neutral-950", label: "GN" },
};
function getCourseVisual(category: string) {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS["General"];
}

export function CatalogClient({ currentUser, courses, activeEnrollment }: CatalogClientProps) {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        search.trim() === "" ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "All" || c.category === categoryFilter;
      const matchLvl = levelFilter === "All" || c.level === levelFilter;
      return matchSearch && matchCat && matchLvl;
    });
  }, [courses, search, categoryFilter, levelFilter]);

  const handleOpenCheckout = (course: any) => {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
    setSelectedCourse(course);
    setIsCheckoutOpen(true);
  };

  const isFiltered = search || categoryFilter !== "All" || levelFilter !== "All";

  return (
    <div className="min-h-screen bg-white text-black pb-20">
      <Navbar currentUser={currentUser} />

      {/* Hero Header */}
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-[11px] font-bold text-[#784D28] uppercase tracking-widest">
                Academic Curriculum
              </span>
              <h1 className="font-bold text-3xl sm:text-4xl text-black mt-1 leading-tight">
                Course Catalog
              </h1>
              <p className="text-neutral-600 text-sm mt-1 max-w-md leading-relaxed">
                Explore university-grade courses with AI-evaluated rubrics and mentor oversight.
              </p>
            </div>

            {/* Active enrollment indicator */}
            {activeEnrollment && (
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-neutral-200 max-w-sm shadow-sm">
                <div className="p-2 rounded-xl bg-black text-white shrink-0">
                  <FiBookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#784D28] uppercase">Currently Registered</p>
                  <p className="text-sm font-bold text-black truncate">{activeEnrollment.course.title}</p>
                </div>
                <Link
                  href={`/student/courses/${activeEnrollment.course.id}`}
                  className="shrink-0 p-2 rounded-xl bg-black hover:bg-neutral-800 text-white transition-all shadow-sm"
                  title="Continue Course"
                >
                  <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {!currentUser && (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2.5 rounded-full border border-neutral-300 text-xs font-bold text-black hover:bg-neutral-100 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 rounded-full bg-black text-white text-xs font-bold shadow-sm transition-all hover:bg-neutral-800"
                >
                  Join Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Search & Filters */}
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search courses by title, topic, or instructor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-black placeholder:text-neutral-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-black"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 text-xs rounded-full bg-neutral-50 border border-neutral-200 font-bold text-neutral-700 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>
              ))}
            </select>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2 text-xs rounded-full bg-neutral-50 border border-neutral-200 font-bold text-neutral-700 outline-none"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>{l === "All" ? "All Levels" : l}</option>
              ))}
            </select>
            {isFiltered && (
              <button
                onClick={() => { setSearch(""); setCategoryFilter("All"); setLevelFilter("All"); }}
                className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-all"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between px-1 text-xs text-neutral-500">
          <h2 className="font-bold text-base text-black">
            {isFiltered
              ? `${filteredCourses.length} course${filteredCourses.length !== 1 ? "s" : ""} found`
              : `${courses.length} Available Courses`}
          </h2>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-[#784D28]" />
            <span>Single active enrollment rule enforced</span>
          </div>
        </div>

        {/* Course Cards Grid */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-3xl border border-neutral-200 py-16 text-center shadow-sm">
            <FiSearch className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
            <p className="font-bold text-neutral-600 text-base">No courses found matching criteria.</p>
            <button
              onClick={() => { setSearch(""); setCategoryFilter("All"); setLevelFilter("All"); }}
              className="mt-3 text-xs text-[#784D28] font-bold hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course, idx) => {
              const isEnrolledInThis = activeEnrollment?.courseId === course.id;
              const isLocked = activeEnrollment && !isEnrolledInThis;
              const lessonCount = course.modules?.reduce((a: number, m: any) => a + (m.lessons?.length || 0), 0) || 0;

              return (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl border border-neutral-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                >
                  {/* Course Card Visual Header — fixed by default, or tutor custom image */}
                  {(() => {
                    const vis = getCourseVisual(course.category);
                    if (course.coverImage) {
                      return (
                        <div className="relative h-44 w-full overflow-hidden bg-neutral-900 group">
                          <img
                            src={course.coverImage}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white border border-white/20">
                            {course.category}
                          </span>
                          <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-black bg-white text-black shadow-md">
                            ${course.price.toFixed(2)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div className={`relative h-44 w-full bg-gradient-to-br ${vis.bg} flex flex-col items-start justify-end p-5 overflow-hidden`}>
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[88px] font-black text-white/5 select-none pointer-events-none leading-none">
                          {vis.label}
                        </span>
                        <span className="relative px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 backdrop-blur-sm text-white border border-white/15">
                          {course.category}
                        </span>
                        <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black bg-white text-black shadow-md">
                          ${course.price.toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="p-6 space-y-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-black leading-snug group-hover:text-[#784D28] transition-colors">{course.title}</h3>
                    <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed flex-1">{course.description}</p>

                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border bg-neutral-50 text-neutral-800 border-neutral-200">
                        {course.level}
                      </span>
                      <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                        <FiBarChart2 className="w-3.5 h-3.5 text-[#784D28]" />
                        {course.modules?.length || 0} modules
                      </span>
                      <span className="text-[11px] text-neutral-400">·</span>
                      <span className="text-[11px] text-neutral-500">{lessonCount} lessons</span>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-600">
                      <div className="w-6 h-6 rounded-full bg-neutral-100 text-black flex items-center justify-center font-bold text-[10px]">
                        {course.tutor?.name?.charAt(0) || "T"}
                      </div>
                      <span className="font-bold text-black truncate">Instructor: {course.tutor?.name || "Instructor"}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-neutral-50 border-t border-neutral-200 space-y-2">
                    <Link
                      href={`/courses/${course.id}`}
                      className="w-full py-2 rounded-full border border-neutral-300 bg-white text-xs font-bold text-black flex items-center justify-center hover:border-black transition-all shadow-sm"
                    >
                      View Syllabus Details
                    </Link>

                    {isEnrolledInThis ? (
                      <Link
                        href={`/student/courses/${course.id}`}
                        className="w-full py-2.5 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-neutral-800"
                      >
                        <FiCheckCircle className="w-3.5 h-3.5 text-white" /> Continue Learning
                      </Link>
                    ) : isLocked ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-full bg-neutral-200 text-neutral-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <FiLock className="w-3.5 h-3.5" /> Registration Locked
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCheckout(course)}
                        className="w-full py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        {!currentUser ? "Sign In to Enroll" : "Enroll in Course"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedCourse && (
        <MockCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          currentUser={currentUser}
          course={selectedCourse}
          activeEnrollment={
            activeEnrollment
              ? { id: activeEnrollment.id, courseId: activeEnrollment.course.id, courseTitle: activeEnrollment.course.title }
              : null
          }
          onEnrollSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}
