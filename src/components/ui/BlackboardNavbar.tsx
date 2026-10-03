"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiMenu4Line, RiCloseLine } from "react-icons/ri";
import { FiCheck, FiX } from "react-icons/fi";

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

interface BlackboardNavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "TUTOR" | "ADMIN";
  } | null;
  showSpacer?: boolean;
}

export function BlackboardNavbar({ currentUser, showSpacer = true }: BlackboardNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  const navLinks = [
    { label: "Courses", href: "/courses", primary: true },
    { label: "Curriculum", href: "/#curriculum", primary: true },
    { label: "How It Works", href: "/#how-it-works", primary: false },
    { label: "Campus Life", href: "/#campus-life", primary: false },
    { label: "Faculty", href: "/instructor/login", primary: true },
  ];

  return (
    <>
      <header
        id="site-header"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out flex justify-center px-3 sm:px-4 ${
          scrolled ? "py-2" : "py-3 sm:py-4"
        }`}
      >
        <div
          style={{ backgroundColor: "rgba(10, 10, 10, 0.94)" }}
          className={`transition-all duration-300 ease-out flex items-center justify-between gap-3 sm:gap-4 py-2 px-3 sm:px-5 rounded-full relative border border-neutral-800 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl text-white ${
            scrolled ? "w-full max-w-4xl" : "w-full max-w-5xl"
          }`}
        >
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border border-neutral-700 group-hover:border-[#D4A373] transition-colors shrink-0 flex items-center justify-center bg-neutral-900">
              <BbLogo className="h-4 sm:h-4.5 w-auto" color="#ffffff" />
            </div>
            <span className="font-heading font-bold text-base sm:text-lg text-white tracking-tight shrink-0">
              Academia
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 shrink" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-[12px] sm:text-[12.5px] font-sans px-2.5 sm:px-3 py-1.5 rounded-full transition-all duration-200 shrink-0 ${
                    !link.primary ? "hidden lg:inline-block" : ""
                  } ${
                    isActive
                      ? "text-white bg-white/15 border border-white/20 font-semibold"
                      : "text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              onClick={() => setContactModalOpen(true)}
              className="text-[12px] sm:text-[12.5px] font-sans px-2.5 sm:px-3 py-1.5 rounded-full transition-all duration-200 text-neutral-300 hover:text-white hover:bg-white/[0.08] hidden lg:inline-block shrink-0"
            >
              Support
            </button>
          </nav>

          {/* Right CTA & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {currentUser ? (
              <>
                <span className="text-[10px] font-mono uppercase text-[#D4A373] hidden xl:inline-block px-2 py-0.5 rounded-full bg-white/5 border border-white/10 tracking-wider">
                  {currentUser.role}
                </span>
                <Link
                  href={currentUser.role === "TUTOR" ? "/instructor" : "/my-courses"}
                  className="inline-flex items-center justify-center px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all bg-white hover:bg-neutral-200 text-black shadow-md hover:-translate-y-0.5 active:translate-y-0 shrink-0 whitespace-nowrap"
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
                  className="text-neutral-300 hover:text-white text-xs font-semibold px-2.5 py-1.5 transition-colors whitespace-nowrap hidden sm:inline-block"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all bg-white hover:bg-neutral-200 text-black shadow-md hover:-translate-y-0.5 active:translate-y-0 shrink-0 whitespace-nowrap"
                >
                  Join as Student
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <RiCloseLine className="w-5 h-5" /> : <RiMenu4Line className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown Drawer */}
        {mobileMenuOpen && (
          <div
            style={{ backgroundColor: "rgba(10, 10, 10, 0.96)" }}
            className="md:hidden fixed inset-x-3 top-16 z-50 backdrop-blur-2xl border border-neutral-800 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 text-white"
          >
            <div className="grid grid-cols-2 gap-2 text-xs">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3 py-2.5 rounded-xl transition-colors text-center font-medium ${
                      isActive
                        ? "bg-white/15 text-white font-semibold border border-white/20"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setContactModalOpen(true);
                }}
                className="px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 hover:text-white transition-colors text-center font-medium"
              >
                Support
              </button>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex flex-col gap-2">
              {currentUser ? (
                <>
                  <Link
                    href={currentUser.role === "TUTOR" ? "/instructor" : "/my-courses"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs text-center shadow-sm"
                  >
                    Go to Dashboard
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
                    Join as Student
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

      {/* Spacer for non-landing pages */}
      {showSpacer && <div className="h-20 sm:h-24 w-full" aria-hidden="true" />}

      {/* Contact Support Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-neutral-200 relative text-black space-y-6">
            <button
              onClick={() => { setContactModalOpen(false); setContactSubmitted(false); }}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
              aria-label="Close Modal"
            >
              <FiX className="w-5 h-5" />
            </button>

            {contactSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center mx-auto shadow-md">
                  <FiCheck className="w-7 h-7" />
                </div>
                <h3 className="font-heading font-bold text-2xl text-black">Inquiry Received</h3>
                <p className="text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed">
                  Thank you for reaching out. An academic representative will connect with your institution within 1 business day.
                </p>
                <button
                  onClick={() => { setContactModalOpen(false); setContactSubmitted(false); }}
                  className="px-8 py-3 rounded-full bg-black text-white font-bold text-xs uppercase tracking-wider shadow-sm hover:bg-neutral-800"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <BbLogo className="h-6 w-auto" color="#000000" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#784D28]">Academic Inquiries</span>
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-black tracking-tight">Connect with Us</h3>
                  <p className="text-xs text-neutral-500">Discover how our LMS transforms institutional curriculum delivery.</p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContactSubmitted(true);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Eleanor Vance"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Institutional Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.vance@university.edu"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Institution / Organization</label>
                    <input
                      type="text"
                      required
                      placeholder="Cambridge Academic Council"
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">Message or Requirement</label>
                    <textarea
                      rows={3}
                      placeholder="Inquiring about syllabus AI benchmarks and LMS faculty deployment..."
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:border-black resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
                  >
                    Submit Institutional Inquiry
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
