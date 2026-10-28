"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/ui/Navbar";
import { MockCheckoutModal } from "@/components/ui/MockCheckoutModal";
import Link from "next/link";
import {
  FiBookOpen, FiLock, FiArrowRight, FiCheckCircle,
  FiLogIn, FiUserPlus, FiSearch, FiX, FiCompass,
} from "react-icons/fi";
import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";
import { formatNgn } from "@/lib/utils";



interface CatalogClientProps {
  currentUser: any;
  courses: any[];
  activeEnrollment: any;
  initialSearch?: string;
}

const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"];

export function CatalogClient({ currentUser, courses, activeEnrollment, initialSearch = "" }: CatalogClientProps) {
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [facultyFilter, setFacultyFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");

  const isStudent = currentUser?.role === "STUDENT";
  const studentDepartment = isStudent ? currentUser?.department : null;

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // If student has a department, courses must belong to their department
      if (studentDepartment) {
        if (c.department && c.department !== studentDepartment) return false;
      } else {
        const matchFac = facultyFilter === "All" || c.faculty === facultyFilter;
        const matchDept = deptFilter === "All" || c.department === deptFilter;
        if (!matchFac || !matchDept) return false;
      }

      const matchSearch =
        search.trim() === "" ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c.department?.toLowerCase().includes(search.toLowerCase());
      const matchLvl = levelFilter === "All" || c.level === levelFilter;
      return matchSearch && matchLvl;
    });
  }, [courses, search, facultyFilter, deptFilter, levelFilter, studentDepartment]);

  const handleOpenCheckout = (course: any) => {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
    setSelectedCourse(course);
    setIsCheckoutOpen(true);
  };

  const isFiltered = search || facultyFilter !== "All" || deptFilter !== "All" || levelFilter !== "All";

  return (
    <div className="min-h-screen bg-white text-black pb-20">
      <Navbar currentUser={currentUser} />

      {/* Hero Header */}
      <div className="bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="text-[11px] font-bold text-[#4A1A45] uppercase tracking-widest">
                Academic Curriculum
              </span>
              <h1 className="font-bold text-3xl sm:text-4xl text-black mt-1 leading-tight">
                Course Catalog
              </h1>
              <p className="text-neutral-600 text-sm mt-1 max-w-md leading-relaxed">
                Browse courses with structured lessons, instant assignment feedback and instructor review.
              </p>
            </div>

            {/* Active enrollment indicator */}
            {activeEnrollment && (
              <div className="flex items-center gap-3 px-5 py-3.5 rounded-lg bg-white border border-neutral-200 max-w-sm">
                <div className="p-2 rounded-xl bg-[#4A1A45] text-white shrink-0">
                  <FiBookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#4A1A45] uppercase">Currently Registered</p>
                  <p className="text-sm font-bold text-black truncate">{activeEnrollment.course.title}</p>
                </div>
                <Link
                  href={`/student/courses/${activeEnrollment.course.id}`}
                  className="shrink-0 p-2 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white transition-all"
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
                  className="px-4 py-2.5 rounded-md border border-neutral-300 text-xs font-bold text-black hover:bg-neutral-100 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 rounded-md bg-[#4A1A45] text-white text-xs font-bold transition-all hover:bg-[#3B1537]"
                >
                  Join Free
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Student Department Identity Banner */}
        {isStudent && studentDepartment && (
          <div className="bg-[#2D0F2A] border border-[#3B1537] text-white p-6 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-[#D6BDD4] uppercase tracking-widest block">
                Exclusive Departmental Curriculum
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {studentDepartment}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Faculty / School: <strong className="text-neutral-200">{currentUser.faculty || "Academic Division"}</strong> · Only courses for your department are visible
              </p>
            </div>
            <Link
              href="/profile"
              className="px-5 py-2.5 rounded-md bg-[#4A1A45] border border-white/20 text-xs font-bold text-white hover:bg-[#3B1537] transition-all shrink-0"
            >
              Update Department
            </Link>
          </div>
        )}

        {/* Student Missing Department Warning Banner */}
        {isStudent && !studentDepartment && (
          <div className="bg-[#2D0F2A] text-white p-6 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#3B1537]">
            <div>
              <span className="text-[10px] font-bold text-[#D6BDD4] uppercase tracking-widest block">
                Department Assignment Required
              </span>
              <h2 className="text-lg font-bold text-white mt-1">
                Select Your School &amp; Department
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                You have not selected an academic department yet. Select your department in your profile to access your curriculum.
              </p>
            </div>
            <Link
              href="/profile"
              className="px-5 py-2.5 rounded-md bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-all shrink-0"
            >
              Set Department in Profile
            </Link>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white rounded-lg border border-neutral-200 p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <FiSearch className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4" />
            <input
              type="text"
              placeholder={
                studentDepartment
                  ? `Search ${studentDepartment} courses...`
                  : "Search courses by title, topic, or department..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-md bg-neutral-50 border border-neutral-200 text-xs text-black outline-none focus:border-[#4A1A45] placeholder:text-neutral-400"
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* Show Faculty and Dept filters only for non-students or students without a set department */}
            {!studentDepartment && (
              <>
                <select
                  value={facultyFilter}
                  onChange={(e) => {
                    setFacultyFilter(e.target.value);
                    setDeptFilter("All");
                  }}
                  className="px-3.5 py-2 text-xs rounded-md bg-neutral-50 border border-neutral-200 font-bold text-neutral-700 outline-none max-w-[190px]"
                >
                  <option value="All">All Schools</option>
                  {ACADEMIC_STRUCTURE.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-3.5 py-2 text-xs rounded-md bg-neutral-50 border border-neutral-200 font-bold text-neutral-700 outline-none max-w-[200px]"
                >
                  <option value="All">All Departments</option>
                  {(facultyFilter === "All"
                    ? ACADEMIC_STRUCTURE.flatMap((f) => f.departments)
                    : getDepartmentsForFaculty(facultyFilter)
                  ).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </>
            )}

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-4 py-2 text-xs rounded-md bg-neutral-50 border border-neutral-200 font-bold text-neutral-700 outline-none"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l === "All" ? "All Levels" : l}
                </option>
              ))}
            </select>

            {isFiltered && (
              <button
                onClick={() => {
                  setSearch("");
                  setFacultyFilter("All");
                  setDeptFilter("All");
                  setLevelFilter("All");
                }}
                className="px-4 py-2 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition-all"
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
              : `${courses.length} Department Courses`}
          </h2>
          <div className="flex items-center gap-1.5 font-bold">
            <span>Single active enrollment rule enforced</span>
          </div>
        </div>

        {/* Course Cards Grid */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-lg border border-neutral-200 py-16 text-center space-y-2">
            <FiSearch className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="font-bold text-neutral-700 text-base">
              {studentDepartment
                ? `No courses currently published for ${studentDepartment}.`
                : "No courses found matching criteria."}
            </p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              {studentDepartment
                ? "Your faculty instructors will publish your semester modules and rubrics here."
                : "Try resetting your search filters or browse other faculties."}
            </p>
            {isFiltered && (
              <button
                onClick={() => {
                  setSearch("");
                  setFacultyFilter("All");
                  setDeptFilter("All");
                  setLevelFilter("All");
                }}
                className="mt-3 text-xs text-[#4A1A45] font-bold hover:underline"
              >
                Reset filters
              </button>
            )}
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
                  className="bg-white rounded-lg border border-neutral-200 transition-colors flex flex-col justify-between overflow-hidden group"
                >
                  {course.coverImage && (
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      className="w-full h-44 object-cover"
                    />
                  )}

                  <div className="p-6 space-y-3 flex-1 flex flex-col">
                    <p className="text-xs text-neutral-500 flex items-center justify-between gap-3">
                      <span>{course.category}</span>
                      <span className="font-semibold text-black">{course.price === 0 ? "Free" : formatNgn(course.price)}</span>
                    </p>
                    <h3 className="font-heading font-semibold text-xl text-black leading-snug group-hover:text-[#4A1A45] transition-colors">{course.title}</h3>
                    <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed flex-1">{course.description}</p>

                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      {course.department && (
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#4A1A45] text-white">
                          {course.department}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold border bg-neutral-50 text-neutral-800 border-neutral-200">
                        {course.level}
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {course.modules?.length || 0} modules
                      </span>
                      <span className="text-[11px] text-neutral-400">·</span>
                      <span className="text-[11px] text-neutral-500">{lessonCount} lessons</span>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-600">
                      <span className="font-bold text-black truncate">Instructor: {course.tutor?.name || "Instructor"}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-neutral-50 border-t border-neutral-200 space-y-2">
                    <Link
                      href={`/courses/${course.id}`}
                      className="w-full py-2 rounded-md border border-neutral-300 bg-white text-xs font-bold text-black flex items-center justify-center hover:border-black transition-all"
                    >
                      View Syllabus Details
                    </Link>

                    {isEnrolledInThis ? (
                      <Link
                        href={`/student/courses/${course.id}`}
                        className="w-full py-2.5 rounded-md bg-[#4A1A45] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#3B1537]"
                      >
                        <FiCheckCircle className="w-3.5 h-3.5 text-white" /> Continue Learning
                      </Link>
                    ) : isLocked ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-md bg-neutral-200 text-neutral-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <FiLock className="w-3.5 h-3.5" /> Registration Locked
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCheckout(course)}
                        className="w-full py-2.5 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
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
