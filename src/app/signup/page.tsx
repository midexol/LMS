"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FiBookOpen, FiUser, FiMail, FiLock, FiUserPlus,
  FiAlertCircle, FiEye, FiEyeOff, FiCheck,
} from "react-icons/fi";

import { ACADEMIC_STRUCTURE, getDepartmentsForFaculty } from "@/lib/academicStructure";
import { PrivyAuthButton } from "@/components/auth/PrivyAuthButton";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"STUDENT" | "TUTOR">("STUDENT");
  const [faculty, setFaculty] = useState(ACADEMIC_STRUCTURE[0].name);
  const [department, setDepartment] = useState(ACADEMIC_STRUCTURE[0].departments[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwMatch = confirmPassword.length > 0 && password === confirmPassword;
  const pwMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleFacultyChange = (newFac: string) => {
    setFaculty(newFac);
    const depts = getDepartmentsForFaculty(newFac);
    setDepartment(depts[0] || "");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          faculty,
          department,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed.");

      window.location.href = role === "TUTOR" ? "/instructor" : "/my-courses";
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — Solid Jet Black Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-black text-white p-12 relative overflow-hidden">
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-black font-bold text-lg">
            A
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white block leading-none">
              ACADEMIA
            </span>
            <span className="text-[10px] font-semibold tracking-widest text-[#D4A373] uppercase">
              LMS Platform
            </span>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h2 className="font-bold text-4xl leading-tight">
            Begin your learning journey today.
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Join thousands of active students and instructors advancing their knowledge through structured coursework and AI assignment reviews.
          </p>
          <div className="space-y-3 pt-2">
            {[
              "Free account registration in seconds",
              "Structured university-grade curriculum",
              "Instant feedback on every assignment submission",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 text-xs text-neutral-300">
                <div className="w-5 h-5 rounded-full bg-[#784D28] flex items-center justify-center shrink-0">
                  <FiCheck className="w-3 h-3 text-white" />
                </div>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-neutral-500 text-xs">&copy; {new Date().getFullYear()} Academia LMS. All rights reserved.</p>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white">
            <span className="font-bold text-xl text-white">A</span>
          </div>
          <span className="font-bold text-xl text-black">Academia LMS</span>
        </div>

        <div className="w-full max-w-sm space-y-6 bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
          <div>
            <h1 className="font-bold text-2xl text-black">Create an account</h1>
            <p className="text-xs text-neutral-500 mt-1">Select your role and start your academic journey.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-200">
              <FiAlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          {/* 1-Click Signup via Privy */}
          <PrivyAuthButton label="1-Click Sign Up with Google / Web3" />

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-neutral-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] uppercase tracking-wider font-bold text-neutral-400 shrink-0">
              or standard registration
            </span>
            <div className="border-t border-neutral-200 w-full"></div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-neutral-400 hover:text-black"
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-50 border text-sm text-black outline-none transition-all placeholder:text-neutral-400 ${
                    pwMismatch
                      ? "border-red-400 focus:border-red-500"
                      : pwMatch
                      ? "border-black focus:border-black"
                      : "border-neutral-200 focus:border-black"
                  }`}
                />
                {pwMatch && (
                  <div className="absolute right-3.5 top-3 text-black">
                    <FiCheck className="w-4 h-4" />
                  </div>
                )}
              </div>
              {pwMismatch && (
                <p className="text-[11px] text-red-600 mt-1 font-semibold">Passwords do not match.</p>
              )}
            </div>

            {/* School / Faculty */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                Faculty / School *
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

            {/* Department */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                Department *
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
              <p className="text-[10px] text-neutral-400">
                You will exclusively see courses designated for this department.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword) || !name || !email || !password}
              className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all mt-2"
            >
              <FiUserPlus className="w-4 h-4" />
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="pt-3 border-t border-neutral-200 text-center">
            <p className="text-xs text-neutral-600">
              Already have an account?{" "}
              <Link href="/login" className="text-[#784D28] font-bold hover:underline">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
