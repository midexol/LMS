"use client";

import React, { useState } from "react";
import { FiArrowRight, FiLock } from "react-icons/fi";
import { MockCheckoutModal } from "@/components/ui/MockCheckoutModal";

interface CourseEnrollmentActionProps {
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
}

export function CourseEnrollmentAction({
  currentUser,
  course,
  activeEnrollment,
}: CourseEnrollmentActionProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Rate multiplier (fallback 1500 NGN per USD)
  const exchangeRate = 1500;
  const amountNgn = Math.round(course.price * exchangeRate);
  const formattedNgn = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amountNgn);

  return (
    <>
      <button
        onClick={() => setCheckoutOpen(true)}
        className="w-full py-3.5 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
      >
        <FiLock className="w-4 h-4" /> Enroll with Paystack · {formattedNgn}
      </button>

      <MockCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        currentUser={currentUser}
        course={course}
        activeEnrollment={activeEnrollment}
        onEnrollSuccess={() => {
          window.location.href = `/student/courses/${course.id}`;
        }}
      />
    </>
  );
}
