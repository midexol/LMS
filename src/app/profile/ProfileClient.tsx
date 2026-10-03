"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Navbar } from "@/components/ui/Navbar";
import Link from "next/link";
import {
  FiUser, FiMail, FiBookOpen, FiAward, FiCheckCircle, FiArrowRight,
  FiSave, FiLock, FiCheck, FiAlertCircle, FiEye, FiEyeOff, FiCompass,
} from "react-icons/fi";
import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";

interface ProfileClientProps {
  currentUser: any;
  enrollments: any[];
  submissions: any[];
}

export function ProfileClient({ currentUser, enrollments, submissions }: ProfileClientProps) {
  const [name, setName] = useState(currentUser.name || "");
  const [faculty, setFaculty] = useState(currentUser.faculty || ACADEMIC_STRUCTURE[0].name);
  const [department, setDepartment] = useState(
    currentUser.department || (getDepartmentsForFaculty(currentUser.faculty || ACADEMIC_STRUCTURE[0].name)[0] ?? "")
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFacultyChange = (newFac: string) => {
    setFaculty(newFac);
    const depts = getDepartmentsForFaculty(newFac);
    setDepartment(depts[0] || "");
  };

  const activeEnrollment = enrollments.find((e) => e.status === "ACTIVE");
  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED");

  const totalSubmissions = submissions.length;
  const gradedSubmissions = submissions.filter((s) => s.score !== null && s.score !== undefined);

  let totalScoreEarned = 0;
  let totalMaxScorePossible = 0;
  gradedSubmissions.forEach((s) => {
    totalScoreEarned += s.score || 0;
    totalMaxScorePossible += s.assignment?.maxScore || 100;
  });

  const averagePercentage =
    totalMaxScorePossible > 0
      ? Math.round((totalScoreEarned / totalMaxScorePossible) * 100)
      : 0;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(false);

    if (password && password.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    if (password && password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter your new password.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/student/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          faculty,
          department,
          password: password || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");

      setSuccessMsg(true);
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-black pb-20 font-sans">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* STUDENT HEADER */}
        <div className="p-8 rounded-3xl bg-white border border-neutral-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-black text-white flex items-center justify-center font-black text-2xl shadow-sm">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-black text-2xl text-black">{currentUser.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#784D28]/10 text-[#784D28] border border-[#784D28]/30 text-[10px] font-bold uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
                <FiMail className="w-3.5 h-3.5 text-[#784D28]" /> {currentUser.email}
              </p>
              {currentUser.department && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-black text-[11px] font-bold border border-neutral-300">
                    {currentUser.department}
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    ({currentUser.faculty})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
            <div className="px-4 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
              <span className="block text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Assignments Submitted</span>
              <span className="text-xl font-black text-black">{totalSubmissions}</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
              <span className="block text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Courses Completed</span>
              <span className="text-xl font-black text-black">{completedEnrollments.length}</span>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-center">
              <span className="block text-neutral-500 text-[10px] uppercase font-bold tracking-wider">Grade Average</span>
              <span className="text-xl font-black text-[#784D28]">{averagePercentage}%</span>
            </div>
          </div>
        </div>

        {/* ACTIVE COURSE BANNER */}
        {activeEnrollment && (
          <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#784D28]/10 text-[#784D28] border border-[#784D28]/30 uppercase tracking-wider">
                    Current Active Track
                  </span>
                  <span className="text-xs text-neutral-500">{activeEnrollment.course.category}</span>
                </div>
                <h3 className="font-black text-xl text-black">{activeEnrollment.course.title}</h3>
              </div>
              <Link
                href={`/student/courses/${activeEnrollment.course.id}`}
                className="px-6 py-2.5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all shrink-0"
              >
                Go to Course <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ACADEMIC TRANSCRIPT */}
        <div className="p-8 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-6">
          <h2 className="font-black text-xl text-black flex items-center gap-2 border-b border-neutral-200 pb-3">
            <FiAward className="w-5 h-5 text-[#784D28]" />
            Academic Transcript &amp; Course History
          </h2>

          {enrollments.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <FiBookOpen className="w-10 h-10 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-500 italic">No course enrollments registered yet.</p>
              <Link href="/" className="text-xs text-[#784D28] font-bold hover:underline">
                Browse course catalog
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase font-bold tracking-wider bg-neutral-50">
                    <th className="p-3.5">Course Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Enrolled</th>
                    <th className="p-3.5">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-black">{e.course.title}</td>
                      <td className="p-3.5 font-semibold text-[#784D28]">{e.course.category}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          e.status === "ACTIVE"
                            ? "bg-[#784D28]/10 text-[#784D28] border border-[#784D28]/30"
                            : "bg-black text-white"
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-neutral-500">{formatDate(e.enrolledAt)}</td>
                      <td className="p-3.5 text-neutral-500">{e.completedAt ? formatDate(e.completedAt) : "In Progress"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ACCOUNT SETTINGS */}
        <div className="p-8 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-6 max-w-2xl">
          <h2 className="font-black text-xl text-black flex items-center gap-2 border-b border-neutral-200 pb-3">
            <FiUser className="w-5 h-5 text-black" />
            Account Settings
          </h2>

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-neutral-100 text-black text-xs font-bold border border-neutral-300 flex items-center gap-2">
              <FiCheck className="w-4 h-4 text-black" /> Profile updated successfully!
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-red-50 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-2">
              <FiAlertCircle className="w-4 h-4 shrink-0 text-red-600" /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                  Faculty / School
                </label>
                <select
                  value={faculty}
                  onChange={(e) => handleFacultyChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black outline-none focus:border-black transition-all"
                >
                  {ACADEMIC_STRUCTURE.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-black outline-none focus:border-black transition-all"
                >
                  {getDepartmentsForFaculty(faculty).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 italic">
              Note: Changing your department adjusts which course curriculum catalog is accessible to you.
            </p>

            <div className="pt-2 border-t border-neutral-200 space-y-3">
              <p className="text-xs font-bold text-neutral-700 flex items-center gap-1.5 uppercase tracking-wider">
                <FiLock className="w-3.5 h-3.5 text-[#784D28]" /> Change Password (leave blank to preserve current)
              </p>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-black"
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {password && (
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1 uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-neutral-50 border text-sm text-black outline-none transition-all ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-400 focus:border-red-500"
                        : confirmPassword && confirmPassword === password
                        ? "border-black focus:border-black"
                        : "border-neutral-200 focus:border-black"
                    }`}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-[11px] text-red-600 mt-1 font-medium">Passwords do not match.</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || (password.length > 0 && password !== confirmPassword)}
              className="px-6 py-3 rounded-full bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
            >
              <FiSave className="w-4 h-4" />
              {saving ? "Saving..." : "Save Profile Updates"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
