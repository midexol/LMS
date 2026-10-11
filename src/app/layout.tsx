import type { Metadata } from "next";
import "./globals.css";

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
  return (
    <html lang="en">
      <body className="bg-white text-zinc-950 antialiased min-h-screen selection:bg-zinc-900 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
