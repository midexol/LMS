"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FiBookOpen, FiMail, FiLock, FiLogIn, FiAlertCircle, FiEye, FiEyeOff, FiCheck, FiArrowRight } from "react-icons/fi";

import { PrivyAuthButton } from "@/components/auth/PrivyAuthButton";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      if (data.user.role === "TUTOR") {
        window.location.href = "/instructor";
      } else if (data.user.role === "ADMIN") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/my-courses";
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel — Solid Jet Black Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-black text-white p-12 relative overflow-hidden">
        <BrandLogo href="/" variant="light" size="lg" />

        <div className="relative space-y-6 max-w-md">
          <h2 className="font-bold text-4xl leading-tight">
            Welcome back to your academic portal.
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Resume your coursework, submit AI-evaluated assignments, and review instructor feedback in real time.
          </p>
          <div className="space-y-3 pt-2">
            {[
              "Single active enrollment to keep you focused",
              "Instant rubric evaluation powered by Gemini AI",
              "Verified academic transcripts and grade overrides",
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

        <div className="w-full max-w-sm space-y-7 bg-white p-8 rounded-3xl border border-neutral-200 shadow-sm">
          <div>
            <h1 className="font-bold text-2xl text-black">Sign in</h1>
            <p className="text-xs text-neutral-500 mt-1">Enter your account credentials to access your portal.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-200">
              <FiAlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          {/* 1-Click Fast Login via Privy */}
          <PrivyAuthButton label="Continue with Google, Email or Web3" />

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-neutral-200 w-full"></div>
            <span className="bg-white px-3 text-[10px] uppercase tracking-wider font-bold text-neutral-400 shrink-0">
              or institutional credentials
            </span>
            <div className="border-t border-neutral-200 w-full"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-[11px] font-semibold text-[#784D28] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all placeholder:text-neutral-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-3 text-neutral-400 hover:text-black"
                  tabIndex={-1}
                >
                  {showPw ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 mt-2"
            >
              <FiLogIn className="w-4 h-4" />
              {loading ? "Signing in..." : "Sign In to Account"}
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-200 text-center">
            <p className="text-xs text-neutral-600">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#784D28] font-bold hover:underline">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
