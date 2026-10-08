"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiMenu4Line, RiCloseLine } from "react-icons/ri";
import { FiLogOut, FiUser, FiBookOpen, FiCreditCard, FiChevronDown, FiShield, FiSliders } from "react-icons/fi";
import { BrandLogo } from "./BrandLogo";

interface NavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN" | "SUPERADMIN" | string;
  } | null;
}

export function Navbar({ currentUser }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const brandHomeHref = currentUser
    ? currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN"
      ? "/admin"
      : currentUser.role === "TUTOR"
      ? "/instructor"
      : "/my-courses"
    : "/";

  // Primary navigation links (Clean & focused)
  const navLinks = [
    { label: "All Courses", href: "/courses" },
    ...(currentUser && currentUser.role === "STUDENT"
      ? [{ label: "My Learning", href: "/my-courses" }]
      : currentUser && (currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN")
      ? [{ label: "Admin Console", href: "/admin" }]
      : currentUser && currentUser.role === "TUTOR"
      ? [{ label: "Instructor Studio", href: "/instructor" }]
      : []),
  ];

  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-40 bg-white text-black border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-8">
          <BrandLogo
            href={brandHomeHref}
            size="sm"
          />

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

        {/* Right: Auth / User Avatar Menu */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all text-left"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {userInitial}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-neutral-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium leading-none">
                    {currentUser.role}
                  </span>
                </div>
                <FiChevronDown
                  className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
                    userMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-neutral-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Account Summary Header */}
                  <div className="px-4 py-3 border-b border-neutral-100">
                    <p className="text-xs font-black text-neutral-900 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {currentUser.email}
                    </p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#784D28]/10 text-[#784D28] border border-[#784D28]/25">
                      {currentUser.role} Account
                    </span>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN" ? (
                      <>
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiShield className="w-4 h-4 text-emerald-600" />
                          Superadmin Console
                        </Link>
                        <Link
                          href="/admin?tab=settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiSliders className="w-4 h-4 text-[#784D28]" />
                          System Settings
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiUser className="w-4 h-4 text-neutral-500" />
                          Account Security &amp; Profile
                        </Link>
                      </>
                    ) : currentUser.role === "TUTOR" ? (
                      <>
                        <Link
                          href="/instructor"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiBookOpen className="w-4 h-4 text-[#D4A373]" />
                          Instructor Studio
                        </Link>
                        <Link
                          href="/instructor?tab=settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiSliders className="w-4 h-4 text-[#784D28]" />
                          Studio Settings
                        </Link>
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiUser className="w-4 h-4 text-neutral-500" />
                          Account Profile
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiUser className="w-4 h-4 text-[#784D28]" />
                          Profile &amp; Academic Records
                        </Link>
                        <Link
                          href="/my-courses"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiBookOpen className="w-4 h-4 text-neutral-500" />
                          My Learning Workspace
                        </Link>
                        <Link
                          href="/profile#receipts"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors"
                        >
                          <FiCreditCard className="w-4 h-4 text-neutral-500" />
                          Tuition &amp; Payment Receipts
                        </Link>
                      </>
                    )}
                  </div>

                  {/* Logout Row */}
                  <div className="border-t border-neutral-100 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <FiLogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
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
            <>
              {currentUser.role === "ADMIN" || currentUser.role === "SUPERADMIN" ? (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiShield className="w-4 h-4 text-emerald-600" />
                    Superadmin Console
                  </Link>
                  <Link
                    href="/admin?tab=settings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiSliders className="w-4 h-4 text-[#784D28]" />
                    System Settings
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiUser className="w-4 h-4 text-neutral-500" />
                    Account Security &amp; Profile
                  </Link>
                </>
              ) : currentUser.role === "TUTOR" ? (
                <>
                  <Link
                    href="/instructor"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiBookOpen className="w-4 h-4 text-[#D4A373]" />
                    Instructor Studio
                  </Link>
                  <Link
                    href="/instructor?tab=settings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiSliders className="w-4 h-4 text-[#784D28]" />
                    Studio Settings
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiUser className="w-4 h-4 text-neutral-500" />
                    Account Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiUser className="w-4 h-4 text-[#784D28]" />
                    Profile &amp; Academic Records
                  </Link>
                  <Link
                    href="/my-courses"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiBookOpen className="w-4 h-4 text-neutral-500" />
                    My Learning Workspace
                  </Link>
                  <Link
                    href="/profile#receipts"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                  >
                    <FiCreditCard className="w-4 h-4 text-neutral-500" />
                    Tuition &amp; Payment Receipts
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 text-left"
              >
                <FiLogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
