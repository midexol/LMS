"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiX } from "react-icons/fi";
import { LandingNavbar } from "@/components/ui/LandingNavbar";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { formatNgn } from "@/lib/utils";
import { PASS_MARK_PERCENT } from "@/lib/grading";

export interface CategoryCount {
  category: string;
  count: number;
}

const FAQ = [
  {
    q: "Can I take more than one course at once?",
    a: "No. You can have one active course at a time. Finish it, or drop it, and then you can enrol in another.",
  },
  {
    q: "How do I pay?",
    a: "Prices are in Nigerian Naira. You pay through Paystack, and your course opens as soon as the payment is confirmed. The total at checkout can include a small service fee and payment-processing charges, and you see the full breakdown before you pay. We never see or store your card details.",
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
];

const STEPS = [
  {
    title: "Pick a course and pay",
    desc: "Choose a course, pay in Naira through Paystack, and start as soon as the payment is confirmed.",
  },
  {
    title: "Learn and submit",
    desc: "Work through the lessons and submit your assignments. Each answer is scored against the instructor's rubric, with written feedback, usually within seconds.",
  },
  {
    title: "Pass and get certified",
    desc: `Reach an average of ${PASS_MARK_PERCENT}% or more across the course's assignments to complete it and receive your completion certificate. Then you can enrol in your next course.`,
  },
];

const INCLUDED = [
  {
    title: "Lessons in order",
    desc: "Work through modules and lessons one after another, with videos, notes and downloadable files.",
  },
  {
    title: "Feedback on every submission",
    desc: "Submit an assignment and get a score and written feedback within seconds. You can resubmit to improve.",
  },
  {
    title: "A discussion on each lesson",
    desc: "Ask questions and read replies from your instructor and classmates, right under the lesson.",
  },
  {
    title: "A completion certificate",
    desc: `Reach an average of ${PASS_MARK_PERCENT}% across the course's assignments and the certificate is yours.`,
  },
];

const buttonPrimary =
  "inline-flex items-center justify-center rounded-md bg-[#4A1A45] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3B1537] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A1A45]";
const textLink =
  "text-sm font-semibold text-[#4A1A45] underline underline-offset-4 decoration-[#4A1A45]/40 hover:decoration-[#4A1A45]";
const fieldClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#4A1A45] focus:ring-1 focus:ring-[#4A1A45]";

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

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-[#4A1A45] selection:text-white">
      <LandingNavbar currentUser={currentUser} />

      {/* Hero */}
      <section className="px-6 max-w-7xl mx-auto pt-12 sm:pt-20 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-7">
            <h1 className="font-heading font-medium text-[2.5rem] sm:text-6xl lg:text-[4.5rem] leading-[1.04] text-ink">
              Learn one course at a time. Finish it.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-xl">
              Academia gives you structured lessons, assignments scored in seconds, and a certificate when you pass.
              Because you take one course at a time, you stay with it until it is done.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/signup" className={buttonPrimary}>
                Create free account
              </Link>
              <Link href="/courses" className={textLink}>
                Browse courses
              </Link>
            </div>

            <p className="mt-8 text-sm text-ink-soft">
              Pay in Naira with Paystack. Feedback within seconds. A certificate when you pass.
            </p>
          </div>

          <div className="lg:col-span-5">
            <Image
              src="/assets/hero_library_study_option1.jpg"
              alt="A student studying on a laptop in a library"
              width={1200}
              height={675}
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="w-full h-auto aspect-[4/3] lg:aspect-[4/5] object-cover rounded-md"
            />
          </div>
        </div>

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

      {/* Why Academia */}
      <section className="px-6 max-w-7xl mx-auto py-14 sm:py-20 border-t border-rule" id="campus-life">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <h2 className="lg:col-span-5 font-heading font-medium text-3xl sm:text-4xl lg:text-5xl leading-[1.1] text-ink">
            A course you start is a course you finish.
          </h2>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
            <div>
              <h3 className="font-heading text-xl font-semibold text-ink">One course at a time</h3>
              <p className="mt-2 text-ink-soft leading-relaxed">
                You can have one active course at a time. Finish it, or drop it, and then enrol in the next. No
                half-finished courses piling up.
              </p>
            </div>
            <div>
              <h3 className="font-heading text-xl font-semibold text-ink">Fast feedback, with a person in charge</h3>
              <p className="mt-2 text-ink-soft leading-relaxed">
                Your answers are scored automatically against the instructor&apos;s own reference answer and rubric,
                with written feedback. Instructors can review any grade, change it, and add their own notes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="py-14 sm:py-20 px-6 bg-white border-y border-rule" id="curriculum">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="font-heading font-medium text-3xl sm:text-4xl text-ink">Courses</h2>
            <Link href="/courses" className={textLink}>
              See all courses
            </Link>
          </div>

          {featuredCourses && featuredCourses.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
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
                  <p className="mt-2 text-sm text-ink-soft leading-relaxed line-clamp-3">
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
            <p className="mt-8 text-ink-soft">
              New courses are coming soon. Create a free account and we will have them waiting for you.
            </p>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 max-w-7xl mx-auto py-14 sm:py-20" id="how-it-works">
        <h2 className="font-heading font-medium text-3xl sm:text-4xl text-ink max-w-2xl">
          From sign-up to certificate in three steps
        </h2>
        <ol className="mt-10 border-t border-rule">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-10 py-6 border-b border-rule">
              <h3 className="md:col-span-4 font-heading text-xl font-semibold text-ink">
                {i + 1}. {step.title}
              </h3>
              <p className="md:col-span-7 md:col-start-6 text-ink-soft leading-relaxed">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* What is included */}
      <section className="bg-[#2D0F2A] text-white py-14 sm:py-20 px-6" id="whats-included">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="font-heading font-medium text-3xl sm:text-4xl lg:text-5xl leading-[1.1] text-white">
              What every course includes
            </h2>
            <p className="mt-5 text-[#D6BDD4] leading-relaxed max-w-md">
              Lessons, assignments and a discussion area sit inside the course, so you do not have to piece your
              learning together from different places.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-[#2D0F2A] transition-colors hover:bg-[#F7F2F6]"
            >
              Create free account
            </Link>
          </div>

          <dl className="lg:col-span-7 divide-y divide-white/15 border-y border-white/15">
            {INCLUDED.map((item) => (
              <div key={item.title} className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-8">
                <dt className="sm:col-span-5 font-heading text-lg font-semibold text-white">{item.title}</dt>
                <dd className="sm:col-span-7 text-[#D6BDD4] leading-relaxed">{item.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 max-w-3xl mx-auto py-14 sm:py-20" id="faq">
        <h2 className="font-heading font-medium text-3xl sm:text-4xl text-ink">Questions students ask</h2>

        <div className="mt-8 border-t border-rule">
          {FAQ.map((item) => (
            <details key={item.q} className="group border-b border-rule py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-ink">
                {item.q}
                <span aria-hidden="true" className="text-[#4A1A45] text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-ink-soft leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-sm text-ink-soft">
          Still unsure? Read the{" "}
          <Link href="/terms" className={textLink}>Terms of Service</Link>
          {" "}or{" "}
          <button type="button" onClick={() => setPolicyModal("contact")} className={textLink}>
            contact us
          </button>
          .
        </p>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E0A1C] text-neutral-400 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <BrandLogo href="/" variant="light" size="sm" />
            {institutionName && <span className="text-xs text-[#D6BDD4]">{institutionName}</span>}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Create account</Link>
            <button onClick={() => setPolicyModal("contact")} className="hover:text-white transition-colors">
              Contact and support
            </button>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>

          <p className="text-xs text-neutral-500 text-center md:text-right">
            &copy; {new Date().getFullYear()} Academia. All rights reserved.
          </p>
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
              <p className="text-sm text-ink-soft mt-1">
                Questions about courses, your account or payments? Send us a message and we will get back to you.
              </p>
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
