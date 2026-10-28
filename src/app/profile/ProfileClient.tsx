"use client";

import React, { useState } from "react";
import { formatDate, formatNgn } from "@/lib/utils";
import { Navbar } from "@/components/ui/Navbar";
import Link from "next/link";
import { PiArrowRight, PiBookOpen, PiCheck, PiCheckCircle, PiCreditCard, PiEnvelopeSimple, PiEye, PiEyeSlash, PiFileText, PiFloppyDisk, PiLock, PiMedal, PiPrinter, PiShield, PiSlidersHorizontal, PiTrash, PiUser, PiWarningCircle, PiX } from "react-icons/pi";
import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";
import { AcademiaLogoIcon } from "@/components/ui/BrandLogo";

interface ProfileClientProps {
  currentUser: any;
  enrollments: any[];
  submissions: any[];
  payments?: any[];
}

/** The fee breakdown saved with a payment when it was started (older payments have none). */
function parseReceiptBreakdown(metadata?: string | null) {
  if (!metadata) return null;
  try {
    const b = JSON.parse(metadata)?.breakdown;
    return b && typeof b.coursePriceNgn === "number" ? (b as { coursePriceNgn: number; platformFeeNgn: number; processingFeeNgn: number; platformFeeLabel: string }) : null;
  } catch {
    return null;
  }
}

