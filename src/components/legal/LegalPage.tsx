import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalPageProps {
  title: string;
  intro: string;
  lastUpdated: string;
  sections: LegalSection[];
}

/**
 * Shared layout for the Terms and Privacy pages. Server component: reads the optional
 * support email from the environment so the contact line is always accurate.
 */
export function LegalPage({ title, intro, lastUpdated, sections }: LegalPageProps) {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-rule">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <BrandLogo href="/" variant="dark" size="sm" />
          <Link href="/" className="text-xs font-bold text-[#4A1A45] hover:underline">
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#4A1A45]">Legal</p>
        <h1 className="font-heading mt-1 text-3xl sm:text-4xl font-semibold tracking-tight text-black">{title}</h1>
        <p className="mt-2 text-xs text-neutral-500">Last updated: {lastUpdated}</p>
        <p className="mt-6 text-sm leading-relaxed text-neutral-700">{intro}</p>

        <div className="mt-10 space-y-9">
          {sections.map((section, index) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-lg font-bold text-black">
                {index + 1}. {section.title}
              </h2>
              {section.paragraphs?.map((text) => (
                <p key={text} className="text-sm leading-relaxed text-neutral-700">
                  {text}
                </p>
              ))}
              {section.bullets && (
                <ul className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed text-neutral-700">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 p-4 sm:p-5 rounded-lg bg-[#F7F2F6] border border-rule text-sm text-neutral-700 leading-relaxed">
          Questions about this page? {" "}
          {supportEmail ? (
            <>
              Email us at{" "}
              <a href={`mailto:${supportEmail}`} className="font-semibold text-[#4A1A45] hover:underline">
                {supportEmail}
              </a>
              , or use the contact form on our{" "}
            </>
          ) : (
            <>Use the contact form on our </>
          )}
          <Link href="/" className="font-semibold text-[#4A1A45] hover:underline">
            home page
          </Link>
          .
        </div>

        <nav className="mt-8 flex gap-5 text-xs font-semibold text-neutral-500">
          <Link href="/terms" className="hover:text-[#4A1A45]">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-[#4A1A45]">Privacy Policy</Link>
        </nav>
      </main>
    </div>
  );
}
