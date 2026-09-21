import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Framer2NextJS | Convert Framer Sites to 100% Fidelity Next.js",
  description:
    "Convert any published Framer website into a production-ready Next.js project with 100% fidelity, optimized WebP images, self-hosted fonts, and zero vendor lock-in.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`${GeistSans.className} min-h-screen bg-[#07080d] text-slate-100 antialiased selection:bg-[#FF7300] selection:text-white`}>
        {children}
      </body>
    </html>
  );
}