export function ProfileClient({ currentUser, enrollments, submissions, payments = [] }: ProfileClientProps) {
  const [name, setName] = useState(currentUser.name || "");
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [faculty, setFaculty] = useState(currentUser.faculty || ACADEMIC_STRUCTURE[0].name);
  const [department, setDepartment] = useState(
    currentUser.department || (getDepartmentsForFaculty(currentUser.faculty || ACADEMIC_STRUCTURE[0].name)[0] ?? "")
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active enrollment & Course Drop state
  const [activeEnrollment, setActiveEnrollment] = useState(
    enrollments.find((e) => e.status === "ACTIVE") || null
  );
  const [dropModalOpen, setDropModalOpen] = useState(false);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropMsg, setDropMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active Receipt Modal state
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const completedEnrollments = enrollments.filter((e) => e.status === "COMPLETED");
  const receiptBreakdown = selectedReceipt ? parseReceiptBreakdown(selectedReceipt.metadata) : null;

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

  const handleFacultyChange = (newFac: string) => {
    setFaculty(newFac);
    const depts = getDepartmentsForFaculty(newFac);
    setDepartment(depts[0] || "");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(false);

    if (password && password.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    if (password && !currentPassword) {
      setErrorMsg("Enter your current password to set a new one.");
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
          phone,
          password: password || undefined,
          currentPassword: password ? currentPassword : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed.");

      setSuccessMsg(true);
      setPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDropCourse = async () => {
    if (!activeEnrollment) return;
    setDropLoading(true);
    setDropMsg(null);

    try {
      const res = await fetch("/api/student/courses/drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: activeEnrollment.course.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to drop course.");

      setDropMsg({ type: "success", text: data.message });
      setActiveEnrollment(null);
      setDropModalOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setDropMsg({ type: "error", text: err.message || "Could not drop course." });
    } finally {
      setDropLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-black pb-20 font-sans">
      <Navbar currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-5 sm:px-6 py-7 sm:py-8 space-y-6 sm:space-y-8">
        {/* STUDENT HEADER */}
        <div className="p-6 sm:p-8 rounded-lg bg-white border border-rule flex flex-col md:flex-row justify-between items-start md:items-center gap-5 sm:gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-lg bg-[#4A1A45] text-white flex items-center justify-center font-bold text-2xl">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-bold text-2xl text-black">{currentUser.name}</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-[#4A1A45]/10 text-[#4A1A45] border border-[#4A1A45]/30 text-xs sm:text-[10px] font-bold normal-case sm:uppercase tracking-normal sm:tracking-wider">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
                <PiEnvelopeSimple className="w-3.5 h-3.5 text-[#4A1A45]" /> {currentUser.email}
              </p>
              {currentUser.department && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#F3EAF2] text-black text-xs sm:text-[11px] font-bold border border-neutral-300">
                    {currentUser.department}
                  </span>
                  <span className="text-xs sm:text-[11px] text-neutral-400">
                    ({currentUser.faculty})
                  </span>
                </div>
              )}
            </div>
          </div>

          {currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN" ? (
            <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
              <Link
                href="/admin"
                className="px-5 py-2.5 rounded-md bg-[#4A1A45] text-white hover:bg-[#3B1537] font-bold transition-all flex items-center gap-2"
              >
                <PiShield className="w-4 h-4 text-emerald-400" />
                <span>Superadmin Console</span>
              </Link>
              <Link
                href="/admin?tab=settings"
                className="px-5 py-2.5 rounded-md bg-white border border-neutral-300 text-black hover:bg-[#F3EAF2] font-bold transition-all flex items-center gap-2"
              >
                <PiSlidersHorizontal className="w-4 h-4 text-[#4A1A45]" />
                <span>System Settings</span>
              </Link>
            </div>
          ) : currentUser.role === "TUTOR" ? (
            <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
              <Link
                href="/instructor"
                className="px-5 py-2.5 rounded-md bg-[#4A1A45] text-white hover:bg-[#3B1537] font-bold transition-all flex items-center gap-2"
              >
                <PiBookOpen className="w-4 h-4 text-[#D6BDD4]" />
                <span>Instructor Studio</span>
              </Link>
              <Link
                href="/instructor?tab=settings"
                className="px-5 py-2.5 rounded-md bg-white border border-neutral-300 text-black hover:bg-[#F3EAF2] font-bold transition-all flex items-center gap-2"
              >
                <PiSlidersHorizontal className="w-4 h-4 text-[#4A1A45]" />
                <span>Studio Settings</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-xs font-semibold flex-wrap">
              <div className="px-4 py-2.5 rounded-lg bg-[#F7F2F6] border border-rule text-center">
                <span className="block text-neutral-500 text-xs sm:text-[10px] normal-case sm:uppercase font-bold tracking-normal sm:tracking-wider">Assignments Submitted</span>
                <span className="text-xl font-bold text-black">{totalSubmissions}</span>
              </div>
              <div className="px-4 py-2.5 rounded-lg bg-[#F7F2F6] border border-rule text-center">
                <span className="block text-neutral-500 text-xs sm:text-[10px] normal-case sm:uppercase font-bold tracking-normal sm:tracking-wider">Courses Completed</span>
                <span className="text-xl font-bold text-black">{completedEnrollments.length}</span>
              </div>
              <div className="px-4 py-2.5 rounded-lg bg-[#F7F2F6] border border-rule text-center">
                <span className="block text-neutral-500 text-xs sm:text-[10px] normal-case sm:uppercase font-bold tracking-normal sm:tracking-wider">Grade Average</span>
                <span className="text-xl font-bold text-[#4A1A45]">{averagePercentage}%</span>
              </div>
            </div>
          )}
        </div>

        {/* FEEDBACK NOTICE */}
        {dropMsg && (
          <div
            className={`p-4 rounded-lg text-xs font-bold border flex items-center gap-2 ${
              dropMsg.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-red-50 text-red-900 border-red-200"
            }`}
          >
            {dropMsg.type === "success" ? (
              <PiCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <PiWarningCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{dropMsg.text}</span>
          </div>
        )}

        {/* ACTIVE COURSE BANNER (WITH DROP COURSE ACTION) */}
        {activeEnrollment && (
          <div className="p-5 sm:p-6 rounded-lg bg-white border border-rule space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs sm:text-[10px] font-bold bg-[#4A1A45]/10 text-[#4A1A45] border border-[#4A1A45]/30 normal-case sm:uppercase tracking-normal sm:tracking-wider">
                    Current Active Track
                  </span>
                  <span className="text-xs text-neutral-500">{activeEnrollment.course.category}</span>
                </div>
                <h3 className="font-bold text-xl text-black">{activeEnrollment.course.title}</h3>
                <p className="text-xs text-neutral-500">
                  Single course policy active. Complete assignments or drop this track to enroll elsewhere.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setDropModalOpen(true)}
                  className="px-4 py-2.5 rounded-md border border-neutral-300 text-neutral-700 hover:text-red-600 hover:border-red-300 font-bold text-xs normal-case sm:uppercase tracking-normal sm:tracking-wider flex items-center gap-1.5 transition-all"
                  title="Drop course to unlock new enrollment"
                >
                  <PiTrash className="w-3.5 h-3.5" /> Drop Track
                </button>
                <Link
                  href={`/student/courses/${activeEnrollment.course.id}`}
                  className="px-5 sm:px-6 py-2.5 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs normal-case sm:uppercase tracking-normal sm:tracking-wider flex items-center gap-2 transition-all"
                >
                  Go to Course <PiArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ACADEMIC TRANSCRIPT & RECEIPTS (STUDENTS ONLY) */}
        {currentUser.role === "STUDENT" && (
          <>
            <div className="p-6 sm:p-8 rounded-lg bg-white border border-rule space-y-5 sm:space-y-6">
          <h2 className="font-bold text-xl text-black flex items-center gap-2 border-b border-rule pb-3">
            <PiMedal className="w-5 h-5 text-[#4A1A45]" />
            Academic Records &amp; Course History
          </h2>

          {enrollments.length === 0 ? (
            <div className="text-center py-7 sm:py-8 space-y-3">
              <PiBookOpen className="w-10 h-10 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-500 italic">No course enrollments registered yet.</p>
              <Link href="/courses" className="text-xs text-[#4A1A45] font-bold hover:underline">
                Browse course catalog
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-rule text-neutral-500 normal-case sm:uppercase font-bold tracking-normal sm:tracking-wider bg-[#F7F2F6]">
                    <th className="p-3.5">Course Title</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Enrolled</th>
                    <th className="p-3.5">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {enrollments.map((e) => (
                    <tr key={e.id} className="hover:bg-[#F7F2F6] transition-colors">
                      <td className="p-3.5 font-bold text-black">{e.course.title}</td>
                      <td className="p-3.5 font-semibold text-[#4A1A45]">{e.course.category}</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs sm:text-[10px] font-bold normal-case sm:uppercase ${
                          e.status === "ACTIVE"
                            ? "bg-[#4A1A45]/10 text-[#4A1A45] border border-[#4A1A45]/30"
                            : "bg-[#4A1A45] text-white"
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

        {/* TUITION RECEIPTS & PAYMENT HISTORY */}
        <div id="receipts" className="p-6 sm:p-8 rounded-lg bg-white border border-rule space-y-5 sm:space-y-6">
          <div className="flex justify-between items-center border-b border-rule pb-3">
            <h2 className="font-bold text-xl text-black flex items-center gap-2">
              <PiCreditCard className="w-5 h-5 text-black" />
              Tuition Receipts &amp; Payment History
            </h2>
            <span className="text-xs sm:text-[11px] text-neutral-500 font-semibold flex items-center gap-1.5">
              <PiShield className="w-3.5 h-3.5 text-emerald-600" /> Secured by Paystack
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-7 sm:py-8 space-y-2">
              <PiFileText className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-500 italic">No payment transactions recorded for this account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-rule text-neutral-500 normal-case sm:uppercase font-bold tracking-normal sm:tracking-wider bg-[#F7F2F6]">
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">Course Item</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Payment Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">E-Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F7F2F6] transition-colors">
                      <td className="p-3.5 font-mono text-xs sm:text-[11px] font-bold text-neutral-800">{p.reference}</td>
                      <td className="p-3.5 font-bold text-black">{p.course?.title || "Course Tuition"}</td>
                      <td className="p-3.5 font-bold text-black">{formatNgn(p.amount)}</td>
                      <td className="p-3.5 text-neutral-500">{formatDate(p.createdAt)}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs sm:text-[10px] font-bold normal-case sm:uppercase ${
                            p.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : p.status === "PENDING"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-red-100 text-red-800 border border-red-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="px-3 py-1 rounded-md text-xs sm:text-[11px] font-bold bg-[#F3EAF2] hover:bg-[#4A1A45] hover:text-white border border-neutral-300 transition-all inline-flex items-center gap-1.5"
                        >
                          <PiPrinter className="w-3 h-3" /> View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )}

        {/* ACCOUNT SETTINGS */}
        <div className="p-6 sm:p-8 rounded-lg bg-white border border-rule space-y-5 sm:space-y-6 max-w-2xl">
          <h2 className="font-bold text-xl text-black flex items-center gap-2 border-b border-rule pb-3">
            <PiUser className="w-5 h-5 text-black" />
            Account Settings
          </h2>

          {successMsg && (
            <div className="p-3.5 rounded-lg bg-[#F3EAF2] text-black text-xs font-bold border border-neutral-300 flex items-center gap-2">
              <PiCheck className="w-4 h-4 text-black" /> Profile updated successfully!
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-50 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-2">
              <PiWarningCircle className="w-4 h-4 shrink-0 text-red-600" /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 normal-case sm:uppercase tracking-normal sm:tracking-wider">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 normal-case sm:uppercase tracking-normal sm:tracking-wider">Email Address</label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F3EAF2] border border-rule text-sm text-neutral-500 cursor-not-allowed outline-none"
              />
              <span className="text-xs sm:text-[10px] text-neutral-400 mt-1 block">Your login email cannot be changed here.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1.5 normal-case sm:uppercase tracking-normal sm:tracking-wider">
                Phone Number <span className="text-neutral-400 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="e.g. 0803 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] transition-all"
              />
            </div>

            {currentUser.role !== "ADMIN" && currentUser.role !== "SUPERADMIN" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 normal-case sm:uppercase tracking-normal sm:tracking-wider">School / Faculty</label>
                  <select
                    value={faculty}
                    onChange={(e) => handleFacultyChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] transition-all"
                  >
                    {ACADEMIC_STRUCTURE.map((fac) => (
                      <option key={fac.name} value={fac.name}>{fac.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5 normal-case sm:uppercase tracking-normal sm:tracking-wider">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] transition-all"
                  >
                    {getDepartmentsForFaculty(faculty).map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-rule space-y-4">
              <h3 className="font-bold text-sm text-black normal-case sm:uppercase tracking-normal sm:tracking-wider flex items-center gap-1.5">
                <PiLock className="w-4 h-4 text-[#4A1A45]" /> Security &amp; Password
              </h3>

              <div>
                <label className="block text-xs font-bold text-neutral-600 mb-1 normal-case sm:uppercase tracking-normal sm:tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-black"
                  >
                    {showPassword ? <PiEyeSlash className="w-4 h-4" /> : <PiEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {password && (
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1 normal-case sm:uppercase tracking-normal sm:tracking-wider">Current Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border border-rule text-sm text-black outline-none focus:border-[#4A1A45] transition-all"
                  />
                </div>
              )}

              {password && (
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1 normal-case sm:uppercase tracking-normal sm:tracking-wider">Confirm New Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#F7F2F6] border text-sm text-black outline-none transition-all ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-400 focus:border-red-500"
                        : confirmPassword && confirmPassword === password
                        ? "border-[#4A1A45] focus:border-[#4A1A45]"
                        : "border-rule focus:border-[#4A1A45]"
                    }`}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-xs sm:text-[11px] text-red-600 mt-1 font-medium">Passwords do not match.</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || (password.length > 0 && password !== confirmPassword)}
              className="px-5 sm:px-6 py-3 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-50 text-white font-bold text-xs normal-case sm:uppercase tracking-normal sm:tracking-wider flex items-center gap-2 transition-all"
            >
              <PiFloppyDisk className="w-4 h-4" />
              {saving ? "Saving..." : "Save Profile Updates"}
            </button>
          </form>
        </div>
      </main>

      {/* DROP COURSE CONFIRMATION MODAL */}
      {dropModalOpen && activeEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-white rounded-lg p-7 border border-rule space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg bg-red-50 text-red-600">
                <PiWarningCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-black text-lg">Drop Active Course?</h3>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  Are you sure you want to drop <strong>{activeEnrollment.course.title}</strong>?
                </p>
                <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                  This will release your single-course lock so you can immediately register for another course.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-rule">
              <button
                onClick={() => setDropModalOpen(false)}
                disabled={dropLoading}
                className="px-5 py-2.5 rounded-md border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-[#F3EAF2]"
              >
                Cancel
              </button>
              <button
                onClick={handleDropCourse}
                disabled={dropLoading}
                className="px-5 py-2.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <PiTrash className="w-3.5 h-3.5" />
                {dropLoading ? "Dropping..." : "Confirm Drop"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL ELECTRONIC RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-xl bg-white rounded-lg border border-neutral-300 overflow-hidden relative print:border-none print:shadow-none print:w-full print:max-w-none">
            {/* Modal Header */}
            <div className="bg-[#2D0F2A] text-white px-7 py-5 flex justify-between items-center border-b border-[#3B1537] print:hidden">
              <div className="flex items-center gap-2">
                <PiFileText className="w-5 h-5" />
                <span className="font-bold text-sm tracking-wide">E-Receipt</span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-full hover:bg-[#3B1537] text-neutral-400 hover:text-white"
              >
                <PiX className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Printable Canvas */}
            <div className="p-6 sm:p-8 space-y-5 sm:space-y-6 text-black" id="printable-receipt">
              {/* Institutional Header */}
              <div className="text-center border-b-2 border-[#4A1A45] pb-5 space-y-1">
                <div className="flex justify-center mb-2">
                  <AcademiaLogoIcon className="w-11 h-11" />
                </div>
                <div className="inline-block px-3 py-0.5 rounded-md bg-[#4A1A45] text-white text-xs sm:text-[10px] font-bold normal-case sm:uppercase tracking-normal sm:tracking-widest mb-1">
                  Payment Receipt
                </div>
                <h2 className="text-xl font-bold normal-case sm:uppercase tracking-tight">
                  Academia LMS
                </h2>
                <p className="text-xs sm:text-[11px] text-neutral-600 font-medium">
                  Course enrolment payment, processed by Paystack
                </p>
                <div className="text-xs sm:text-[10px] font-mono text-neutral-500 pt-1">
                  Receipt No: REC-{selectedReceipt.reference}
                </div>
              </div>

              {/* Receipt Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-[#F7F2F6] p-4 rounded-lg border border-rule">
                <div>
                  <span className="text-neutral-500 font-semibold block text-xs sm:text-[10px] normal-case sm:uppercase">Student Name</span>
                  <span className="font-bold text-black text-sm">{currentUser.name}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block text-xs sm:text-[10px] normal-case sm:uppercase">Student Email</span>
                  <span className="font-bold text-black">{currentUser.email}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block text-xs sm:text-[10px] normal-case sm:uppercase">Department / Faculty</span>
                  <span className="font-bold text-black">{currentUser.department || "General"} ({currentUser.faculty || "N/A"})</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block text-xs sm:text-[10px] normal-case sm:uppercase">Payment Date &amp; Time</span>
                  <span className="font-bold text-black">{new Date(selectedReceipt.paidAt || selectedReceipt.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="border border-rule rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#F3EAF2] text-neutral-700 font-bold border-b border-rule">
                    <tr>
                      <th className="p-3 text-left">Description</th>
                      <th className="p-3 text-center">Gateway</th>
                      <th className="p-3 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3.5">
                        <span className="font-bold text-black block">{selectedReceipt.course?.title || "Course Tuition"}</span>
                        <span className="text-xs sm:text-[10px] text-neutral-500 font-mono">Ref: {selectedReceipt.reference}</span>
                      </td>
                      <td className="p-3.5 text-center text-neutral-600 font-medium">
                        Paystack ({selectedReceipt.channel || "card"})
                      </td>
                      <td className="p-3.5 text-right font-bold text-sm text-black">
                        {formatNgn(receiptBreakdown ? receiptBreakdown.coursePriceNgn : selectedReceipt.amount)}
                      </td>
                    </tr>
                    {receiptBreakdown && receiptBreakdown.platformFeeNgn > 0 && (
                      <tr className="border-t border-rule">
                        <td className="p-3.5 text-neutral-700">{receiptBreakdown.platformFeeLabel}</td>
                        <td />
                        <td className="p-3.5 text-right font-semibold text-black">{formatNgn(receiptBreakdown.platformFeeNgn)}</td>
                      </tr>
                    )}
                    {receiptBreakdown && receiptBreakdown.processingFeeNgn > 0 && (
                      <tr className="border-t border-rule">
                        <td className="p-3.5 text-neutral-700">Payment processing (Paystack)</td>
                        <td />
                        <td className="p-3.5 text-right font-semibold text-black">{formatNgn(receiptBreakdown.processingFeeNgn)}</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-[#4A1A45] bg-[#F7F2F6] font-bold">
                    <tr>
                      <td colSpan={2} className="p-3.5 normal-case sm:uppercase tracking-normal sm:tracking-wider text-xs">Total Remittance (NGN):</td>
                      <td className="p-3.5 text-right text-base text-black">{formatNgn(selectedReceipt.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Security Seal & Verification Footer */}
              <div className="flex justify-between items-center pt-2 border-t border-rule text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs sm:text-[11px]">
                    <PiCheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>PAYMENT CONFIRMED</span>
                  </div>
                  <p className="text-xs sm:text-[10px] text-neutral-500">
                    Paystack Ref: {selectedReceipt.paystackRef || selectedReceipt.reference}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-[10px] font-bold text-neutral-800">Issued by Academia LMS</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-[#F7F2F6] px-7 py-4 border-t border-rule flex justify-between items-center print:hidden">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-5 py-2.5 rounded-md border border-neutral-300 text-neutral-700 font-bold text-xs hover:bg-[#F3EAF2]"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 sm:px-6 py-2.5 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs normal-case sm:uppercase tracking-normal sm:tracking-wider flex items-center gap-2"
              >
                <PiPrinter className="w-4 h-4" /> Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
