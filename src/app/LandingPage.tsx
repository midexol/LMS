"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LandingNavbar } from "@/components/ui/LandingNavbar";
import { BrandLogo } from "@/components/ui/BrandLogo";
import {
  FiBookOpen, FiArrowRight, FiCheck, FiUsers, FiAward,
  FiTrendingUp, FiCpu, FiStar, FiFileText, FiShield,
  FiCheckCircle, FiCompass, FiMenu, FiX, FiClock, FiLock, FiBarChart2,
  FiMail, FiMapPin
} from "react-icons/fi";
import { formatNgn } from "@/lib/utils";
import { PASS_MARK_PERCENT } from "@/lib/grading";


// Category-based visual palette for course cards (no image required)
const CATEGORY_VISUALS: Record<string, { bg: string; accent: string; label: string }> = {
  "Software Engineering": { bg: "from-[#2A0E27] to-[#4A1A45]", accent: "#FFFFFF", label: "SE" },
  "Computer Science":     { bg: "from-[#3B1537] to-[#4A1A45]", accent: "#FFFFFF", label: "CS" },
  "Data Science & AI":    { bg: "from-[#1E0A1C] to-[#3B1537]", accent: "#FFFFFF", label: "AI" },
  "Design & UX":          { bg: "from-[#4A1A45] to-[#6B2764]", accent: "#FFFFFF", label: "UX" },
  "Business & Management":{ bg: "from-[#2A0E27] to-[#3B1537]", accent: "#FFFFFF", label: "BM" },
  General:                { bg: "from-[#3B1537] to-[#4A1A45]", accent: "#FFFFFF", label: "GN" },
};
function getCourseVisual(category: string) {
  return CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS["General"];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export function LandingPage({
  currentUser,
  featuredCourses,
  categoryCounts,
}: {
  currentUser?: any;
  featuredCourses: any[];
  categoryCounts: CategoryCount[];
}) {
  const [policyModal, setPolicyModal] = useState<"contact" | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSending, setContactSending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "Technical & Course Support",
    message: "",
    website: "", // honeypot: hidden from people, filled in by bots
  });
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  // Footer attribution. Override with NEXT_PUBLIC_INSTITUTION_NAME, or set it to "-" to hide the line.
  const institutionEnv = process.env.NEXT_PUBLIC_INSTITUTION_NAME;
  const institutionName =
    institutionEnv === "-" ? null : institutionEnv || "A product of The Federal Polytechnic, Ado-Ekiti";

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactSending) return;
    setContactSending(true);
    setContactError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send your message.");
      setContactSubmitted(true);
    } catch (err: any) {
      setContactError(err.message || "Failed to send your message. Please try again.");
    } finally {
      setContactSending(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#4A1A45] selection:text-white">
      {/* ───────────────── UNIQUE LANDING PAGE NAVBAR ───────────────── */}
      <LandingNavbar currentUser={currentUser} />

      {/* ───────────────── HERO SECTION ───────────────── */}
      <section className="pt-6 sm:pt-10 pb-8 sm:pb-10 px-4 sm:px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <h1 className="font-heading font-normal text-3xl sm:text-5xl lg:text-6xl text-black leading-[1.12] sm:leading-[1.08] tracking-tight">
              Learn one course at a time, and <span className="italic text-[#4A1A45]">finish it.</span>
            </h1>
            <p className="text-base text-neutral-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Academia gives you structured lessons, assignments graded in seconds, and a certificate when you pass.
              You take one course at a time, so you stay focused and actually complete it.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-1">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-sm shadow-md transition-all text-center flex items-center justify-center gap-2"
              >
                Create free account
              </Link>
              <Link
                href="/courses"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-neutral-50 border border-neutral-300 hover:border-[#4A1A45] text-black hover:text-[#4A1A45] font-bold text-sm transition-all text-center shadow-sm flex items-center justify-center gap-2"
              >
                Browse courses
              </Link>
            </div>

            <ul className="flex flex-col sm:flex-row sm:flex-wrap items-center lg:items-start justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-neutral-600">
              {["Pay in Naira with Paystack", "Feedback within seconds", "Certificate when you pass"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-[#4A1A45] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden border border-neutral-200/90 shadow-xl bg-neutral-100 group">
              <Image
                src="/assets/hero_library_study_option1.jpg"
                alt="A student studying on a laptop in a library"
                width={1200}
                height={675}
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="w-full h-auto aspect-[16/10] sm:aspect-[16/9] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
            </div>
          </div>
        </div>

        {/* Categories with live course counts. Hidden until there is something real to show. */}
        {categoryCounts.length > 0 && (
          <div className="mt-8 sm:mt-10 pt-5 border-t border-neutral-200/80">
            <div className="flex items-center justify-between gap-4 mb-3">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Browse by subject</span>
              <Link href="/courses" className="text-sm font-bold text-[#4A1A45] hover:underline">
                View all &rarr;
              </Link>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {categoryCounts.map((cat) => (
                <Link
                  key={cat.category}
                  href="/courses"
                  className="shrink-0 px-4 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200/80 text-black transition-all flex items-center gap-2 active:scale-95"
                >
                  <span className="text-sm font-bold">{cat.category}</span>
                  <span className="text-xs text-neutral-600 font-semibold bg-white px-2 py-0.5 rounded-full border border-neutral-200">
                    {cat.count} {cat.count === 1 ? "course" : "courses"}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ───────────────── WHY ACADEMIA ───────────────── */}
      <section className="py-10 sm:py-14 px-6 max-w-7xl mx-auto" id="campus-life">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#4A1A45]">Why Academia</span>
            <h2 className="font-heading font-normal text-3xl sm:text-4xl lg:text-5xl text-black leading-tight tracking-tight">
              Built to help you <span className="italic text-[#4A1A45]">finish what you start.</span>
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed max-w-lg">
              Every course has clear lessons, assignments set by the instructor, and a clear target to reach.
              Here is what makes Academia different.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="font-heading text-lg font-bold text-[#4A1A45]">01</span>
                <h3 className="text-base font-bold text-black tracking-tight">One course at a time</h3>
              </div>
              <p className="text-sm text-neutral-600 pl-8 leading-relaxed">
                You can have one active course at a time. Finish it, or drop it, and then enrol in the next.
                No half-finished courses piling up.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="font-heading text-lg font-bold text-[#4A1A45]">02</span>
                <h3 className="text-base font-bold text-black tracking-tight">Fast feedback, with a human in charge</h3>
              </div>
              <p className="text-sm text-neutral-600 pl-8 leading-relaxed">
                Your answers are scored automatically against the instructor&apos;s own reference answer and rubric,
                with written feedback. Instructors can review any grade, change it, and add their own notes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────── FEATURED COURSES CURRICULUM ───────────────── */}
      <section className="py-10 sm:py-14 px-6 bg-neutral-50 border-t border-neutral-200" id="curriculum">
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-neutral-200 pb-5">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#4A1A45]">Courses</span>
              <h2 className="font-heading font-normal text-3xl sm:text-4xl text-black">
                Explore our <span className="italic">courses</span>
              </h2>
            </div>
            <Link
              href="/courses"
              className="px-6 py-3 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              Browse all courses
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses && featuredCourses.length > 0 ? (
              featuredCourses.map((course, idx) => (
                <div
                  key={course.id}
                  className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Course Card Visual Header — fixed by default, or tutor custom image */}
                    {(() => {
                      const vis = getCourseVisual(course.category);
                      if (course.coverImage) {
                        return (
                          <div className="relative h-48 w-full overflow-hidden bg-neutral-900 group">
                            <img
                              src={course.coverImage}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <span className="absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm text-white border border-white/20">
                              {course.category}
                            </span>
                            <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black bg-[#4A1A45] text-white shadow-md">
                              {course.price === 0 ? "Free" : formatNgn(course.price)}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className={`relative h-48 w-full bg-gradient-to-br ${vis.bg} flex flex-col items-start justify-end p-5 overflow-hidden`}>
                          {/* Large muted initials watermark */}
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[96px] font-black text-white/5 select-none pointer-events-none leading-none">
                            {vis.label}
                          </span>
                          {/* Category badge */}
                          <span className="relative px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-sm text-white border border-white/15">
                            {course.category}
                          </span>
                          {/* Price pill */}
                          <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black bg-[#4A1A45] text-white shadow-md">
                            {course.price === 0 ? "Free" : formatNgn(course.price)}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Card Body */}
                    <div className="p-6 space-y-3">
                      <h3 className="font-bold text-lg text-black line-clamp-1 leading-snug group-hover:text-[#4A1A45] transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {course.description || "Structured lessons and assignments with instant feedback."}
                      </p>

                      <div className="flex items-center gap-2 pt-2 text-xs text-neutral-600 font-medium">
                        <span className="text-black font-semibold">{course.modules?.length || 0} Modules</span>
                        <span>·</span>
                        <span>Instructor: {course.tutor?.name || "Academia instructor"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border-t border-neutral-100 bg-neutral-50/50">
                    <Link
                      href={`/courses/${course.id}`}
                      className="w-full py-2.5 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider text-center shadow-sm transition-all block"
                    >
                      View course
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-4 text-neutral-500 text-sm">
                New courses are coming soon. Create a free account and we will have them waiting for you.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ───────────────── HOW IT WORKS ───────────────── */}
      <section className="py-10 sm:py-14 px-6 max-w-7xl mx-auto" id="how-it-works">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#4A1A45]">How it works</span>
          <h2 className="font-heading font-normal text-3xl sm:text-4xl text-black">
            From sign-up to certificate in <span className="italic text-[#4A1A45]">three steps.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Pick a course and pay",
              desc: "Choose a course, pay in Naira through Paystack, and start as soon as the payment is confirmed.",
            },
            {
              step: "02",
              title: "Learn and submit",
              desc: "Work through the lessons and submit your assignments. Each answer is scored against the instructor's rubric, with written feedback, usually within seconds.",
            },
            {
              step: "03",
              title: "Pass and get certified",
              desc: `Reach an average of ${PASS_MARK_PERCENT}% or more across the course's assignments to complete it and receive your completion certificate. Then you can enrol in your next course.`,
            },
          ].map((pillar) => (
            <div
              key={pillar.step}
              className="p-6 rounded-3xl border border-neutral-200 bg-white shadow-sm space-y-2"
            >
              <div className="text-4xl font-black text-neutral-200 select-none">{pillar.step}</div>
              <h3 className="font-bold text-xl text-black">{pillar.title}</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────── WHAT'S INCLUDED ───────────────── */}
      <section className="bg-[#2D0F2A] text-white py-12 sm:py-16 px-6 border-y border-[#3B1537]" id="whats-included">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#D6BDD4]">What you get</span>
            <h2 className="font-heading font-normal text-3xl sm:text-5xl leading-tight text-white tracking-tight">
              Everything you need to learn, <span className="italic text-[#E4D5E2]">in one place.</span>
            </h2>
            <p className="text-base text-neutral-200 leading-relaxed">
              Each course comes with its own lessons, assignments and discussion area, so you never have to piece your
              learning together from different places.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: FiBookOpen,
                title: "Structured lessons",
                desc: "Work through modules and lessons in order, with videos, notes and downloadable files.",
              },
              {
                icon: FiCheckCircle,
                title: "Instant feedback",
                desc: "Submit an assignment and get a score and written feedback within seconds. You can resubmit to improve.",
              },
              {
                icon: FiUsers,
                title: "Course discussions",
                desc: "Ask questions and read replies from your instructor and classmates on each lesson.",
              },
              {
                icon: FiAward,
                title: "Certificate when you pass",
                desc: `Reach an average of ${PASS_MARK_PERCENT}% across the course's assignments and receive your completion certificate.`,
              },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-3xl bg-[#1E0A1C] border border-[#3B1537] space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#4A1A45] flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-base text-white">{f.title}</h3>
                <p className="text-sm text-neutral-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <div>
            <Link
              href="/signup"
              className="inline-block px-8 py-3.5 rounded-full bg-white text-[#4A1A45] hover:bg-neutral-100 font-bold text-sm transition-all"
            >
              Create free account
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────── FAQ ───────────────── */}
      <section className="py-10 sm:py-14 px-6 max-w-3xl mx-auto" id="faq">
        <div className="text-center space-y-3 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[#4A1A45]">Questions</span>
          <h2 className="font-heading font-normal text-3xl sm:text-4xl text-black">
            Things students <span className="italic text-[#4A1A45]">ask us.</span>
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Can I take more than one course at once?",
              a: "No. You can have one active course at a time. Finish it, or drop it, and then you can enrol in another.",
            },
            {
              q: "How do I pay?",
              a: "Prices are in Nigerian Naira. You pay through Paystack, and your course opens as soon as the payment is confirmed. We never see or store your card details.",
            },
            {
              q: "How are my assignments graded?",
              a: "An automated system scores your answer against the instructor's reference answer and rubric and writes feedback. Instructors can review and change any grade, and you can resubmit an assignment.",
            },
            {
              q: "What do I need to complete a course?",
              a: `Submit every assignment and reach an average of at least ${PASS_MARK_PERCENT}%. You then receive a completion certificate.`,
            },
            {
              q: "Is the certificate a degree?",
              a: "No. It confirms that you completed a course on Academia. It is not a degree or a professional licence unless the course page says so.",
            },
            {
              q: "Can I get a refund?",
              a: "If your payment goes through but you cannot be enrolled, for example because you already have an active course, contact us with your payment reference and we will arrange a refund or a transfer. Other cases are covered in our Terms.",
            },
            {
              q: "How do I become an instructor?",
              a: "Instructor accounts are set up by the Academia team. Use the contact form and choose \"Teaching on Academia\", and we will get back to you.",
            },
            {
              q: "Who can see my work?",
              a: "You, your course instructor and Academia administrators. Read the Privacy Policy for the details.",
            },
          ].map((item) => (
            <details key={item.q} className="group rounded-2xl border border-neutral-200 bg-white px-5 py-4 open:bg-neutral-50">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-base font-bold text-black">
                {item.q}
                <span className="text-[#4A1A45] text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-neutral-600 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Still unsure? Read the{" "}
          <Link href="/terms" className="font-semibold text-[#4A1A45] hover:underline">Terms of Service</Link>
          {" "}or{" "}
          <button type="button" onClick={() => setPolicyModal("contact")} className="font-semibold text-[#4A1A45] hover:underline">
            contact us
          </button>
          .
        </p>
      </section>

      {/* ───────────────── ELEGANT COMPACT FOOTER ───────────────── */}
      <footer className="bg-[#1E0A1C] text-neutral-400 py-8 px-6 border-t border-[#3B1537]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand + Institutional Attribution */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <BrandLogo href="/" variant="light" size="sm" />
            <div className="hidden sm:block h-4 w-[1px] bg-[#3B1537]" />
            {institutionName && <span className="text-xs text-[#D6BDD4]">{institutionName}</span>}
          </div>

          {/* Important Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            <Link href="/courses" className="hover:text-white transition-colors">
              Courses
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-white transition-colors">
              Create account
            </Link>
            <Link href="/instructor/login" className="hover:text-white transition-colors">Instructor sign in</Link>
            <button onClick={() => setPolicyModal("contact")} className="hover:text-white transition-colors">
              Contact &amp; Support
            </button>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-neutral-500 text-center md:text-right">
            &copy; {new Date().getFullYear()} Academia. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ───────────────── FOOTER POLICY MODAL ───────────────── */}
      {policyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-neutral-200 relative text-black space-y-6">
            <button
              onClick={() => setPolicyModal(null)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors"
              aria-label="Close Modal"
            >
              <FiX className="w-5 h-5" />
            </button>

            {policyModal === "contact" && (
              <div className="space-y-5">
                <div>
                  <span className="text-xs font-bold text-[#4A1A45] uppercase tracking-wider">Direct Assistance</span>
                  <h3 className="font-heading font-bold text-2xl text-black">Contact &amp; Support</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Questions about courses, your account or payments? Send us a message and we will get back to you.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {supportEmail && (
                  <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-black">
                      <FiMail className="w-4 h-4 text-[#4A1A45]" />
                      <span>Email Support</span>
                    </div>
                    <a
                      href={`mailto:${supportEmail}`}
                      className="text-[#4A1A45] hover:underline block font-medium"
                    >
                      {supportEmail}
                    </a>
                                      </div>
                  )}

                </div>

                {contactSubmitted ? (
                  <div className="p-5 rounded-2xl bg-[#4A1A45]/5 border border-[#4A1A45]/20 text-center space-y-2">
                    <FiCheckCircle className="w-8 h-8 text-[#4A1A45] mx-auto" />
                    <h4 className="text-sm font-bold text-black">Inquiry Submitted</h4>
                    <p className="text-xs text-neutral-600 max-w-sm mx-auto">
                      We have received your message and will reply to <span className="font-semibold text-black">{contactForm.email || "your email"}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setContactSubmitted(false);
                        setContactForm({ name: "", email: "", subject: "Technical & Course Support", message: "", website: "" });
                      }}
                      className="text-xs text-[#4A1A45] underline font-semibold pt-1"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleContactSubmit}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="Your full name"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="you@example.com"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Inquiry Topic</label>
                      <select
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] bg-white"
                      >
                        <option value="Technical & Course Support">Technical &amp; Course Support</option>
                        <option value="Enrollment & Account Access">Enrollment &amp; Account Access</option>
                        <option value="Faculty & Instruction Inquiry">Faculty &amp; Instruction Inquiry</option>
                        <option value="Teaching on Academia">Teaching on Academia</option>
                        <option value="General Question">General Question</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">Message</label>
                      <textarea
                        required
                        rows={3}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="How can our support team assist you today?"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45] resize-none"
                      />
                    </div>

                    {/* Honeypot field: invisible to people, bots fill it in */}
                    <div className="hidden" aria-hidden="true">
                      <label>
                        Website
                        <input
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={contactForm.website}
                          onChange={(e) => setContactForm({ ...contactForm, website: e.target.value })}
                        />
                      </label>
                    </div>

                    {contactError && (
                      <p className="text-xs font-semibold text-red-600">{contactError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={contactSending}
                      className="w-full py-2.5 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      {contactSending ? "Sending..." : "Send Message"}
                    </button>
                  </form>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setPolicyModal(null);
                setContactSubmitted(false);
              }}
              className="w-full py-3 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
