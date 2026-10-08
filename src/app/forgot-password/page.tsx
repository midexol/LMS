"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FiMail, FiArrowLeft, FiAlertCircle, FiCheck, FiSend } from "react-icons/fi";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send password reset email.");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Brand Sidebar */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-black text-white p-12 relative overflow-hidden">
        <BrandLogo href="/" variant="light" size="lg" />

        <div className="relative space-y-6 max-w-md">
          <h2 className="font-bold text-4xl leading-tight">
            Account Recovery & Security.
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Enter your registered institutional email to receive a cryptographically signed recovery token valid for 60 minutes.
          </p>
        </div>

        <div className="relative text-xs text-neutral-500">
          © {new Date().getFullYear()} ACADEMIA Learning Management System.
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-black transition-colors mb-6"
            >
              <FiArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
            <h1 className="font-extrabold text-2xl tracking-tight text-black">
              Forgot Your Password?
            </h1>
            <p className="text-neutral-500 text-xs mt-1">
              Enter your email address and we will dispatch instructions to reset your password.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-50 border border-red-200">
              <FiAlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-red-700">{error}</p>
            </div>
          )}

          {submitted ? (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#faf6f0] border border-[#ecdac8] space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#784D28] text-white flex items-center justify-center">
                  <FiCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-black">Reset Link Dispatched</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  If an account exists for <strong className="text-black">{email}</strong>, we have sent password reset instructions to your inbox.
                </p>
                <p className="text-[11px] text-neutral-500">
                  Please check your spam or promotions folder if the email does not arrive within 2 minutes. The link expires in 1 hour.
                </p>
              </div>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                  Registered Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-3 text-neutral-400 w-4 h-4 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-black transition-all placeholder:text-neutral-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                <FiSend className="w-4 h-4" />
                {loading ? "Sending Instructions..." : "Send Reset Link"}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-neutral-200 text-center">
            <p className="text-xs text-neutral-600">
              Remember your password?{" "}
              <Link href="/login" className="text-[#784D28] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
