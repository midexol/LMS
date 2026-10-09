"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/BrandLogo";

/**
 * Shown when a page throws while rendering (for example when the database is briefly unreachable).
 * `reset` re-renders the page, which fixes most temporary failures.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PAGE ERROR]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <BrandLogo href="/" size="md" />

      <p className="mt-12 text-xs font-bold text-neutral-400 uppercase tracking-widest">Something went wrong</p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-3 max-w-md text-sm sm:text-base text-neutral-500 leading-relaxed">
        This is a problem on our side, not yours. Please try again. If it keeps happening, wait a few minutes or
        contact support.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-8 py-3 rounded-full bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider transition-all"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-8 py-3 rounded-full border border-neutral-300 hover:border-[#4A1A45] text-neutral-700 font-bold text-xs uppercase tracking-wider transition-all"
        >
          Back to home
        </Link>
      </div>

      {error.digest && (
        <p className="mt-8 text-[11px] font-mono text-neutral-400">
          Reference for support: {error.digest}
        </p>
      )}
    </div>
  );
}
