import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy - Academia LMS",
  description: "What personal data Academia LMS collects, who it is shared with, and your rights.",
};

const sections: LegalSection[] = [
  {
    title: "Who we are",
    paragraphs: [
      "Academia LMS (\"Academia\", \"we\", \"us\") runs this learning platform and decides how your personal data is used. This policy explains what we collect, why, who we share it with, and the choices you have. We handle personal data in line with the Nigeria Data Protection Act 2023 (NDPA).",
    ],
  },
  {
    title: "What we collect",
    bullets: [
      "Account details: your name, email address, faculty and department, an optional phone number, the time of your last sign-in, and your password (stored only as a one-way hash, never in readable form).",
      "Sign-in details from Google if you choose \"Continue with Google\": your email address and name. We never see your Google password.",
      "Learning activity: your enrolments, lesson progress, assignment answers, scores, feedback, certificates, and discussion posts and replies.",
      "Payment records: the amount, currency, status, date and reference of each payment. Your card or bank details are handled by Paystack and are never stored by us.",
      "Messages you send us through the contact form: your name, email address, chosen topic and message.",
      "Technical data: your IP address, used to limit abuse such as repeated login or payment attempts, and the cookies described below.",
    ],
  },
  {
    title: "How and why we use it",
    bullets: [
      "To create and secure your account, and to sign you in (to perform our agreement with you).",
      "To provide courses, record your progress, grade your assignments and issue certificates (to perform our agreement with you).",
      "To take payments, confirm enrolment and keep financial records (to perform our agreement with you and to meet legal obligations).",
      "To send emails you need: verification, password reset, enrolment confirmations, grades, announcements and course updates (to perform our agreement with you).",
      "To answer your messages and give support (our legitimate interest in helping our users).",
      "To protect the platform from fraud, abuse and attacks (our legitimate interest in keeping the service safe).",
    ],
  },
  {
    title: "Automated grading and AI services",
    paragraphs: [
      "Assignments are graded by an artificial-intelligence service, one of Google Gemini, OpenAI, Groq or OpenRouter, depending on how the platform is configured. To grade an answer we send that service the assignment question, the tutor's reference answer and rubric, and your answer. We do not send your name or email address with it.",
      "Tutors may also use an AI assistant to help draft course outlines. Tutors and administrators can review and override any automated score. If no AI service is available, a simple built-in keyword grader is used instead, and nothing leaves our systems.",
    ],
  },
  {
    title: "Who we share data with",
    paragraphs: [
      "We do not sell your personal data and we do not use it for advertising. We share it only with the service providers that help us run Academia, and only for that purpose:",
    ],
    bullets: [
      "Neon: our database.",
      "Cloudflare: private storage for uploaded course files.",
      "Vercel: hosting of the website and its server functions.",
      "Paystack: payment processing.",
      "Google: \"Continue with Google\" sign-in.",
      "Google (Gemini), OpenAI, Groq or OpenRouter: automated grading, as described above.",
      "Our email delivery provider: sending the emails listed above.",
      "A rate-limiting service: short-lived counters tied to your IP address, which expire automatically within an hour.",
    ],
  },
  {
    title: "Who can see your work",
    paragraphs: [
      "Your assignment answers, scores and feedback are visible to you, to the tutor of the course and to Academia administrators. Discussion posts are visible to people enrolled in that course and to the tutor and administrators. Your name appears next to your discussion posts.",
    ],
  },
  {
    title: "Transfers outside Nigeria",
    paragraphs: [
      "Some of the providers above store or process data in other countries. Where we transfer personal data abroad, we rely on the safeguards the NDPA allows, such as contracts with those providers that require them to protect it.",
    ],
  },
  {
    title: "Cookies",
    paragraphs: [
      "We use only the cookies the site needs to work. We do not use advertising or tracking cookies.",
    ],
    bullets: [
      "A session cookie that keeps you signed in. It is protected from scripts, is not readable by the browser's code, and expires after 7 days.",
      "A second cookie that records your account type so pages can send you to the right dashboard.",
    ],
  },
  {
    title: "How long we keep your data",
    paragraphs: [
      "We keep your account and learning records for as long as your account exists. When you ask us to delete your account we delete or anonymise your personal data, except records we must keep by law, such as payment and accounting records. Messages sent through the contact form are kept until we have dealt with them and are then deleted.",
    ],
  },
  {
    title: "How we protect your data",
    bullets: [
      "Passwords are stored as salted one-way hashes.",
      "All traffic to the site is encrypted in transit.",
      "Lesson videos and files are stored privately and are shown only through short-lived links created for enrolled students.",
      "Administrator and tutor tools are restricted by role.",
    ],
    paragraphs: [
      "No system is completely secure. If a breach affects your personal data, we will tell you and the Nigeria Data Protection Commission as the law requires.",
    ],
  },
  {
    title: "Your rights",
    paragraphs: ["Under the NDPA you have the right to:"],
    bullets: [
      "be told how your data is used, and ask for a copy of it;",
      "have inaccurate data corrected;",
      "have your data deleted, or its use restricted, in the situations the law allows;",
      "object to uses based on our legitimate interests;",
      "receive your data in a portable format;",
      "withdraw consent where we rely on it;",
      "complain to the Nigeria Data Protection Commission (NDPC) if you think we have mishandled your data.",
    ],
  },
  {
    title: "How to exercise your rights",
    paragraphs: [
      "Contact us using the details at the end of this page. Tell us who you are and what you want us to do, and we will reply within a reasonable time. We may need to confirm your identity first. You can correct your name, faculty, department and password yourself on your profile page.",
    ],
  },
  {
    title: "Young people",
    paragraphs: [
      "If you are under 18, please use Academia only with the permission and supervision of a parent or guardian.",
    ],
  },
  {
    title: "Changes to this policy",
    paragraphs: [
      "We may update this policy. We will change the \"Last updated\" date above and, for important changes, tell you by email or on the site.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains in plain language what personal data Academia LMS collects, why we need it, who we share it with, and what rights you have."
      lastUpdated="October 9, 2026"
      sections={sections}
    />
  );
}
