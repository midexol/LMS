"use client";

import React, { useState } from "react";
import { PiLock } from "react-icons/pi";
import { MockCheckoutModal } from "@/components/ui/MockCheckoutModal";
import { formatNgn } from "@/lib/utils";

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
  const formattedNgn = formatNgn(course.price);


  return (
    <>
      <button
        onClick={() => setCheckoutOpen(true)}
        className="w-full py-3.5 px-5 sm:px-6 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs normal-case sm:uppercase tracking-normal sm:tracking-wider flex items-center justify-center gap-2 transition-all"
      >
        <PiLock className="w-4 h-4" />{" "}
        {course.price <= 0 ? "Enroll for free" : <>Enroll with Paystack · {formattedNgn}</>}
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
