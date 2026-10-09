import type { Metadata } from "next";
import "./globals.css";
import { PrivyClientProvider } from "@/components/providers/PrivyClientProvider";

export const metadata: Metadata = {
  title: "FEDPOLY ADO LMS - Federal Polytechnic Ado-Ekiti",
  description: "Official Federal Polytechnic Ado-Ekiti Learning Management System featuring single course progression, accredited curriculum, and instructor evaluation studio.",
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
