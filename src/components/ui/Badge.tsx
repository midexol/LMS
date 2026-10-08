import React from "react";
import { FiCheckCircle, FiClock, FiLock, FiAward } from "react-icons/fi";

interface BadgeProps {
  type: "ACTIVE" | "COMPLETED" | "GRADED" | "PENDING" | "LOCKED";
  text?: string;
}

export function Badge({ type, text }: BadgeProps) {
  switch (type) {
    case "ACTIVE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#784D28]/10 text-[#784D28] border border-[#784D28]/30 shadow-sm">
          <FiClock className="w-3.5 h-3.5 text-[#784D28]" />
          {text || "Active Course"}
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black text-white border border-black shadow-sm">
          <FiCheckCircle className="w-3.5 h-3.5 text-white" />
          {text || "Completed"}
        </span>
      );
    case "GRADED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-900 text-white border border-black shadow-sm">
          <FiAward className="w-3.5 h-3.5 text-white" />
          {text || "Evaluated"}
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300 shadow-sm">
          <FiClock className="w-3.5 h-3.5 text-neutral-600" />
          {text || "Pending Grade"}
        </span>
      );
    case "LOCKED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200 shadow-sm">
          <FiLock className="w-3.5 h-3.5 text-neutral-400" />
          {text || "Course Locked"}
        </span>
      );
  }
}
