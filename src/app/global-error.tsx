"use client";

import React, { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort error page: replaces the whole root layout when the layout itself fails,
 * so it must render its own <html> and <body> and cannot use providers or shared components.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL ERROR]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-white text-zinc-950 antialiased min-h-screen font-sans">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Academia LMS</p>
          <h1 className="font-heading mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            Something went wrong
          </h1>
          <p className="mt-3 max-w-md text-sm sm:text-base text-neutral-500 leading-relaxed">
            The site hit an unexpected problem. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 px-5 sm:px-8 py-3 rounded-md bg-[#4A1A45] hover:bg-[#3B1537] text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            Try again
          </button>
          {error.digest && (
            <p className="mt-8 text-[11px] font-mono text-neutral-400">Reference for support: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
