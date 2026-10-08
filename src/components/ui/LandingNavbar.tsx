"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { RiMenu4Line, RiCloseLine } from "react-icons/ri";
import { BrandLogo } from "./BrandLogo";

export function BbLogo({ className = "h-8 w-auto", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 60 42" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Blackboard Logo">
      <line x1="6" y1="8" x2="22" y2="8" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path
        d="M 12 9 C 13 16 11 26 12 30 M 12 10 C 18 9 26 11 25 17 C 24 21 19 21.5 13 21.5 C 19 21.5 28 22 27 28 C 26 31 20 31.5 12 30"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 33 28 C 30 25 31 16 34 8 C 36 5 38 6 36 12 C 34 19 32 26 33 30 C 35 31 43 31 44 24 C 45 18 39 18 34 20"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="6" y1="36" x2="48" y2="36" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

interface LandingNavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN";
  } | null;
}

export function LandingNavbar({ currentUser }: LandingNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <header
      id="site-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out flex justify-center px-4 ${
        scrolled ? "py-2.5" : "py-3.5 sm:py-4"
      }`}
    >
      <div
        style={{ backgroundColor: "rgba(10, 10, 10, 0.94)" }}
        className={`transition-all duration-300 ease-out flex items-center justify-between gap-4 py-2 px-4 sm:px-6 rounded-full relative border border-neutral-800 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl text-white ${
          scrolled ? "w-full max-w-xl" : "w-full max-w-2xl"
        }`}
      >
        {/* Brand Logo & Name */}
        <BrandLogo href="/" variant="light" size="sm" />

        {/* Center: Just Courses */}
        <nav className="hidden sm:flex items-center" aria-label="Main Navigation">
          <Link
            href="/courses"
            className="text-[13px] font-sans px-3.5 py-1.5 rounded-full transition-all duration-200 text-neutral-300 hover:text-white hover:bg-white/[0.08]"
          >
            Courses
          </Link>
        </nav>

        {/* Right: Sign In / Sign Up or Dashboard */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {currentUser ? (
            <>
              <Link
                href="/my-courses"
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold transition-all bg-white hover:bg-neutral-200 text-black shadow-md hover:-translate-y-0.5 active:translate-y-0 shrink-0 whitespace-nowrap"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-neutral-400 hover:text-white text-xs font-medium px-2 py-1 transition-colors whitespace-nowrap hidden sm:inline-block"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-neutral-300 hover:text-white text-xs font-semibold px-3 py-1.5 transition-colors whitespace-nowrap hidden sm:inline-block"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold transition-all bg-white hover:bg-neutral-200 text-black shadow-md hover:-translate-y-0.5 active:translate-y-0 shrink-0 whitespace-nowrap"
              >
                Sign Up
              </Link>
            </>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <RiCloseLine className="w-5 h-5" /> : <RiMenu4Line className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{ backgroundColor: "rgba(10, 10, 10, 0.96)" }}
          className="sm:hidden fixed inset-x-4 top-16 z-50 backdrop-blur-2xl border border-neutral-800 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 text-white"
        >
          <Link
            href="/courses"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-200 hover:text-white text-center text-xs font-semibold"
          >
            Browse Courses
          </Link>

          <div className="pt-2 border-t border-neutral-800 flex flex-col gap-2">
            {currentUser ? (
              <>
                <Link
                  href="/my-courses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs text-center shadow-sm"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full py-2 rounded-xl bg-white/[0.04] text-neutral-400 hover:text-white font-medium text-xs text-center"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs text-center shadow-sm"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2 rounded-xl bg-white/[0.04] text-neutral-300 hover:text-white font-semibold text-xs text-center"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
