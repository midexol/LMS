import type { Metadata } from "next";
import "./globals.css";
import { PrivyClientProvider } from "@/components/providers/PrivyClientProvider";

export const metadata: Metadata = {
  title: "Academia LMS - The Premier E-Learning Platform",
  description: "Academia is a modern polytechnic learning management system featuring single course progression, accredited curriculum, and instructor evaluation studio. A product of The Federal Polytechnic, Ado-Ekiti.",
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
        <PrivyClientProvider>
          {children}
        </PrivyClientProvider>
      </body>
    </html>
  );
}
