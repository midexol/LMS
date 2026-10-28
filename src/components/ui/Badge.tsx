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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#4A1A45]/10 text-[#4A1A45] border border-[#4A1A45]/30">
          <FiClock className="w-3.5 h-3.5 text-[#4A1A45]" />
          {text || "Active Course"}
        </span>
      );
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#4A1A45] text-white border border-[#4A1A45]">
          <FiCheckCircle className="w-3.5 h-3.5 text-white" />
          {text || "Completed"}
        </span>
      );
    case "GRADED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-[#2D0F2A] text-white border border-[#4A1A45]/40">
          <FiAward className="w-3.5 h-3.5 text-white" />
          {text || "Evaluated"}
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-300">
          <FiClock className="w-3.5 h-3.5 text-neutral-600" />
          {text || "Pending Grade"}
        </span>
      );
    case "LOCKED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
          <FiLock className="w-3.5 h-3.5 text-neutral-400" />
          {text || "Course Locked"}
        </span>
      );
  }
}
