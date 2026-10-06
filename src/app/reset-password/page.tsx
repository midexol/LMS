"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FiLock, FiAlertCircle, FiCheck, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <FiAlertCircle className="w-4 h-4" />
            Missing Reset Token
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            No password reset token was detected in your link. Please request a new recovery link.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          Request Reset Link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h1 className="font-extrabold text-2xl tracking-tight text-black">
          Set New Password
        </h1>
        <p className="text-neutral-500 text-xs mt-1">
          Choose a secure password for your ACADEMIA LMS account.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-200">
          <FiAlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-red-700">{error}</p>
        </div>
      )}

      {success ? (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <FiCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-black">Password Successfully Updated</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Your account password has been updated securely. You can now use your new credentials to sign in.
            </p>
          </div>

          <Link
            href="/login"
            className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            Sign In to Account <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                required
                placeholder="At least 6 characters"
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

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
              <input
                type={showPw ? "text" : "password"}
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all placeholder:text-neutral-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 mt-2"
          >
            <FiCheck className="w-4 h-4" />
            {loading ? "Updating Password..." : "Save New Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Brand Sidebar */}
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
            Security & Credential Update.
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Ensure your password is at least 6 characters and unique to your academic portal account.
          </p>
        </div>

        <div className="relative text-xs text-neutral-500">
          © {new Date().getFullYear()} ACADEMIA Learning Management System.
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <Suspense fallback={<div className="text-xs text-neutral-400">Loading recovery form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
