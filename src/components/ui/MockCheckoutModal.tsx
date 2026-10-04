"use client";

import React, { useState } from "react";
import {
  FiX,
  FiCreditCard,
  FiLock,
  FiAlertCircle,
  FiCheck,
  FiArrowRight,
  FiLogIn,
  FiUserPlus,
  FiShield,
  FiExternalLink,
} from "react-icons/fi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNgn } from "@/lib/utils";

interface MockCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  course: {
    id: string;
    title: string;
    price: number;
    description: string;
    department?: string | null;
    faculty?: string | null;
  };
  activeEnrollment: {
    id: string;
    courseId: string;
    courseTitle: string;
  } | null;
  onEnrollSuccess: () => void;
}

export function MockCheckoutModal({
  isOpen,
  onClose,
  currentUser,
  course,
  activeEnrollment,
  onEnrollSuccess,
}: MockCheckoutModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [statusText, setStatusText] = useState<string>("Pay with Paystack");

  if (!isOpen) return null;

  const formattedNgn = formatNgn(course.price);


  const handlePaystackCheckout = async () => {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError(null);
    setStatusText("Connecting to Paystack...");

    try {
      // 1. Initialize payment via Paystack backend
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Payment initialization failed.");
      }

      setStatusText("Redirecting to Paystack Gateway...");

      // 2. If authorizationUrl is provided, redirect to Paystack or callback
      if (data.authorizationUrl) {
        // Redirect to Paystack or verification callback
        window.location.href = data.authorizationUrl;
        return;
      }

      // 3. Fallback verification
      setStatusText("Finalizing Course Enrollment...");
      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: data.reference,
          isSimulation: data.isSimulation,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Verification failed.");
      }

      setSuccess(true);
      setTimeout(() => {
        onEnrollSuccess();
        onClose();
        router.push(`/student/courses/${course.id}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Payment processing error.");
      setLoading(false);
      setStatusText("Pay with Paystack");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-neutral-200 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full border border-neutral-200 text-neutral-500 hover:text-black hover:border-black transition-all"
        >
          <FiX className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm font-bold">
            <FiCreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-black leading-tight">
              Course Checkout
            </h3>
            <p className="text-[11px] text-neutral-500">
              Integrated with University Payment Portal &amp; Paystack
            </p>
          </div>
        </div>

        {/* Course Card Summary */}
        <div className="mt-5 p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#784D28] bg-[#784D28]/10 px-2 py-0.5 rounded-full border border-[#784D28]/20">
                {course.department || course.faculty || "Course"}
              </span>
              <h4 className="font-bold text-black text-sm mt-1">{course.title}</h4>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-black block leading-none">
                {formattedNgn}
              </span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 line-clamp-2">{course.description}</p>
        </div>

        {/* UNAUTHENTICATED USER CHECK */}
        {!currentUser ? (
          <div className="mt-5 p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
            <div className="flex items-start gap-3">
              <FiLock className="w-5 h-5 text-black shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-black text-sm">Account Required</h4>
                <p className="text-xs text-neutral-600 leading-relaxed mt-1">
                  You must sign in or register a student account before paying for course enrollment.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/login"
                className="flex-1 py-2.5 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all shadow-sm"
              >
                <FiLogIn className="w-4 h-4" /> Sign In
              </Link>
              <Link
                href="/signup"
                className="flex-1 py-2.5 rounded-full bg-white border border-neutral-300 text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-100 transition-all shadow-sm"
              >
                <FiUserPlus className="w-4 h-4" /> Sign Up Free
              </Link>
            </div>
          </div>
        ) : activeEnrollment && activeEnrollment.courseId !== course.id ? (
          /* Single Active Course Restriction */
          <div className="mt-5 p-5 rounded-2xl bg-neutral-100 border border-neutral-300 shadow-sm space-y-3">
            <div className="flex gap-3 items-start">
              <FiLock className="w-5 h-5 text-[#784D28] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-black text-sm">Single Active Enrollment Constraint</h4>
                <p className="text-xs text-neutral-700 leading-relaxed mt-1">
                  You are currently registered in <strong>{activeEnrollment.courseTitle}</strong>. Platform policy strictly permits enrollment in only one active course at a time.
                </p>
                <p className="text-xs text-neutral-600 font-medium mt-2">
                  Complete your active course assignments and final assessment before enrolling in another course.
                </p>
                <div className="mt-4">
                  <Link
                    href={`/student/courses/${activeEnrollment.courseId}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-black hover:bg-neutral-800 shadow-sm transition-all"
                  >
                    Go to Active Course <FiArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Paystack Payment Form */
          <div className="mt-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-neutral-600">
                <span>Payer Account:</span>
                <span className="font-bold text-black">{currentUser.name} ({currentUser.email})</span>
              </div>
              {currentUser.department && (
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Department:</span>
                  <span className="font-semibold text-black">{currentUser.department}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-neutral-600 border-t border-neutral-200/60 pt-2">
                <span>Payment Channels:</span>
                <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                  Mastercard, Visa, Verve &amp; Transfer
                </span>
              </div>
            </div>

            {/* Paystack Security Notice */}
            <div className="flex items-center gap-2 px-2 text-[11px] text-neutral-500">
              <FiShield className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
              <span>
                Processed securely through <strong>Paystack</strong> with 256-bit encryption.
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-900 text-sm font-bold border border-emerald-200 flex items-center justify-center gap-2">
                <FiCheck className="w-5 h-5 text-emerald-600" />
                Payment Confirmed! Enrolling in Course...
              </div>
            ) : (
              <button
                onClick={handlePaystackCheckout}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-pulse">{statusText}</span>
                ) : (
                  <>
                    <FiLock className="w-4 h-4" />
                    Pay {formattedNgn} &amp; Enroll
                    <FiExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
