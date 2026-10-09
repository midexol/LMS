"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiCheckCircle, FiAlertCircle, FiLoader, FiArrowRight, FiBookOpen } from "react-icons/fi";

function PaymentVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const mode = searchParams.get("mode");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [courseInfo, setCourseInfo] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!reference) {
      setError("No transaction reference provided in callback URL.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await fetch(`/api/payment/verify?reference=${encodeURIComponent(reference!)}${mode ? `&mode=${mode}` : ""}`);
        const data = await res.json();

        if (res.status === 409 && data.code === "SINGLE_COURSE_CONFLICT") {
          if (isMounted) {
            setConflict(true);
            setError(data.error);
            setLoading(false);
          }
          return;
        }
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Unable to confirm payment status.");
        }

        if (isMounted) {
          setCourseInfo({ id: data.courseId, title: data.courseTitle });
          setLoading(false);
          // Auto-redirect to the course player after 2.5 seconds
          setTimeout(() => {
            router.push(`/student/courses/${data.courseId}`);
          }, 2500);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Payment verification failed.");
          setLoading(false);
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [reference, mode, router]);

  return (
    <div className="min-h-screen bg-[#1E0A1C] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md bg-[#2D0F2A] border border-[#3B1537] rounded-3xl p-8 shadow-2xl text-center">
        {loading ? (
          <div className="py-10 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#3B1537] border border-[#4A1A45]/40 mx-auto flex items-center justify-center animate-spin">
              <FiLoader className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Verifying Payment</h2>
            <p className="text-xs text-neutral-400">
              Communicating with Paystack to confirm your course enrollment...
            </p>
            <div className="text-[11px] font-mono text-neutral-500 pt-2">
              Ref: {reference || "..."}
            </div>
          </div>
        ) : error ? (
          <div className="py-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-950/60 border border-red-800 mx-auto flex items-center justify-center text-red-500">
              <FiAlertCircle className="w-8 h-8" />
            </div>
            {conflict && (
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-950 text-amber-300 border border-amber-800">
                Payment Received
              </span>
            )}
            <h2 className="text-xl font-bold text-white tracking-tight">
              {conflict ? "Enrollment On Hold" : "Payment Verification Failed"}
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed px-4">
              {error}
            </p>
            {conflict && (
              <p className="text-[11px] font-mono text-neutral-500">Keep this reference for support: {reference}</p>
            )}
            <div className="pt-4 flex flex-col gap-3">
              <Link
                href="/courses"
                className="w-full py-3 px-6 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 border border-white/20"
              >
                Browse Course Catalog
              </Link>
              <Link
                href="/my-courses"
                className="w-full py-3 px-6 rounded-full bg-[#1E0A1C] text-neutral-300 font-bold text-xs hover:bg-[#3B1537] transition-all"
              >
                Go to My Courses
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-700 mx-auto flex items-center justify-center text-emerald-400 animate-bounce">
              <FiCheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                Payment Confirmed
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight pt-2">
                Enrollment Activated!
              </h2>
              <p className="text-xs text-neutral-400 px-4">
                You now have full access to <span className="text-white font-bold">{courseInfo?.title}</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#1E0A1C] border border-[#3B1537] text-left space-y-1.5">
              <div className="text-[11px] text-neutral-500 flex justify-between">
                <span>Transaction Ref</span>
                <span className="font-mono text-neutral-300">{reference}</span>
              </div>
              <div className="text-[11px] text-neutral-500 flex justify-between">
                <span>Payment Platform</span>
                <span className="font-semibold text-neutral-300">Paystack Gateway</span>
              </div>
              <div className="text-[11px] text-neutral-500 flex justify-between">
                <span>Access Status</span>
                <span className="text-emerald-400 font-semibold">Active &amp; Unlocked</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/student/courses/${courseInfo?.id}`}
                className="w-full py-3.5 px-6 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg border border-white/20"
              >
                <FiBookOpen className="w-4 h-4" /> Start Learning Now <FiArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-[10px] text-neutral-500 mt-2">
                Redirecting automatically in a moment...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
          <div className="animate-spin">
            <FiLoader className="w-8 h-8" />
          </div>
        </div>
      }
    >
      <PaymentVerifyContent />
    </Suspense>
  );
}
