import type { LandingPageData } from "@/sanity/lib/queries";
export function getLandingContent(initialData?: LandingPageData | null) {
  const faqItems = [
    {
      q: "Will this work with all sites?",
      a: "Yes! You can clone any website, provided you either own it or are authorized to clone it by the owner. While specially optimized with comment-preservation for Framer React hydration, the engine supports any public website (Webflow, WordPress, static HTML, and more). It crawls all pages, converts raster images to modern WebP with Sharp, downloads web fonts locally, and resolves relative stylesheets and scripts so that your site runs cleanly in Next.js without broken assets.",
    },
    {
      q: "Why does exporting to raw JSX break Framer animations?",
      a: "Framer's animation engine and interactive component state rely heavily on internal React 18 Suspense markers and serialized state payloads. When other tools attempt to decompile this directly into raw JSX templates, those hydration boundaries and comment anchors are destroyed, resulting in broken scroll triggers, failed hover states, and missing transitions. Site2NextJS solves this by preserving comment markers and delivering valid App Router route handlers.",
    },
    {
      q: "How are assets, images, and fonts handled during conversion?",
      a: "All external CDN dependencies are crawled and saved directly to your Next.js project's public/ folder. Images are converted to WebP with Sharp at configurable quality levels (saving up to 70% of bandwidth), and web fonts are downloaded locally with font-display: swap injected into font-face definitions to prevent layout shifts.",
    },
    {
      q: "Can I deploy the converted site to Vercel or Netlify for free?",
      a: "Yes! The generated output is a standard Next.js 14 App Router project. You can run npm run build and deploy directly to Vercel, Netlify, Cloudflare Pages, or AWS Amplify with zero configuration. You no longer need to pay Framer's recurring monthly per-site subscription fees.",
    },
    {
      q: "How does the 1-click GitHub Push work?",
      a: "Provide a GitHub Personal Access Token with repo scope, specify your desired repository name, and Site2NextJS will create the repository via the Octokit GitHub REST API and commit the entire project tree automatically with clean commit history and documentation.",
    },
  ];

  // Dynamic Content with Sanity fallback
  const heroHeading = initialData?.heroHeading || "Convert any website to";
  const heroHeadingHighlight =
    initialData?.heroHeadingHighlight || "production-ready Next.js";
  const heroSubtitle =
    initialData?.heroSubtitle ||
    "Transform Framer, Webflow, or static sites into optimized Next.js App Router codebases with preserved animations and 0 monthly fees.";

  const aboutBadge = initialData?.aboutBadge || "About Site to NextJS";
  const aboutHeading =
    initialData?.aboutHeading ||
    "This is a free tool you can use to convert any site to NextJS. Push right to your git, or download the File.";
  const aboutCards =
    initialData?.aboutCards && initialData.aboutCards.length > 0
      ? initialData.aboutCards
      : [
          {
            _key: "card-parity",
            metric: "100%",
            title: "Animation Parity",
            description:
              "Preserved React Suspense markers, Framer Motion springs, and responsive layouts automatically.",
          },
          {
            _key: "card-payload",
            metric: "70%",
            title: "Payload Reduction",
            description:
              "Sharp WebP image re-encoding and self-hosted local fonts completely eliminate layout shift.",
          },
          {
            _key: "card-fees",
            metric: "$0",
            title: "Monthly CMS Fees",
            description:
              "Eliminate recurring per-site subscription fees by deploying free to Vercel, Netlify, or Cloudflare.",
          },
        ];

  const architectureBadge =
    initialData?.architectureBadge || "Architecture & Runtime";
  const architectureHeading =
    initialData?.architectureHeading || "How Site2NextJS Works";
  const architectureSubtitle =
    initialData?.architectureSubtitle ||
    "The reverse-engineered secret behind 100% animation, hover, and interaction fidelity.";
  const architectureCards =
    initialData?.architectureCards && initialData.architectureCards.length > 0
      ? initialData.architectureCards
      : [
          {
            _key: "step-01",
            step: "01",
            title: "Preserved Comment Markers",
            description:
              "Extracts internal React 18 Suspense markers (<!--$-->) and serialized hydration chunks directly from the live DOM to keep component hydration 100% intact.",
          },
          {
            _key: "step-02",
            step: "02",
            title: "WebP & Font Optimization",
            description:
              "Auto-crawls external CDN images, encodes them to next-gen WebP with Sharp, and downloads web fonts locally with font-display: swap to prevent layout shifts.",
          },
          {
            _key: "step-03",
            step: "03",
            title: "Zero Monthly Hosting Fees",
            description:
              "Exports a standalone Next.js 14 App Router codebase you can host on free Vercel or Netlify tiers, eliminating costly recurring Framer subscription fees forever.",
          },
        ];

  const faqBadge = initialData?.faqBadge || "FAQ's";
  const faqHeading =
    initialData?.faqHeading || "Helpful answers for your site conversion needs";
  const faqSubtitle =
    initialData?.faqSubtitle ||
    "Everything you need to know about exporting, animation parity, and hosting.";
  const faqList =
    initialData?.faqItems && initialData.faqItems.length > 0
      ? initialData.faqItems.map((item, idx) => ({
          q: idx === 0 ? "Will this work with all sites?" : item.question,
          a: item.answer,
        }))
      : faqItems;

  const footerTagline =
    initialData?.footerTagline ||
    "High-quality Framer template crafted for AI automation agencies to launch fast and scale effortlessly";
  const copyrightText = initialData?.copyrightText || "© All right reserved";
  const authorName = initialData?.authorName || "Suraj";
  const authorUrl = initialData?.authorUrl || "https://x.com/Suraj_kaleux";

  return {
    heroHeading,
    heroHeadingHighlight,
    heroSubtitle,
    aboutBadge,
    aboutHeading,
    aboutCards,
    architectureBadge,
    architectureHeading,
    architectureSubtitle,
    architectureCards,
    faqBadge,
    faqHeading,
    faqSubtitle,
    faqList,
    footerTagline,
    copyrightText,
    authorName,
    authorUrl,
  };
}
export type LandingContent = ReturnType<typeof getLandingContent>;
