import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { PASS_MARK_PERCENT } from "@/lib/grading";

export const metadata: Metadata = {
  title: "Terms of Service - Academia LMS",
  description: "The rules for using Academia LMS: accounts, payments, assignments, certificates and conduct.",
};

const sections: LegalSection[] = [
  {
    title: "Who these terms apply to",
    paragraphs: [
      "These Terms of Service (the \"Terms\") govern your use of Academia LMS (\"Academia\", \"we\", \"us\"), an online learning platform where students enrol in paid courses, complete lessons and assignments, and receive feedback and certificates.",
      "By creating an account, signing in, or paying for a course, you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the platform.",
    ],
  },
  {
    title: "Your account",
    bullets: [
      "Give accurate information when you register and keep it up to date.",
      "Keep your password secret. You are responsible for activity on your account, so tell us straight away if you think someone else has access to it.",
      "One account per person. Do not share your account or your login with others.",
      "You must verify your email address before you can pay for a course.",
      "Public registration creates student accounts. Tutor and administrator accounts are set up by Academia.",
      "We may suspend or close an account that breaks these Terms.",
    ],
  },
  {
    title: "Courses and the one-active-course rule",
    paragraphs: [
      "Courses on Academia are paid. When your payment is confirmed you receive access to that course's lessons, assignments and discussion area.",
      "You can have only one active course at a time. To enrol in a new course, you must first complete your current course or drop it. Dropping a course releases this limit; it does not by itself entitle you to a refund.",
    ],
  },
  {
    title: "Payments and refunds",
    bullets: [
      "Prices are shown in Nigerian Naira (NGN) before you pay.",
      "Payments are processed by Paystack. We do not see or store your card or bank details.",
      "Your enrolment starts once Paystack confirms your payment. Keep your payment reference until you have access to the course.",
      "If your payment succeeds but we cannot enrol you because you already have an active course, contact us with your payment reference. We will arrange a refund or a transfer to another course.",
      "Apart from that case, and where the law requires otherwise, payments are not refundable once you have been given access to course content. If you believe you were charged in error, contact us and we will look into it.",
    ],
  },
  {
    title: "Course content and licence",
    paragraphs: [
      "When you enrol, we give you a personal, non-exclusive, non-transferable licence to view the course materials for your own learning. The materials remain the property of Academia and the tutors who created them.",
    ],
    bullets: [
      "Do not copy, record, download for sharing, resell, publish or redistribute lessons, videos, files, quizzes or rubrics.",
      "Do not share links to course files or videos. Links are created for your account and expire after a short time.",
    ],
  },
  {
    title: "Assignments, automated grading and certificates",
    paragraphs: [
      "Assignments are scored automatically by an artificial-intelligence system, which compares your answer with the tutor's reference answer and grading rubric and writes feedback. Automated scoring can be imperfect.",
    ],
    bullets: [
      "Tutors and administrators can review and override a score. Where a score is overridden, the overridden score is the one that counts.",
      "You may resubmit an assignment. A new submission replaces your previous one for that assignment.",
      `To complete a course you must submit every assignment and reach an average score of at least ${PASS_MARK_PERCENT}% across all assignments.`,
      "When you complete a course you receive a completion certificate reference. A certificate confirms that you completed a course on Academia. It is not a university degree or a professional licence unless the course page clearly says so.",
    ],
  },
  {
    title: "Academic integrity and acceptable use",
    paragraphs: ["You agree to do your own work and to treat other people on the platform with respect. You must not:"],
    bullets: [
      "cheat, share answers, or submit work that is not your own;",
      "impersonate another person;",
      "try to manipulate the automated grader, for example by writing instructions to the grader inside an answer;",
      "post abusive, hateful, harassing, misleading or unlawful content in discussions or submissions;",
      "try to break, probe, overload or gain unauthorised access to the platform or other people's accounts;",
      "use bots, scrapers or other automated tools against the platform.",
    ],
  },
  {
    title: "Content you submit",
    paragraphs: [
      "You keep ownership of your assignment answers, discussion posts and profile details. You give Academia a licence to store them, to show them to the tutors, administrators and other course members who need to see them, and to process them (including by sending answers to an AI service for grading) so that we can run the platform.",
    ],
  },
  {
    title: "For tutors",
    paragraphs: [
      "If you create courses, you are responsible for the content you upload. You must have the right to use it, and it must be accurate and lawful. We may remove content that breaks these Terms or the law.",
    ],
  },
  {
    title: "Availability and changes to the service",
    paragraphs: [
      "We work to keep Academia available, but we cannot promise it will always be uninterrupted or error-free. We may change, add or remove features and courses. A price change applies only to purchases made after the change.",
    ],
  },
  {
    title: "Our responsibility to you",
    paragraphs: [
      "The platform is provided \"as is\". To the fullest extent the law allows, Academia is not liable for indirect or consequential losses, such as lost opportunities or lost income, and our total liability to you for any claim is limited to the amount you paid for the course the claim relates to.",
      "Nothing in these Terms limits any liability or any consumer right that cannot be limited by law.",
    ],
  },
  {
    title: "Ending your use of Academia",
    paragraphs: [
      "You can stop using Academia at any time. To have your account and data deleted, contact us (see the Privacy Policy). We may suspend or end your access if you break these Terms. Sections that by their nature should continue after your access ends, such as content licences and limits on liability, will continue.",
    ],
  },
  {
    title: "Governing law",
    paragraphs: ["These Terms are governed by the laws of the Federal Republic of Nigeria, and the courts of Nigeria can hear disputes about them."],
  },
  {
    title: "Changes to these Terms",
    paragraphs: [
      "We may update these Terms. We will change the \"Last updated\" date above and, for important changes, tell you by email or on the site. If you keep using Academia after a change, you accept the updated Terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="Please read these terms carefully. They explain how Academia LMS works, what we expect from you, and what you can expect from us."
      lastUpdated="October 9, 2026"
      sections={sections}
    />
  );
}
