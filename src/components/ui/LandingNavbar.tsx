"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RiMenu4Line, RiCloseLine } from "react-icons/ri";
import { BrandLogo } from "./BrandLogo";

interface LandingNavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN" | string;
  } | null;
}

export function LandingNavbar({ currentUser }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <header
      id="site-header"
      className="sticky top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 transition-all duration-200"
    >
      <div className="max-w-7xl mx-auto px-6 h-18 py-3.5 flex items-center justify-between gap-6">
        {/* Left: Clickable Uniform Brand Logo */}
        <div className="flex items-center gap-8">
          <BrandLogo href="/" variant="dark" size="sm" />

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
            <Link
              href="/courses"
              className="text-xs font-semibold px-3 py-1.5 rounded-full text-neutral-600 hover:text-[#4A1A45] hover:bg-[#F7F2F6] transition-colors"
            >
              Courses
            </Link>
            <a
              href="#how-it-works"
              className="text-xs font-semibold px-3 py-1.5 rounded-full text-neutral-600 hover:text-[#4A1A45] hover:bg-[#F7F2F6] transition-colors"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="text-xs font-semibold px-3 py-1.5 rounded-full text-neutral-600 hover:text-[#4A1A45] hover:bg-[#F7F2F6] transition-colors"
            >
              FAQ
            </a>
          </nav>
        </div>

        {/* Right: Auth Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link
                href="/my-courses"
                className="px-4 py-2 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white text-xs font-semibold transition-all shadow-sm"
              >
                My Learning
              </Link>
              <button
                onClick={handleLogout}
                className="text-neutral-500 hover:text-[#4A1A45] text-xs font-semibold px-3 py-2 transition-colors hidden sm:inline-block"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-semibold px-3.5 py-2 text-neutral-700 hover:text-[#4A1A45] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white text-xs font-semibold transition-all shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <RiCloseLine className="w-5 h-5" /> : <RiMenu4Line className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200 px-6 py-4 space-y-3">
          <Link
            href="/courses"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-semibold text-neutral-700 hover:text-[#4A1A45] py-1.5"
          >
            Courses
          </Link>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-semibold text-neutral-700 hover:text-[#4A1A45] py-1.5"
          >
            How it works
          </a>
          <a
            href="#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-semibold text-neutral-700 hover:text-[#4A1A45] py-1.5"
          >
            FAQ
          </a>
          <div className="pt-3 border-t border-neutral-100 flex flex-col gap-2">
            {currentUser ? (
              <>
                <Link
                  href="/my-courses"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#4A1A45] text-white text-xs font-semibold text-center"
                >
                  My Learning
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs font-semibold text-red-600 text-left py-1"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-neutral-700 hover:text-[#4A1A45] text-center py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#4A1A45] text-white text-xs font-semibold text-center"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
