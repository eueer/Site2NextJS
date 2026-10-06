import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/components/arc/foundation.css";
import "./globals.css";
import { ThemeProvider, themeScript } from "@/components/site/theme-provider";

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
      suppressHydrationWarning
      data-accent="neutral"
      data-theme="dark"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
