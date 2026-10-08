"use client";

import React from "react";
import Link from "next/link";

export function AcademiaLogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Academia Crest">
      {/* Outer rounded container with hairline gold border */}
      <rect width="48" height="48" rx="13" fill="#0B0F17" />
      <rect x="0.75" y="0.75" width="46.5" height="46.5" rx="12.25" stroke="url(#brand_border_grad)" strokeWidth="1.5" strokeOpacity="0.4" />

      {/* Subtle shield back glow */}
      <path d="M24 7L38 13V23C38 32 31.8 39.2 24 41.5C16.2 39.2 10 32 10 23V13L24 7Z" fill="url(#brand_shield_glow)" fillOpacity="0.14" />

      {/* Graduation Cap Mortarboard */}
      <path d="M24 10.5L37 16.8L24 23L11 16.8L24 10.5Z" fill="url(#brand_gold_grad)" />
      
      {/* Skull cap contour */}
      <path d="M15.5 20.2V26.2C15.5 26.2 18 29.5 24 29.5C30 29.5 32.5 26.2 32.5 26.2V20.2L24 24.2L15.5 20.2Z" fill="#141923" stroke="#D4A373" strokeWidth="0.75" strokeOpacity="0.6" />

      {/* Gold Tassel */}
      <path d="M35 17.5V23.8C35 24.6 34.2 25.2 33.3 25.2" stroke="#F3E5D0" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="33.3" cy="25.8" r="1" fill="#F3E5D0" />

      {/* Open Book Wings */}
      <path d="M16.5 28C19.8 27.2 23 27.6 24 29C25 27.6 28.2 27.2 31.5 28V34C28.2 33.2 25 33.6 24 35C23 33.6 19.8 33.2 16.5 34V28Z" fill="#FFFFFF" />

      {/* Center AI Intelligence Core */}
      <circle cx="24" cy="30.8" r="1.5" fill="#D4A373" />
      <path d="M24 28.5V33.5M21.5 30.8H26.5" stroke="#784D28" strokeWidth="0.5" strokeLinecap="round" />

      <defs>
        <linearGradient id="brand_border_grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E6BE8A" />
          <stop offset="0.5" stopColor="#784D28" />
          <stop offset="1" stopColor="#0B0F17" />
        </linearGradient>
        <linearGradient id="brand_shield_glow" x1="24" y1="7" x2="24" y2="41.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D4A373" />
          <stop offset="1" stopColor="#0B0F17" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="brand_gold_grad" x1="11" y1="10.5" x2="37" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F5E8D7" />
          <stop offset="0.3" stopColor="#D4A373" />
          <stop offset="0.8" stopColor="#B8824C" />
          <stop offset="1" stopColor="#784D28" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface BrandLogoProps {
  href?: string;
  variant?: "dark" | "light"; // dark = dark text for white bg; light = white text for black bg
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
            variant === "light" ? "text-white" : "text-black"
          }`}
        >
          ACADEMIA
        </span>
        {showSubtitle && (
          <span className={`font-bold tracking-widest uppercase text-[#B8824C] mt-0.5 ${subSize}`}>
            LMS Platform
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
