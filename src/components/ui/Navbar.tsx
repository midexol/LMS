"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiMenu4Line, RiCloseLine } from "react-icons/ri";
import { FiLogOut } from "react-icons/fi";
import { BbLogo } from "./LandingNavbar";

interface NavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN";
  } | null;
}

export function Navbar({ currentUser }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const navLinks = [
    { label: "All Courses", href: "/courses" },
    ...(currentUser
      ? [
          { label: "My Learning", href: "/my-courses" },
          { label: "Transcript", href: "/profile" },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white text-black border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-8">
          <Link
            href={currentUser ? "/my-courses" : "/courses"}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-200 group-hover:border-black transition-colors shrink-0 flex items-center justify-center bg-neutral-100">
              <BbLogo className="h-4.5 w-auto" color="#000000" />
            </div>
            <span className="font-heading font-bold text-lg text-black tracking-tight shrink-0">
              Academia
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                    isActive
                      ? "bg-black text-white"
                      : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Auth / User actions */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-neutral-700 hidden sm:inline">
                {currentUser.name}
              </span>
              <span className="text-[10px] font-mono uppercase text-[#784D28] px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 font-bold hidden sm:inline">
                Student
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                title="Sign Out"
              >
                <FiLogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-semibold px-3 py-1.5 text-neutral-700 hover:text-black transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-full bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition-all shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <RiCloseLine className="w-5 h-5" /> : <RiMenu4Line className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-neutral-200 px-4 py-3 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-xl text-xs font-semibold ${
                  isActive
                    ? "bg-black text-white"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-neutral-500 hover:text-black hover:bg-neutral-100"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
