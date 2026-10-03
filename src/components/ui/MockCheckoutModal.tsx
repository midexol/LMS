"use client";

import React, { useState } from "react";
import { FiX, FiCreditCard, FiLock, FiAlertCircle, FiCheck, FiArrowRight, FiLogIn, FiUserPlus } from "react-icons/fi";
import Link from "next/link";

interface MockCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  course: {
    id: string;
    title: string;
    price: number;
    description: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePayAndEnroll = async () => {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Enrollment failed.");
      }

      setSuccess(true);
      setTimeout(() => {
        onEnrollSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-3xl p-7 shadow-2xl border border-neutral-200 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full border border-neutral-200 text-neutral-500 hover:text-black hover:border-black transition-all"
        >
          <FiX className="w-4 h-4" />
        </button>

        <h3 className="text-xl font-bold text-black mb-1 flex items-center gap-2">
          <FiCreditCard className="w-5 h-5 text-black" />
          Course Registration &amp; Checkout
        </h3>
        <p className="text-xs text-neutral-500 mb-6">Review course details and registration status.</p>

        {/* Course Card Summary */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 mb-6 space-y-1">
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-black text-sm">{course.title}</h4>
            <span className="text-base font-bold text-black">${course.price.toFixed(2)}</span>
          </div>
          <p className="text-xs text-neutral-500 line-clamp-2">{course.description}</p>
        </div>

        {/* UNAUTHENTICATED USER CHECK */}
        {!currentUser ? (
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-4">
            <div className="flex items-start gap-3">
              <FiLock className="w-5 h-5 text-black shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-black text-sm">Account Required</h4>
                <p className="text-xs text-neutral-600 leading-relaxed mt-1">
                  You must sign in or create a student account before registering or paying for a course.
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
        ) : activeEnrollment ? (
          /* Single Active Course Restriction */
          <div className="p-5 rounded-2xl bg-neutral-100 border border-neutral-300 shadow-sm mb-6 space-y-3">
            <div className="flex gap-3 items-start">
              <FiLock className="w-5 h-5 text-[#784D28] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-black text-sm">Single Active Enrollment Constraint</h4>
                <p className="text-xs text-neutral-700 leading-relaxed mt-1">
                  You are currently registered in <strong>{activeEnrollment.courseTitle}</strong>. Platform policy strictly permits enrollment in only one course at a time.
                </p>
                <p className="text-xs text-neutral-600 font-medium mt-2">
                  Complete your active course assignments before enrolling in a new course.
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
          /* Authenticated Payment Form */
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Student Account</label>
                <input
                  type="text"
                  readOnly
                  value={`${currentUser.name} (${currentUser.email})`}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Simulated Card Details</label>
                <input
                  type="text"
                  readOnly
                  value="4242 •••• •••• 4242"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-black font-bold outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-2">
                <FiAlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="p-4 rounded-2xl bg-neutral-100 text-black text-sm font-bold border border-neutral-300 flex items-center justify-center gap-2">
                <FiCheck className="w-5 h-5 text-black" />
                Registration Confirmed! Enrolling in Course...
              </div>
            ) : (
              <button
                onClick={handlePayAndEnroll}
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  "Processing Payment..."
                ) : (
                  <>
                    <FiLock className="w-4 h-4" />
                    Pay ${course.price.toFixed(2)} and Enroll
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
