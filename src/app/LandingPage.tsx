"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FiX } from "react-icons/fi";
import { LandingNavbar } from "@/components/ui/LandingNavbar";
import { BrandLogo, AcademiaLogoIcon } from "@/components/ui/BrandLogo";
import { formatNgn } from "@/lib/utils";
import { PASS_MARK_PERCENT } from "@/lib/grading";

export interface CategoryCount {
  category: string;
  count: number;
}

const FAQ = [
  {
    q: "Can I take more than one course at once?",
    a: "No. You have one active course at a time. Finish it or drop it, then enrol in another.",
  },
  {
    q: "How do I pay?",
    a: "Through Paystack. Your course opens when the payment is confirmed. Checkout shows the full total, including any service fee. We never see your card details.",
  },
  {
    q: "How are my assignments graded?",
    a: "An automated system scores your answer against the instructor's rubric and writes feedback. Instructors can review and change any grade, and you can resubmit.",
  },
  {
    q: "What do I need to complete a course?",
    a: `Submit every assignment and average at least ${PASS_MARK_PERCENT}%. Then your certificate is issued.`,
  },
  {
    q: "Is the certificate a degree?",
    a: "No. It confirms that you completed a course on Academia. It is not a degree or a professional licence.",
  },
  {
    q: "Can I get a refund?",
    a: "If you paid but could not be enrolled, contact us with your payment reference and we will refund or transfer it. Other cases are in our Terms.",
  },
  {
    q: "How do I become an instructor?",
    a: "Instructor accounts are set up by the Academia team. Use the contact form and choose \"Teaching on Academia\".",
  },
  {
    q: "Who can see my work?",
    a: "You, your instructor and Academia administrators. See the Privacy Policy for details.",
  },
];

const STEPS = [
  { title: "Pick a course", desc: "Pay and start straight away." },
  { title: "Learn and submit", desc: "Scored in seconds, with written feedback." },
  { title: "Pass and get certified", desc: `Average ${PASS_MARK_PERCENT}% or more.` },
];

const INCLUDED = [
  { title: "Lessons in order", desc: "Videos, notes and files." },
  { title: "Instant feedback", desc: "A score and comments in seconds." },
  { title: "Lesson discussions", desc: "Ask your instructor and classmates." },
  { title: "A certificate", desc: `Earned at a ${PASS_MARK_PERCENT}% average.` },
];

const buttonPrimary =
  "inline-flex items-center justify-center rounded-md bg-[#4A1A45] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3B1537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A1A45]";
const textLink =
  "text-sm font-semibold text-[#4A1A45] underline underline-offset-4 decoration-[#4A1A45]/40 hover:decoration-[#4A1A45]";
const textLinkLight =
  "text-sm font-semibold text-white underline underline-offset-4 decoration-white/40 hover:decoration-white";
const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45]";

