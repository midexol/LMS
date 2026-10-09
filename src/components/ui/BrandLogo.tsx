"use client";

import React from "react";
import Link from "next/link";

export function AcademiaLogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Academia Crest">
      {/* Outer rounded container with FedPoly purple background */}
      <rect width="48" height="48" rx="13" fill="#4A1A45" />
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="12.25" stroke="url(#brand_border_grad)" strokeWidth="1.5" strokeOpacity="0.4" />

      {/* Subtle shield back glow */}
      <path d="M24 7L38 13V23C38 32 31.8 39.2 24 41.5C16.2 39.2 10 32 10 23V13L24 7Z" fill="#3B1537" fillOpacity="0.5" />

      {/* Graduation Cap Mortarboard in crisp white */}
      <path d="M24 10.5L37 16.8L24 23L11 16.8L24 10.5Z" fill="#FFFFFF" />
      
      {/* Skull cap contour */}
      <path d="M15.5 20.2V26.2C15.5 26.2 18 29.5 24 29.5C30 29.5 32.5 26.2 32.5 26.2V20.2L24 24.2L15.5 20.2Z" fill="#3B1537" stroke="#FFFFFF" strokeWidth="0.75" strokeOpacity="0.8" />

      {/* Tassel */}
      <path d="M35 17.5V23.8C35 24.6 34.2 25.2 33.3 25.2" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="33.3" cy="25.8" r="1" fill="#FFFFFF" />

      {/* Open Book Wings */}
      <path d="M16.5 28C19.8 27.2 23 27.6 24 29C25 27.6 28.2 27.2 31.5 28V34C28.2 33.2 25 33.6 24 35C23 33.6 19.8 33.2 16.5 34V28Z" fill="#FFFFFF" />

      {/* Center Crest Embellishment */}
      <circle cx="24" cy="30.8" r="1.5" fill="#4A1A45" />
      <path d="M24 28.5V33.5M21.5 30.8H26.5" stroke="#4A1A45" strokeWidth="0.5" strokeLinecap="round" />

      <defs>
        <linearGradient id="brand_border_grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#896A86" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#3B1537" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface BrandLogoProps {
  href?: string;
  variant?: "dark" | "light"; // dark = dark text for white bg; light = white text for dark/purple bg
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

export function BrandLogo({
  href = "/",
  variant = "dark",
  size = "md",
  showSubtitle = true,
  className = "",
}: BrandLogoProps) {
  const iconSize = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-11 h-11" : "w-9 h-9";
  const titleSize = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-lg";
  const subSize = size === "sm" ? "text-[8.5px]" : size === "lg" ? "text-[11px]" : "text-[9.5px]";

  const content = (
    <div className={`flex items-center gap-2.5 group shrink-0 ${className}`}>
      <div className="shrink-0 transition-transform group-hover:scale-105 duration-200">
        <AcademiaLogoIcon className={iconSize} />
      </div>
      <div className="flex flex-col leading-none select-none">
        <span
          className={`font-black tracking-tight ${titleSize} ${
            variant === "light" ? "text-white" : "text-[#4A1A45]"
          }`}
        >
          ACADEMIA
        </span>
        {showSubtitle && (
          <span className={`font-bold tracking-widest uppercase text-[#896A86] mt-0.5 ${subSize}`}>
            LMS Portal
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
