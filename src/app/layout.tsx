import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Site2NextJS | Convert Any Site to 100% Fidelity Next.js",
  description:
    "Convert any Framer, Webflow, or public website into a production-ready Next.js project with 100% fidelity, optimized WebP images, self-hosted fonts, and zero vendor lock-in.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${figtree.variable} ${GeistPixelSquare.variable}`}
    >
      <body
        className={`${figtree.className} min-h-screen bg-[#000000] text-slate-100 antialiased selection:bg-[#F65023] selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