/** A drawn view of the course screen students work in: lessons, progress and a scored assignment. */
function CourseViewPreview() {
  const lessons = [
    { title: "Welcome and how this course works", done: true },
    { title: "Understanding your customer", done: true },
    { title: "Pricing and positioning", done: true },
    { title: "Assignment 1: position a product", current: true },
  ];
  return (
    <div
      className="bg-white text-ink rounded-md overflow-hidden"
      role="img"
      aria-label="Example of a course view with a lesson list, progress bar and a scored assignment"
    >
      <div className="px-6 pt-6">
        <p className="flex items-baseline justify-between text-xs text-ink-soft">
          <span>Module 2 of 5</span>
          <span>Example course</span>
        </p>
        <p className="mt-1 font-heading text-2xl font-semibold leading-tight">Introduction to Marketing</p>
        <div className="mt-4 h-1.5 bg-[#EFE7EE] rounded-full">
          <div className="h-1.5 rounded-full bg-[#4A1A45]" style={{ width: "42%" }} />
        </div>
      </div>

      <ul className="mt-4 px-6 divide-y divide-rule border-t border-rule">
        {lessons.map((l) => (
          <li key={l.title} className="flex items-center gap-3 py-3 text-sm">
            <span
              aria-hidden="true"
              className={`shrink-0 w-4 h-4 rounded-sm border ${
                l.done ? "bg-[#4A1A45] border-[#4A1A45]" : "border-[#4A1A45] border-2"
              }`}
            />
            <span className={l.done ? "text-ink-soft" : "font-semibold"}>{l.title}</span>
          </li>
        ))}
      </ul>

      <div className="bg-[#F7F2F6] border-t border-rule px-6 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-semibold">Last assignment</p>
          <p className="font-heading text-3xl font-semibold text-[#4A1A45]">78%</p>
        </div>
        <div className="relative mt-2 h-1.5 bg-[#E4D5E2] rounded-full">
          <div className="h-1.5 rounded-full bg-[#4A1A45]" style={{ width: "78%" }} />
          <div className="absolute -top-1 h-3.5 w-px bg-ink" style={{ left: `${PASS_MARK_PERCENT}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-ink-soft">Pass mark {PASS_MARK_PERCENT}%</p>
      </div>
    </div>
  );
}

/** The certificate a student receives. `compact` is a decorative small version for the hero. */
function CertificateCard({ name, compact = false }: { name: string; compact?: boolean }) {
  const shown = name.trim();
  const a11y = compact
    ? { "aria-hidden": true as const }
    : { role: "img" as const, "aria-label": `Completion certificate for ${shown || "you"}` };
  return (
    <div
      {...a11y}
      className={`bg-[#FBF6EC] text-[#24122A] border-[3px] border-double border-[#4A1A45]/70 text-center ${
        compact ? "px-5 py-5" : "px-6 py-8 sm:px-12 sm:py-12"
      }`}
    >
      <p className={`tracking-[0.2em] uppercase text-[#4A1A45] ${compact ? "text-[10px]" : "text-[11px] sm:text-xs"}`}>
        Academia &middot; Certificate of completion
      </p>
      <p className={`text-[#24122A]/70 ${compact ? "mt-3 text-xs" : "mt-7 text-sm"}`}>This certifies that</p>
      <p
        className={`font-heading leading-tight break-words border-b border-[#24122A]/30 ${
          compact ? "mt-1 text-2xl pb-1.5" : "mt-2 text-3xl sm:text-5xl pb-3"
        } ${shown ? "text-[#24122A]" : "text-[#24122A]/30"}`}
      >
        {shown || "Your name"}
      </p>
      <p className={`text-[#24122A]/70 ${compact ? "mt-3 text-xs" : "mt-6 text-sm"}`}>has completed</p>
      <p className={`font-heading text-[#24122A] ${compact ? "mt-0.5 text-lg" : "mt-1 text-xl sm:text-3xl"}`}>
        The course you choose
      </p>
      {!compact && (
        <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
          <div className="border-t border-[#24122A]/40 pt-1 text-[11px] text-[#24122A]/70">Course instructor</div>
          <AcademiaLogoIcon className="w-11 h-11" />
          <div className="border-t border-[#24122A]/40 pt-1 text-[11px] text-[#24122A]/70">Date of completion</div>
        </div>
      )}
    </div>
  );
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
  const [certName, setCertName] = useState("");
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

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-[#4A1A45] selection:text-white">
      <LandingNavbar currentUser={currentUser} />

      {/* Hero */}
      <section className="bg-[#2D0F2A] text-white">
        <div className="max-w-7xl mx-auto px-6 pt-14 sm:pt-24 pb-16 sm:pb-28 grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-12 items-center">
          <div className="lg:col-span-6">
            <h1 className="font-heading font-medium text-[2.75rem] sm:text-7xl lg:text-[4.5rem] leading-[1] text-white text-balance">
              Learn one course at a time. Finish it.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-[#D6BDD4] max-w-md leading-snug">
              Lessons, instant feedback and a certificate when you pass.
            </p>

            <form action="/courses" method="get" role="search" className="mt-9 flex max-w-lg">
              <label htmlFor="hero-search" className="sr-only">Search courses</label>
              <input
                id="hero-search"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="What do you want to learn?"
                className="min-w-0 flex-1 rounded-l-md border border-r-0 border-white bg-white px-4 py-3.5 text-base text-ink placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#D6BDD4]"
              />
              <button
                type="submit"
                className="rounded-r-md bg-[#8E3A86] px-5 sm:px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#A24A99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Link href="/signup" className={textLinkLight}>
                Create free account
              </Link>
              <Link href="/courses" className={textLinkLight}>
                Browse courses
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 relative md:pb-40">
            <div className="md:w-[88%]">
              <CourseViewPreview />
            </div>
            <div className="hidden md:block absolute right-0 bottom-0 w-[62%]">
              <CertificateCard name="" compact />
            </div>
          </div>
        </div>
      </section>

      {/* Figures */}
      <section className="px-6 max-w-7xl mx-auto py-14 sm:py-20">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-8">
          <div>
            <dt className="font-heading text-8xl sm:text-9xl font-medium text-[#4A1A45] leading-none">{PASS_MARK_PERCENT}%</dt>
            <dd className="mt-4 text-lg text-ink-soft">Pass mark on assignments</dd>
          </div>
          <div>
            <dt className="font-heading text-8xl sm:text-9xl font-medium text-[#4A1A45] leading-none">1</dt>
            <dd className="mt-4 text-lg text-ink-soft">Active course at a time</dd>
          </div>
        </dl>

        {categoryCounts.length > 0 && (
          <div className="mt-12 pt-5 border-t border-rule flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
            <span className="text-ink-soft">Subjects</span>
            {categoryCounts.map((cat) => (
              <Link key={cat.category} href="/courses" className="text-ink hover:text-[#4A1A45] hover:underline underline-offset-4">
                {cat.category}{" "}
                <span className="text-ink-soft">
                  ({cat.count} {cat.count === 1 ? "course" : "courses"})
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Courses */}
      <section className="py-14 sm:py-20 px-6 bg-white border-y border-rule" id="curriculum">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-heading font-medium text-4xl sm:text-5xl text-ink">Courses</h2>
            <Link href="/courses" className={textLink}>
              See all courses
            </Link>
          </div>

          {featuredCourses && featuredCourses.length > 0 ? (
            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {featuredCourses.map((course) => (
                <article key={course.id} className="flex flex-col border-t-2 border-ink pt-4">
                  {course.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      className="w-full aspect-[16/9] object-cover rounded-md mb-4"
                    />
                  )}
                  <p className="text-sm text-ink-soft">{course.category}</p>
                  <h3 className="mt-1 font-heading text-2xl font-semibold leading-snug text-ink">
                    <Link href={`/courses/${course.id}`} className="hover:text-[#4A1A45]">
                      {course.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed line-clamp-2">
                    {course.description || "Structured lessons and assignments with instant feedback."}
                  </p>
                  <p className="mt-3 text-sm text-ink-soft">
                    {course.modules?.length || 0} {(course.modules?.length || 0) === 1 ? "module" : "modules"}
                    {" · "}
                    {course.tutor?.name || "Academia instructor"}
                  </p>
                  <div className="mt-4 flex items-baseline justify-between gap-4">
                    <span className="font-semibold text-ink">{course.price === 0 ? "Free" : formatNgn(course.price)}</span>
                    <Link href={`/courses/${course.id}`} className={textLink}>
                      View course
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-xl text-ink-soft">New courses are coming soon.</p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 max-w-7xl mx-auto py-16 sm:py-24" id="how-it-works">
        <h2 className="font-heading font-medium text-4xl sm:text-5xl text-ink">How it works</h2>
        <ol className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t-2 border-[#4A1A45] pt-5">
              <p className="text-sm text-ink-soft">Step {i + 1}</p>
              <h3 className="mt-2 font-heading text-3xl font-semibold text-ink leading-tight">{step.title}</h3>
              <p className="mt-3 text-ink-soft">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Certificate */}
      <section className="bg-[#F3EAF2] py-16 sm:py-24 px-6" id="certificate">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-4">
            <h2 className="font-heading font-medium text-4xl sm:text-5xl leading-[1.05] text-ink">Your name on it.</h2>
            <div className="mt-8 max-w-sm">
              <label htmlFor="cert-name" className="block text-sm font-medium text-ink mb-1.5">
                Put your name on it
              </label>
              <input
                id="cert-name"
                type="text"
                maxLength={40}
                autoComplete="off"
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                placeholder="Type your name"
                className={fieldClass}
              />
            </div>
          </div>
          <div className="lg:col-span-8">
            <CertificateCard name={certName} />
          </div>
        </div>
      </section>

      {/* What is included */}
      <section className="bg-[#2D0F2A] text-white py-16 sm:py-24 px-6" id="whats-included">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="font-heading font-medium text-4xl sm:text-5xl text-white">In every course</h2>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-[#2D0F2A] transition-colors hover:bg-[#F7F2F6]"
            >
              Create free account
            </Link>
          </div>
          <dl className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {INCLUDED.map((item) => (
              <div key={item.title} className="border-t border-white/30 pt-5">
                <dt className="font-heading text-2xl font-semibold text-white leading-snug">{item.title}</dt>
                <dd className="mt-2 text-[#D6BDD4]">{item.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 max-w-3xl mx-auto py-16 sm:py-24" id="faq">
        <h2 className="font-heading font-medium text-4xl sm:text-5xl text-ink">Questions</h2>

        <div className="mt-10 border-t border-rule">
          {FAQ.map((item) => (
            <details key={item.q} className="group border-b border-rule py-5">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-lg font-medium text-ink">
                {item.q}
                <span aria-hidden="true" className="text-[#4A1A45] text-2xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-ink-soft leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-ink-soft">
          Still unsure?{" "}
          <button type="button" onClick={() => setPolicyModal("contact")} className={textLink}>
            Contact us
          </button>
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E0A1C] text-[#D6BDD4]">
        <div className="max-w-7xl mx-auto px-6 pt-14 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-x-8 gap-y-10">
            <div className="col-span-2 md:col-span-4 max-w-sm">
              <BrandLogo href="/" variant="light" size="md" />
              <p className="mt-4 text-sm leading-relaxed">
                Structured online courses with feedback on every submission and a certificate when you pass.
              </p>
              {institutionName && <p className="mt-3 text-sm text-white/80">{institutionName}</p>}
            </div>

            <nav aria-label="Learn" className="md:col-span-2 md:col-start-6">
              <h2 className="font-sans text-sm font-semibold text-white">Learn</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link href="/courses" className="hover:text-white transition-colors">Courses</Link></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </nav>

            <nav aria-label="Support" className="col-span-2 sm:col-span-1 md:col-span-3">
              <h2 className="font-sans text-sm font-semibold text-white">Support</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <button onClick={() => setPolicyModal("contact")} className="hover:text-white transition-colors text-left">
                    Contact and support
                  </button>
                </li>
                {supportEmail && (
                  <li>
                    <a href={`mailto:${supportEmail}`} className="hover:text-white transition-colors break-all">
                      {supportEmail}
                    </a>
                  </li>
                )}
              </ul>
            </nav>

            <nav aria-label="Legal" className="md:col-span-2">
              <h2 className="font-sans text-sm font-semibold text-white">Legal</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              </ul>
            </nav>
          </div>

          <div className="mt-12 pt-6 border-t border-white/15 text-xs text-[#D6BDD4]/80">
            &copy; {new Date().getFullYear()} Academia. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Contact modal */}
      {policyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
        >
          <div className="bg-white rounded-lg max-w-lg w-full p-6 sm:p-8 border border-neutral-200 relative text-ink space-y-5 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => {
                setPolicyModal(null);
                setContactSubmitted(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-ink transition-colors"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div>
              <h3 id="contact-title" className="font-heading font-semibold text-2xl text-ink">Contact and support</h3>
              <p className="text-sm text-ink-soft mt-1">Questions about courses, your account or payments? Send us a message.</p>
              {supportEmail && (
                <p className="text-sm mt-3">
                  Or write to{" "}
                  <a href={`mailto:${supportEmail}`} className={textLink}>
                    {supportEmail}
                  </a>
                </p>
              )}
            </div>

            {contactSubmitted ? (
              <div className="p-5 rounded-md bg-[#F7F2F6] border border-[#4A1A45]/20 space-y-2">
                <h4 className="text-sm font-semibold text-ink">Message received</h4>
                <p className="text-sm text-ink-soft">
                  We will reply to <span className="font-semibold text-ink">{contactForm.email || "your email"}</span>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setContactSubmitted(false);
                    setContactForm({ name: "", email: "", subject: "Technical & Course Support", message: "", website: "" });
                  }}
                  className={textLink}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-ink mb-1">Full name</label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="Your full name"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-ink mb-1">Email address</label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="you@example.com"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-topic" className="block text-sm font-medium text-ink mb-1">Topic</label>
                  <select
                    id="contact-topic"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className={fieldClass}
                  >
                    <option value="Technical & Course Support">Technical &amp; Course Support</option>
                    <option value="Enrollment & Account Access">Enrollment &amp; Account Access</option>
                    <option value="Faculty & Instruction Inquiry">Faculty &amp; Instruction Inquiry</option>
                    <option value="Teaching on Academia">Teaching on Academia</option>
                    <option value="General Question">General Question</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-ink mb-1">Message</label>
                  <textarea
                    id="contact-message"
                    required
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="How can we help?"
                    className={`${fieldClass} resize-none`}
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

                {contactError && <p role="alert" className="text-sm font-medium text-red-700">{contactError}</p>}

                <button type="submit" disabled={contactSending} className={`${buttonPrimary} w-full disabled:opacity-60`}>
                  {contactSending ? "Sending..." : "Send message"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
