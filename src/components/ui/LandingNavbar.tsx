"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PiList, PiX } from "react-icons/pi";
import { BrandLogo } from "./BrandLogo";

interface LandingNavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN" | string;
  } | null;
}

const navLink = "text-sm text-ink-soft hover:text-[#4A1A45] transition-colors";
const solidButton =
  "rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white text-sm font-semibold px-4 py-2 transition-colors";

export function LandingNavbar({ currentUser }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const close = () => setMobileMenuOpen(false);

  return (
    <header id="site-header" className="sticky top-0 left-0 right-0 z-50 bg-paper border-b border-rule">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <BrandLogo href="/" variant="dark" size="sm" />

          <nav className="hidden md:flex items-center gap-7" aria-label="Main Navigation">
            <Link href="/courses" className={navLink}>Courses</Link>
            <a href="#how-it-works" className={navLink}>How it works</a>
            <a href="#faq" className={navLink}>FAQ</a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {currentUser ? (
            <>
              <button onClick={handleLogout} className={`${navLink} hidden sm:inline-block`}>
                Sign out
              </button>
              <Link href="/my-courses" className={solidButton}>
                My learning
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={navLink}>Sign in</Link>
              <Link href="/signup" className={solidButton}>Get started</Link>
            </>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-9 h-9 rounded-md border border-rule flex items-center justify-center text-ink hover:bg-white transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <PiX className="w-5 h-5" /> : <PiList className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-paper border-t border-rule px-6 py-4 space-y-1">
          <Link href="/courses" onClick={close} className="block text-sm text-ink py-2">Courses</Link>
          <a href="#how-it-works" onClick={close} className="block text-sm text-ink py-2">How it works</a>
          <a href="#faq" onClick={close} className="block text-sm text-ink py-2">FAQ</a>
          <div className="pt-3 mt-2 border-t border-rule flex flex-col gap-2">
            {currentUser ? (
              <>
                <Link href="/my-courses" onClick={close} className={`${solidButton} text-center`}>
                  My learning
                </Link>
                <button onClick={handleLogout} className="text-sm text-red-700 text-left py-2">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={close} className="text-sm text-ink text-center py-2">
                  Sign in
                </Link>
                <Link href="/signup" onClick={close} className={`${solidButton} text-center`}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
