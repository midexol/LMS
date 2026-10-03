import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

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
    <html lang="en" className={plusJakarta.variable}>
      <body className="bg-white text-zinc-950 antialiased min-h-screen selection:bg-zinc-900 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
