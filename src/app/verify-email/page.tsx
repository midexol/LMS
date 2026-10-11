"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FiCheckCircle, FiAlertCircle, FiLoader, FiMail, FiArrowRight } from "react-icons/fi";
import { BrandLogo } from "@/components/ui/BrandLogo";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState<string>("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token was provided in the URL.");
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!isMounted) return;

        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to verify email. The token may be expired or invalid.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        setMessage(err.message || "A network error occurred while verifying your email.");
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendLoading(true);
    setResendFeedback(null);

    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail.trim() }),
      });

      const data = await res.json();
      setResendFeedback(data.message || "If an account matches, a new verification link was dispatched.");
    } catch {
      setResendFeedback("Could not send verification email. Please try again later.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <div className="max-w-md mx-auto w-full flex justify-center py-6">
        <BrandLogo href="/" variant="dark" size="md" />
      </div>

      {/* Main Card */}
      <div className="max-w-md mx-auto w-full bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-8 sm:p-10 space-y-6">
        {status === "loading" && (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-purple-50 text-[#4A1A45] flex items-center justify-center mx-auto animate-spin">
              <FiLoader className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-neutral-900">Verifying Your Email</h2>
              <p className="text-xs text-neutral-500">Please wait a moment while we validate your credentials...</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <FiCheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Account Activated
              </span>
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Email Verified!</h2>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-sm mx-auto">
                {message} We&apos;ve also sent a welcome email to your inbox.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-left text-xs text-neutral-600 space-y-1">
              <p className="font-bold text-neutral-900">Next Steps:</p>
              <p>• Explore approved faculty and departmental courses.</p>
              <p>• Submit assignments to receive immediate automated rubric feedback.</p>
            </div>

            <Link
              href="/my-courses"
              className="w-full py-3.5 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              Continue to My Courses <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                <FiAlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-neutral-900">Verification Link Issue</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {message}
              </p>
            </div>

            <div className="border-t border-neutral-100 pt-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-neutral-900">Need a new verification link?</h3>
                <p className="text-[11px] text-neutral-500">
                  Enter your email address and we&apos;ll send you a fresh link.
                </p>
              </div>

              {resendFeedback && (
                <div className="p-3 rounded-xl bg-purple-50 text-[#4A1A45] text-xs font-medium border border-purple-100">
                  {resendFeedback}
                </div>
              )}

              <form onSubmit={handleResend} className="space-y-3">
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#4A1A45]/20 focus:border-[#4A1A45]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full py-2.5 rounded-xl bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {resendLoading ? <FiLoader className="w-4 h-4 animate-spin" /> : "Send New Link"}
                </button>
              </form>
            </div>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs font-semibold text-neutral-500 hover:text-neutral-900">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[11px] text-neutral-400">
        &copy; {new Date().getFullYear()} ACADEMIA LMS. All rights reserved.
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <FiLoader className="w-8 h-8 animate-spin text-[#4A1A45]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
