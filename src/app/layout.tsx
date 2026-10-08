import type { Metadata } from "next";
import "./globals.css";
import { PrivyClientProvider } from "@/components/providers/PrivyClientProvider";

export const metadata: Metadata = {
  title: "Academia LMS - AI Graded Platform",
  description: "Modern LMS platform with single course restriction, AI auto-grading, and tutor studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-zinc-950 antialiased min-h-screen selection:bg-zinc-900 selection:text-white font-sans">
        <PrivyClientProvider>
          {children}
        </PrivyClientProvider>
      </body>
    </html>
  );
}
