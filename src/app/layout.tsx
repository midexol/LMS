import type { Metadata } from "next";
import { headers } from "next/headers";
import { Newsreader, Public_Sans } from "next/font/google";
import "./globals.css";

const headingFont = Newsreader({ subsets: ["latin"], variable: "--font-heading", display: "swap", style: ["normal", "italic"], adjustFontFallback: false });
const bodyFont = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Academia LMS - Learn one course at a time",
  description: "Academia LMS: structured online courses with instant assignment feedback and a completion certificate. Take one course at a time and finish it.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the request's headers makes every page render per request, which the one-time script code needs
  headers();
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="bg-paper text-ink antialiased min-h-screen selection:bg-[#4A1A45] selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
