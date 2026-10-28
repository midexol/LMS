import React from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface AuthShellProps {
  headline: string;
  blurb: string;
  points: string[];
  children: React.ReactNode;
}

/** Shared frame for sign in / sign up: brand panel on large screens, centred card on small ones. */
export function AuthShell({ headline, blurb, points, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-white flex">
      <aside className="hidden lg:flex flex-col justify-between w-[42%] bg-[#2D0F2A] text-white p-12">
        <BrandLogo href="/" variant="light" size="lg" />
        <div className="space-y-6 max-w-md">
          <h2 className="font-bold text-4xl leading-tight">{headline}</h2>
          <p className="text-[#D6BDD4] text-sm leading-relaxed">{blurb}</p>
          <ul className="space-y-3 pt-2">
            {points.map((p) => (
              <li key={p} className="text-xs text-neutral-200 border-l-2 border-[#4A1A45] pl-3">
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-neutral-400 text-xs">&copy; {new Date().getFullYear()} Academia LMS</p>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="lg:hidden mb-6">
          <BrandLogo href="/" variant="dark" size="md" />
        </div>
        <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-lg border border-neutral-200">{children}</div>
      </main>
    </div>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div role="alert" className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
      {message}
    </div>
  );
}

export const authInputClass =
  "w-full px-4 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-sm text-black outline-none focus:border-[#4A1A45] focus:bg-white transition-colors placeholder:text-neutral-400";
export const authLabelClass = "block text-xs font-semibold text-neutral-700 mb-1.5";
export const authButtonClass =
  "w-full py-3 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors";
