"use client";

import React, { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Globe02Icon,
  ArrowRight01Icon,
  AiSparklesIcon,
  Settings02Icon,
  RefreshIcon,
  CheckmarkCircle02Icon,
  Tick02Icon,
  AlertCircleIcon,
  Download01Icon,
  GithubIcon,
  ComputerIcon,
  Tablet01Icon,
  SmartPhone01Icon,
  Layers01Icon,
  FlashIcon,
  SecurityCheckIcon,
  DashboardSpeed01Icon,
  LockIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Copy01Icon,
  CodeIcon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import { SiteLogo } from "@/components/SiteLogo";
import { HeroBackground } from "@/components/HeroBackground";

interface StatItem {
  label: string;
  before: number;
  after: number;
  unit: "count" | "bytes" | "ms";
}

interface PageInfo {
  route: string;
  url: string;
}

interface ConversionData {
  jobId: string;
  sourceUrl: string;
  platform?: string;
  pages: PageInfo[];
  stats: StatItem[];
  notes: string[];
  logs: string[];
  fileCount: number;
  previewHtml?: string;
  zipBase64?: string;
  files?: Array<{ path: string; content?: string; binaryBase64?: string }>;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState("15");
  const [imageQuality, setImageQuality] = useState("78");
  const [showOptions, setShowOptions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMessage, setStepMessage] = useState("");
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);

  // Preview device mode
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // GitHub Modal state
  const [showGitModal, setShowGitModal] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [repoName, setRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [gitPushing, setGitPushing] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitSuccessUrl, setGitSuccessUrl] = useState<string | null>(null);

  // Copied CLI command helper
  const [copied, setCopied] = useState(false);

  // Active accordion index
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const steps = [
    "Connecting & detecting site platform",
    "Discovering all routes & sitemaps",
    "Harvesting media, images & fonts",
    "Re-encoding images to modern WebP",
    "Self-hosting fonts & resolving relative assets",
    "Generating 100% fidelity Next.js App Router code",
  ];

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const savedJob = localStorage.getItem("framer2nextjs_active_job");
      if (savedJob) {
        const parsed = JSON.parse(savedJob);
        if (parsed?.jobId) {
          setConversionData(parsed);
          if (parsed.sourceUrl) setUrl(parsed.sourceUrl);
          try {
            const host = new URL(parsed.sourceUrl).hostname.replace(/^www\./, "").replace(/\./g, "-");
            setRepoName(`${host}-nextjs`);
          } catch {
            setRepoName("my-site-nextjs");
          }
        }
      }
      const savedToken = localStorage.getItem("framer2nextjs_github_token");
      if (savedToken) {
        setGithubToken(savedToken);
      }
    } catch {}
  }, []);

  const handleReset = () => {
    setConversionData(null);
    setUrl("");
    setError(null);
    setGitSuccessUrl(null);
    try {
      localStorage.removeItem("framer2nextjs_active_job");
    } catch {}
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setConversionData(null);
    setCurrentStep(1);
    setStepMessage(steps[0]);

    // Simulated progress tick while backend runs
    let step = 1;
    const interval = setInterval(() => {
      if (step < 5) {
        step++;
        setCurrentStep(step);
        setStepMessage(steps[step - 1]);
      }
    }, 4500);

    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          maxPages: parseInt(maxPages, 10),
          imageQuality: parseInt(imageQuality, 10),
        }),
      });

      clearInterval(interval);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to convert website.");
      }

      setCurrentStep(6);
      setStepMessage(steps[5]);
      setConversionData(data);

      try {
        localStorage.setItem("framer2nextjs_active_job", JSON.stringify(data));
      } catch {}

      // Prepopulate repo name suggestion
      try {
        const host = new URL(url.trim()).hostname.replace(/^www\./, "").replace(/\./g, "-");
        setRepoName(`${host}-nextjs`);
      } catch {
        setRepoName("my-site-nextjs");
      }
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!conversionData) return;
    if (conversionData.zipBase64) {
      try {
        const byteCharacters = atob(conversionData.zipBase64);
        const byteNumbers = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([byteNumbers], { type: "application/zip" });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        const host = (() => {
          try {
            return new URL(conversionData.sourceUrl).hostname.replace(/^www\./, "").replace(/\./g, "-");
          } catch {
            return "site";
          }
        })();
        a.download = `${host}-nextjs.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      } catch (e) {
        console.warn("Client blob download fallback:", e);
      }
    }
    window.location.href = `/api/download/${conversionData.jobId}`;
  };

  const handlePushToGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversionData || !githubToken.trim() || !repoName.trim()) return;

    setGitPushing(true);
    setGitError(null);
    setGitSuccessUrl(null);

    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: conversionData.jobId,
          token: githubToken.trim(),
          repoName: repoName.trim(),
          isPrivate,
          files: conversionData.files,
          sourceUrl: conversionData.sourceUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          localStorage.removeItem("framer2nextjs_active_job");
          throw new Error("Job session expired on the server. Please reconvert your site below to refresh files and push.");
        }
        if (data.error && data.error.includes("Bad credentials")) {
          throw new Error("GitHub token is invalid or lacks the required 'repo' scope. Please verify your token.");
        }
        throw new Error(data.error || "Failed to push to GitHub.");
      }

      setGitSuccessUrl(data.repoUrl);
      try {
        localStorage.setItem("framer2nextjs_github_token", githubToken.trim());
      } catch {}
    } catch (err: unknown) {
      setGitError(err instanceof Error ? err.message : "Error pushing to GitHub.");
    } finally {
      setGitPushing(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const faqItems = [
    {
      q: "Will this work for non-Framer sites like Webflow, WordPress, or plain HTML?",
      a: "Yes! While specially optimized with comment-preservation for Framer React hydration, the engine supports any public website. It crawls all pages, converts raster images to modern WebP with Sharp, downloads web fonts locally, and resolves relative stylesheets and scripts so that any website runs cleanly in Next.js without broken assets.",
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

  return (
    <div className="relative min-h-screen bg-[#000000] text-slate-100 flex flex-col font-sans selection:bg-[#F65023] selection:text-white">
      {/* Dynamic Ambient Hero Background (Shader grid + Particle Mesh + Orange Glows) */}
      <HeroBackground />

      {/* Floating Navigation Header (Sleek floating pill with uniform padding on all sides) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[1200px] pointer-events-auto">
        <header className="squircle-pill p-3.5 sm:p-4 bg-white/[0.08] backdrop-blur-[30px] border border-white/10 shadow-2xl flex items-center justify-between transition-all">
          {/* Logo Section */}
          <a href="#" className="flex items-center gap-1.5 cursor-pointer select-none">
            <SiteLogo className="w-7 h-7 sm:w-[30px] sm:h-[30px]" />
            <span className="font-sans font-medium text-lg sm:text-xl tracking-tight text-white">
              Site2NextJS
            </span>
          </a>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 sm:gap-7">
            <nav className="hidden md:flex items-center gap-5 text-sm text-white/60 font-medium">
              <a href="#how-it-works" className="hover:text-white transition-colors">
                How it works
              </a>
              <a href="#about" className="hover:text-white transition-colors">
                About
              </a>
              <a href="#architecture" className="hover:text-white transition-colors">
                Architecture
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                FAQ
              </a>
              <a
                href="https://github.com/eueer/Site2NextJS"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={GithubIcon} size={15} />
                <span>GitHub</span>
              </a>
            </nav>

            {/* CTA Button */}
            <a
              href="#converter"
              className="squircle-pill inline-flex items-center gap-1.5 px-4 sm:px-[18px] py-1.5 sm:py-2 text-xs sm:text-sm font-medium bg-[#F65023] hover:bg-[#e04318] text-white shadow-lg shadow-[#F65023]/25 transition-all"
            >
              <span>Convert Site</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            </a>
          </div>
        </header>
      </div>

      {/* Main Container */}
      <main className="relative z-10 flex-1 mx-auto max-w-6xl px-6 pt-32 sm:pt-36 pb-28 w-full">
        {/* Hero Section */}
        <section id="converter" className="text-center max-w-3xl mx-auto mb-10">
          {/* H1 Heading ONLY uses Geist Pixel */}
          <h1 className="font-pixel text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight leading-[1.12] text-white">
            Convert any website to{" "}
            <span className="text-[#F65023]">
              production-ready Next.js
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed font-sans">
            Transform Framer, Webflow, or static sites into optimized Next.js App Router codebases
            with preserved animations and 0 monthly fees.
          </p>
        </section>

        {/* Framer-exact Prompt Box Container (framer-dw6nb0 style) */}
        <div className="max-w-[550px] mx-auto">
          <form
            onSubmit={handleConvert}
            className="p-3 sm:p-3.5 squircle-2xl bg-white/[0.08] backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col justify-between gap-14 sm:gap-20 transition-all focus-within:border-[#F65023]/60 focus-within:ring-2 focus-within:ring-[#F65023]/20"
          >
            {/* Top Prompt Input Area */}
            <div className="flex items-start gap-2.5 pt-1 px-1">
              <HugeiconsIcon icon={Globe02Icon} size={17} className="text-white/40 shrink-0 mt-1" />
              <textarea
                rows={2}
                placeholder="Enter Site URL (e.g. https://portfolio.framer.website or https://example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleConvert(e);
                  }
                }}
                disabled={loading}
                className="w-full bg-transparent border-0 p-0 text-white placeholder:text-white/40 text-sm font-sans resize-none focus:outline-none focus:ring-0 leading-relaxed"
              />
            </div>

            {/* Bottom Action Menu Row */}
            <div className="flex items-center justify-between pt-1">
              {/* Left: Advanced Settings Pill Toggle */}
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="squircle-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:text-white bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 transition-all font-sans"
              >
                <HugeiconsIcon icon={Settings02Icon} size={13} className="text-white" />
                <span>Advanced Settings</span>
                <HugeiconsIcon icon={showOptions ? ArrowUp01Icon : ArrowDown01Icon} size={11} className="text-white/60" />
              </button>

              {/* Right: Convert to NextJS Pill Button */}
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="squircle-pill inline-flex items-center gap-1.5 h-[28px] px-3.5 bg-[#F65023] hover:bg-[#e04318] text-white text-xs font-semibold shadow-lg shadow-[#F65023]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
              >
                {loading ? (
                  <>
                    <HugeiconsIcon icon={RefreshIcon} size={13} className="animate-spin text-white" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <span>Convert to NextJS</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="text-white" />
                  </>
                )}
              </button>
            </div>

            {/* Expandable Advanced Options Panel */}
            {showOptions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10 text-xs text-white/80">
                <div>
                  <label className="block mb-1.5 font-medium text-white/60">Max Pages to Crawl</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={maxPages}
                    onChange={(e) => setMaxPages(e.target.value)}
                    className="w-full squircle-md bg-black/60 border border-white/15 px-3 py-2 text-white focus:border-[#F65023] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-white/60">WebP Image Quality (1-100)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={imageQuality}
                    onChange={(e) => setImageQuality(e.target.value)}
                    className="w-full squircle-md bg-black/60 border border-white/15 px-3 py-2 text-white focus:border-[#F65023] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Sub-bullets / pills under input (Framer framer-1493hyp style) */}
          <div className="flex flex-wrap items-center justify-center gap-5 mt-4 text-xs text-white/70">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-[#F65023]" />
              <span>Works with any site</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-[#F65023]" />
              <span>100% animation parity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-[#F65023]" />
              <span>Zero lock-in</span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-6 p-4 squircle-xl bg-red-950/40 border border-red-900/60 text-red-200 flex items-start gap-3">
              <HugeiconsIcon icon={AlertCircleIcon} size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300 text-sm">Conversion Error</p>
                <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Live Conversion Progress Terminal */}
        {loading && (
          <div className="max-w-2xl mx-auto mt-10 p-6 squircle-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F65023] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F65023]"></span>
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  Step {currentStep} of 6: {stepMessage}
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-[#F65023]">{Math.round((currentStep / 6) * 100)}%</span>
            </div>

            {/* Custom Squircle Progress Bar */}
            <div className="w-full h-2 bg-black/60 squircle-pill overflow-hidden mb-5 border border-white/5">
              <div
                className="h-full bg-[#F65023] squircle-pill transition-all duration-500 ease-out"
                style={{ width: `${Math.round((currentStep / 6) * 100)}%` }}
              />
            </div>

            {/* Step checklist */}
            <div className="space-y-2 text-xs">
              {steps.map((text, idx) => {
                const stepNum = idx + 1;
                const isDone = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;
                return (
                  <div
                    key={text}
                    className={`flex items-center gap-2.5 py-1 transition-colors ${
                      isDone
                        ? "text-emerald-400"
                        : isCurrent
                        ? "text-[#F65023] font-medium animate-pulse-subtle"
                        : "text-white/40"
                    }`}
                  >
                    {isDone ? (
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} className="text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <HugeiconsIcon icon={RefreshIcon} size={15} className="text-[#F65023] animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 squircle-pill border border-white/20 shrink-0" />
                    )}
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Successful Conversion Results Panel */}
        {conversionData && !loading && (
          <div className="mt-14 space-y-8">
            {/* Top Status & Main Actions */}
            <div className="p-8 squircle-3xl bg-[#1a1a1a] border border-white/10 shadow-2xl backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#F65023]/10 rounded-full blur-[90px] pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 squircle-pill text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                    <span>{conversionData.platform ? `${conversionData.platform} • ` : ""}Conversion Ready • 100% Parity</span>
                  </div>
                  {/* H2 heading using semibold Figtree */}
                  <h2 className="font-sans font-semibold text-2xl sm:text-3xl text-white tracking-tight">
                    Successfully Generated Next.js Code
                  </h2>
                  <p className="text-sm text-white/60 mt-1">
                    Source: <span className="text-white/90 font-mono text-xs">{conversionData.sourceUrl}</span> •{" "}
                    <span className="text-[#F65023] font-medium">{conversionData.fileCount}</span> total project files generated
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleDownload}
                    className="squircle-pill inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F65023] hover:bg-[#e04318] text-white text-sm font-semibold shadow-lg shadow-[#F65023]/25 transition-all"
                  >
                    <HugeiconsIcon icon={Download01Icon} size={16} />
                    <span>Download Project (.ZIP)</span>
                  </button>

                  <button
                    onClick={() => setShowGitModal(true)}
                    className="squircle-pill inline-flex items-center justify-center gap-2 px-5 py-3 bg-black/60 border border-white/15 hover:border-[#F65023]/60 text-white text-sm font-medium transition-all"
                  >
                    <HugeiconsIcon icon={GithubIcon} size={16} />
                    <span>Push to GitHub</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="squircle-pill inline-flex items-center justify-center gap-1.5 px-4 py-3 text-white/60 hover:text-white text-xs transition-colors"
                  >
                    <HugeiconsIcon icon={RefreshIcon} size={13} />
                    <span>Convert Another</span>
                  </button>
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-5 squircle-2xl bg-black/50 border border-white/5 relative overflow-hidden">
                  <p className="text-xs text-white/50">Pages Converted</p>
                  <p className="font-sans font-semibold text-3xl text-white mt-1">{conversionData.pages.length}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">Statically prerendered</p>
                </div>

                {conversionData.stats.find((s) => s.label === "Image payload") && (
                  <div className="p-5 squircle-2xl bg-black/50 border border-white/5 relative overflow-hidden">
                    <p className="text-xs text-white/50">Image Payload</p>
                    <p className="font-sans font-semibold text-3xl text-[#F65023] mt-1">
                      {formatBytes(
                        conversionData.stats.find((s) => s.label === "Image payload")?.after || 0
                      )}
                    </p>
                    <p className="text-[11px] text-orange-300 mt-1">Re-encoded WebP</p>
                  </div>
                )}

                <div className="p-5 squircle-2xl bg-black/50 border border-white/5 relative overflow-hidden">
                  <p className="text-xs text-white/50">Animations & State</p>
                  <p className="font-sans font-semibold text-3xl text-emerald-400 mt-1">100%</p>
                  <p className="text-[11px] text-white/50 mt-1">Preserved hydration</p>
                </div>

                <div className="p-5 squircle-2xl bg-black/50 border border-white/5 relative overflow-hidden">
                  <p className="text-xs text-white/50">Monthly CMS Lock-in</p>
                  <p className="font-sans font-semibold text-3xl text-[#F65023] mt-1">$0 / mo</p>
                  <p className="text-[11px] text-white/50 mt-1">Free Vercel / Netlify</p>
                </div>
              </div>

              {/* Optimization Highlights */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-3">
                  Applied Optimizations
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/80">
                  {conversionData.notes.map((note) => (
                    <div key={note} className="flex items-center gap-2">
                      <HugeiconsIcon icon={Tick02Icon} size={14} className="text-[#F65023] shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="p-6 squircle-3xl bg-[#1a1a1a] border border-white/10 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="font-sans font-semibold text-lg sm:text-xl text-white flex items-center gap-2">
                    <HugeiconsIcon icon={ComputerIcon} size={20} className="text-[#F65023]" />
                    <span>Live Preview of Converted Next.js Site</span>
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Testing local route handler rendering with all self-hosted assets & animations intact.
                  </p>
                </div>

                {/* Device Selector Squircle Pills */}
                <div className="flex items-center gap-1 bg-black/60 p-1 squircle-pill border border-white/10 self-start sm:self-auto">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`squircle-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                      previewDevice === "desktop"
                        ? "bg-[#F65023] text-white shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <HugeiconsIcon icon={ComputerIcon} size={14} />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice("tablet")}
                    className={`squircle-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                      previewDevice === "tablet"
                        ? "bg-[#F65023] text-white shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <HugeiconsIcon icon={Tablet01Icon} size={14} />
                    <span>Tablet</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`squircle-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                      previewDevice === "mobile"
                        ? "bg-[#F65023] text-white shadow-sm"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    <HugeiconsIcon icon={SmartPhone01Icon} size={14} />
                    <span>Mobile</span>
                  </button>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="flex justify-center bg-black/60 p-4 sm:p-6 squircle-2xl border border-white/5 overflow-hidden">
                <div
                  className="bg-white squircle-xl overflow-hidden shadow-2xl transition-all duration-300 border border-neutral-800"
                  style={{
                    width:
                      previewDevice === "desktop"
                        ? "100%"
                        : previewDevice === "tablet"
                        ? "768px"
                        : "375px",
                    height: "650px",
                  }}
                >
                  <iframe
                    srcDoc={conversionData.previewHtml}
                    src={`/api/preview/${conversionData.jobId}`}
                    title="Converted Site Preview"
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </div>
            </div>

            {/* Converted Pages Outline & Quick Start */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pages Column */}
              <div className="p-6 squircle-2xl bg-[#1a1a1a] border border-white/10">
                <h3 className="font-sans font-semibold text-sm text-white mb-3 flex items-center gap-2">
                  <HugeiconsIcon icon={Layers01Icon} size={16} className="text-[#F65023]" />
                  <span>Converted Routes ({conversionData.pages.length})</span>
                </h3>
                <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-2">
                  {conversionData.pages.map((p) => (
                    <li
                      key={p.route}
                      className="px-3 py-2 squircle-md bg-black/50 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-orange-300">{p.route}</span>
                      <span className="text-white/40 font-mono text-[11px]">app{p.route === "/" ? "" : p.route}/route.ts</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CLI Run instructions */}
              <div className="lg:col-span-2 p-6 squircle-2xl bg-[#1a1a1a] border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-sans font-semibold text-sm text-white flex items-center gap-2">
                    <HugeiconsIcon icon={CodeIcon} size={16} className="text-[#F65023]" />
                    <span>Run Locally in 3 Steps</span>
                  </h3>
                  <button
                    onClick={() => copyCommand("npm install && npm run dev")}
                    className="squircle-pill px-3 py-1 bg-black/40 border border-white/10 text-xs text-white/70 hover:text-[#F65023] flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <HugeiconsIcon icon={Tick02Icon} size={13} className="text-emerald-400" /> : <HugeiconsIcon icon={Copy01Icon} size={13} />}
                    <span>{copied ? "Copied" : "Copy commands"}</span>
                  </button>
                </div>

                <div className="bg-black/70 p-4 squircle-xl border border-white/5 font-mono text-xs text-slate-300 space-y-2">
                  <p className="text-white/40"># 1. Unzip and enter the project folder</p>
                  <p className="text-[#F65023]">cd my-site-nextjs</p>
                  <p className="text-white/40 mt-2"># 2. Install dependencies & run development server</p>
                  <p className="text-[#F65023]">npm install && npm run dev</p>
                  <p className="text-white/40 mt-2"># 3. Production build (ready for Vercel/Netlify)</p>
                  <p className="text-emerald-400">npm run build && npm start</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GitHub Push Modal */}
        {showGitModal && conversionData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-lg p-7 squircle-3xl bg-[#1a1a1a] border border-white/15 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 squircle-md bg-black/60 flex items-center justify-center text-[#F65023] border border-white/10">
                    <HugeiconsIcon icon={GithubIcon} size={18} />
                  </div>
                  <h3 className="font-sans font-semibold text-lg text-white">Push Code to GitHub</h3>
                </div>
                <button
                  onClick={() => setShowGitModal(false)}
                  className="text-white/60 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              {gitSuccessUrl ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 squircle-pill bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} />
                  </div>
                  <h4 className="font-sans font-semibold text-xl text-white">Repository Created!</h4>
                  <p className="text-sm text-white/60">
                    All converted Next.js files and assets have been successfully pushed to your GitHub account.
                  </p>
                  <a
                    href={gitSuccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="squircle-pill inline-flex items-center gap-2 px-6 py-3 bg-[#F65023] hover:bg-[#e04318] text-white text-sm font-semibold shadow-lg shadow-[#F65023]/25 transition-all"
                  >
                    <span>Open in GitHub</span>
                    <HugeiconsIcon icon={LinkSquare01Icon} size={15} />
                  </a>
                </div>
              ) : (
                <form onSubmit={handlePushToGithub} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1.5">
                      GitHub Personal Access Token
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      value={githubToken}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGithubToken(val);
                        try {
                          localStorage.setItem("framer2nextjs_github_token", val.trim());
                        } catch {}
                      }}
                      className="w-full bg-black/60 border border-white/10 squircle-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-white/30 focus:border-[#F65023] focus:outline-none"
                    />
                    <p className="text-[11px] text-white/50 mt-1">
                      Needs <code>repo</code> scope.{" "}
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo&description=Site2NextJS"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F65023] underline hover:text-orange-400"
                      >
                        Generate token on GitHub ↗
                      </a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1.5">
                      Repository Name
                    </label>
                    <input
                      type="text"
                      required
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 squircle-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-white/30 focus:border-[#F65023] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="rounded bg-black border-white/20 text-[#F65023] focus:ring-[#F65023] accent-[#F65023]"
                    />
                    <label htmlFor="isPrivate" className="text-xs text-white/80 cursor-pointer">
                      Make repository private
                    </label>
                  </div>

                  {gitError && (
                    <div className="p-3.5 squircle-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 space-y-2">
                      <p>{gitError}</p>
                      {gitError.toLowerCase().includes("expired") && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowGitModal(false);
                            handleReset();
                          }}
                          className="squircle-pill px-3 py-1 bg-[#F65023] hover:bg-[#e04318] text-white text-xs font-medium"
                        >
                          <HugeiconsIcon icon={RefreshIcon} size={12} className="inline mr-1" />
                          <span>Start Fresh Conversion</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowGitModal(false)}
                      className="squircle-pill px-4 py-2 text-xs text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={gitPushing || !githubToken.trim() || !repoName.trim()}
                      className="squircle-pill px-5 py-2.5 bg-[#F65023] hover:bg-[#e04318] text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-[#F65023]/25 disabled:opacity-50"
                    >
                      {gitPushing ? (
                        <>
                          <HugeiconsIcon icon={RefreshIcon} size={14} className="animate-spin" />
                          <span>Pushing to GitHub...</span>
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={GithubIcon} size={15} />
                          <span>Create & Push Repo</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* About / Stats Section (1:1 Framer Parity) */}
        <section id="about" className="py-[72px]">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 squircle-pill bg-white/[0.08] border border-white/10 text-xs font-medium text-white/80 mb-4 backdrop-blur-md">
              <HugeiconsIcon icon={AiSparklesIcon} size={14} className="text-[#F65023]" />
              <span>About Site to NextJS</span>
            </div>
            <h2 className="font-sans font-medium text-2xl sm:text-[30px] text-white/75 tracking-tight text-center max-w-[600px] mx-auto leading-[1.4]">
              This is a free tool you can use to convert any site to NextJS. Push right to your git, or download the File.
            </h2>
          </div>

          {/* 3 Stats Cards for Site2NextJS (Fill width; styled with Framer 1:1 notch & inverted fillets) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Card 1: Animation Parity */}
            <div className="relative w-full h-[248px] bg-[#1a1a1a] rounded-[24px] squircle-3xl overflow-hidden flex flex-col justify-end items-start group hover:border-[#F65023]/30 transition-all">
              {/* Signature Framer Top-Left Cutout Notch (48x48 black with 18px radius) */}
              <div className="absolute top-0 left-0 w-[48px] h-[48px] bg-black rounded-br-[18px] flex items-center justify-center z-10">
                <HugeiconsIcon icon={FlashIcon} size={20} className="text-[#F65023]" />

                {/* Bottom Inverted Fillet (Seamless curve into card edge) */}
                <div className="absolute -bottom-[24px] left-0 w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>

                {/* Right Inverted Fillet (Seamless curve into top edge) */}
                <div className="absolute top-0 -right-[24px] w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>
              </div>

              {/* Card Bottom Content */}
              <div className="p-5 flex flex-col gap-3.5 w-full z-0">
                <div className="flex flex-col gap-0.5">
                  <div className="font-sans font-medium text-[32px] text-white leading-none tracking-tight">
                    100%
                  </div>
                  <div className="font-sans font-medium text-sm text-white">
                    Animation Parity
                  </div>
                </div>
                <div className="h-[1px] w-full bg-white/10" />
                <p className="font-sans text-[13px] text-white/60 leading-snug">
                  Preserved React Suspense markers, Framer Motion springs, and responsive layouts automatically.
                </p>
              </div>
            </div>

            {/* Card 2: Payload Reduction */}
            <div className="relative w-full h-[248px] bg-[#1a1a1a] rounded-[24px] squircle-3xl overflow-hidden flex flex-col justify-end items-start group hover:border-[#F65023]/30 transition-all">
              {/* Signature Framer Top-Left Cutout Notch (48x48 black with 18px radius) */}
              <div className="absolute top-0 left-0 w-[48px] h-[48px] bg-black rounded-br-[18px] flex items-center justify-center z-10">
                <HugeiconsIcon icon={DashboardSpeed01Icon} size={20} className="text-[#F65023]" />

                {/* Bottom Inverted Fillet (Seamless curve into card edge) */}
                <div className="absolute -bottom-[24px] left-0 w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>

                {/* Right Inverted Fillet (Seamless curve into top edge) */}
                <div className="absolute top-0 -right-[24px] w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>
              </div>

              {/* Card Bottom Content */}
              <div className="p-5 flex flex-col gap-3.5 w-full z-0">
                <div className="flex flex-col gap-0.5">
                  <div className="font-sans font-medium text-[32px] text-white leading-none tracking-tight">
                    70%
                  </div>
                  <div className="font-sans font-medium text-sm text-white">
                    Payload Reduction
                  </div>
                </div>
                <div className="h-[1px] w-full bg-white/10" />
                <p className="font-sans text-[13px] text-white/60 leading-snug">
                  Sharp WebP image re-encoding and self-hosted local fonts completely eliminate layout shift.
                </p>
              </div>
            </div>

            {/* Card 3: Monthly CMS Fees */}
            <div className="relative w-full h-[248px] bg-[#1a1a1a] rounded-[24px] squircle-3xl overflow-hidden flex flex-col justify-end items-start group hover:border-[#F65023]/30 transition-all">
              {/* Signature Framer Top-Left Cutout Notch (48x48 black with 18px radius) */}
              <div className="absolute top-0 left-0 w-[48px] h-[48px] bg-black rounded-br-[18px] flex items-center justify-center z-10">
                <HugeiconsIcon icon={LockIcon} size={20} className="text-[#F65023]" />

                {/* Bottom Inverted Fillet (Seamless curve into card edge) */}
                <div className="absolute -bottom-[24px] left-0 w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>

                {/* Right Inverted Fillet (Seamless curve into top edge) */}
                <div className="absolute top-0 -right-[24px] w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>
              </div>

              {/* Card Bottom Content */}
              <div className="p-5 flex flex-col gap-3.5 w-full z-0">
                <div className="flex flex-col gap-0.5">
                  <div className="font-sans font-medium text-[32px] text-white leading-none tracking-tight">
                    $0
                  </div>
                  <div className="font-sans font-medium text-sm text-white">
                    Monthly CMS Fees
                  </div>
                </div>
                <div className="h-[1px] w-full bg-white/10" />
                <p className="font-sans text-[13px] text-white/60 leading-snug">
                  Eliminate recurring per-site subscription fees by deploying free to Vercel, Netlify, or Cloudflare.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works / Technical Architecture Section */}
        <section id="architecture" className="py-[72px]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 squircle-pill bg-white/[0.08] border border-white/10 text-xs font-medium text-white/80 mb-4 backdrop-blur-md">
              <HugeiconsIcon icon={AiSparklesIcon} size={14} className="text-[#F65023]" />
              <span>Architecture & Runtime</span>
            </div>
            {/* H2 heading using semibold Figtree */}
            <h2 className="font-sans font-semibold text-3xl sm:text-4xl text-white tracking-tight">
              How Site2NextJS Works
            </h2>
            <p className="text-white/60 text-sm mt-3 font-sans">
              The reverse-engineered secret behind 100% animation, hover, and interaction fidelity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {/* Card 1: Preserved Comment Markers */}
            <div className="relative w-full min-h-[248px] bg-[#1a1a1a] rounded-[24px] squircle-3xl overflow-hidden flex flex-col justify-end items-start group hover:border-[#F65023]/30 transition-all">
              {/* Signature Framer Top-Left Cutout Notch (48x48 black with 18px radius) */}
              <div className="absolute top-0 left-0 w-[48px] h-[48px] bg-black rounded-br-[18px] flex items-center justify-center z-10">
                <HugeiconsIcon icon={Layers01Icon} size={20} className="text-[#F65023]" />

                {/* Bottom Inverted Fillet (Seamless curve into card edge) */}
                <div className="absolute -bottom-[24px] left-0 w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>

                {/* Right Inverted Fillet (Seamless curve into top edge) */}
                <div className="absolute top-0 -right-[24px] w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>
              </div>

              {/* Card Bottom Content */}
              <div className="p-5 pt-14 flex flex-col gap-3.5 w-full z-0">
                <div className="font-sans font-semibold text-lg text-white">
                  Preserved Comment Markers
                </div>
                <div className="h-[1px] w-full bg-white/10" />
                <p className="text-xs sm:text-[13px] text-white/60 leading-relaxed font-sans">
                  Framer’s runtime relies on React Suspense HTML comment markers (<code>&lt;!--$--&gt;</code>) to hydrate
                  instantly. Converting to raw JSX strips these comments, breaking hydration. Site2NextJS uses App Router
                  Route Handlers to deliver identical markup and instant hydration.
                </p>
              </div>
            </div>

            {/* Card 2: WebP & Font Optimization */}
            <div className="relative w-full min-h-[248px] bg-[#1a1a1a] rounded-[24px] squircle-3xl overflow-hidden flex flex-col justify-end items-start group hover:border-[#F65023]/30 transition-all">
              {/* Signature Framer Top-Left Cutout Notch (48x48 black with 18px radius) */}
              <div className="absolute top-0 left-0 w-[48px] h-[48px] bg-black rounded-br-[18px] flex items-center justify-center z-10">
                <HugeiconsIcon icon={FlashIcon} size={20} className="text-[#F65023]" />

                {/* Bottom Inverted Fillet (Seamless curve into card edge) */}
                <div className="absolute -bottom-[24px] left-0 w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>

                {/* Right Inverted Fillet (Seamless curve into top edge) */}
                <div className="absolute top-0 -right-[24px] w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>
              </div>

              {/* Card Bottom Content */}
              <div className="p-5 pt-14 flex flex-col gap-3.5 w-full z-0">
                <div className="font-sans font-semibold text-lg text-white">
                  WebP & Font Optimization
                </div>
                <div className="h-[1px] w-full bg-white/10" />
                <p className="text-xs sm:text-[13px] text-white/60 leading-relaxed font-sans">
                  All raster images from external CDNs are compressed to modern WebP format using Sharp (cutting payload by up to
                  70%). Web fonts are downloaded to <code>public/assets/fonts/</code> with <code>font-display: swap</code> forced
                  to eliminate layout shift.
                </p>
              </div>
            </div>

            {/* Card 3: Zero Monthly Hosting Fees */}
            <div className="relative w-full min-h-[248px] bg-[#1a1a1a] rounded-[24px] squircle-3xl overflow-hidden flex flex-col justify-end items-start group hover:border-[#F65023]/30 transition-all">
              {/* Signature Framer Top-Left Cutout Notch (48x48 black with 18px radius) */}
              <div className="absolute top-0 left-0 w-[48px] h-[48px] bg-black rounded-br-[18px] flex items-center justify-center z-10">
                <HugeiconsIcon icon={SecurityCheckIcon} size={20} className="text-[#F65023]" />

                {/* Bottom Inverted Fillet (Seamless curve into card edge) */}
                <div className="absolute -bottom-[24px] left-0 w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>

                {/* Right Inverted Fillet (Seamless curve into top edge) */}
                <div className="absolute top-0 -right-[24px] w-[24px] h-[24px] pointer-events-none">
                  <svg viewBox="0 0 90 90" className="w-[24px] h-[24px] text-black fill-current">
                    <path d="M 6.131 30.712 C 0 42.746 0 58.497 0 90 L 0 0 L 90 0 C 58.497 0 42.746 0 30.714 6.131 C 20.129 11.524 11.524 20.129 6.13 30.712 Z" />
                  </svg>
                </div>
              </div>

              {/* Card Bottom Content */}
              <div className="p-5 pt-14 flex flex-col gap-3.5 w-full z-0">
                <div className="font-sans font-semibold text-lg text-white">
                  Zero Monthly Hosting Fees
                </div>
                <div className="h-[1px] w-full bg-white/10" />
                <p className="text-xs sm:text-[13px] text-white/60 leading-relaxed font-sans">
                  No monthly Framer or CMS subscriptions. Statically prerendered App Router outputs can be hosted completely
                  free on Vercel, Netlify, or Cloudflare Pages with zero bandwidth caps and enterprise global edge caching.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section (Matching Framer FAQ style) */}
        <section id="faq" className="py-[72px]">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 squircle-pill bg-white/[0.08] border border-white/10 text-xs font-medium text-white/80 mb-4 backdrop-blur-md">
              <HugeiconsIcon icon={AiSparklesIcon} size={14} className="text-[#F65023]" />
              <span>FAQ&apos;s</span>
            </div>
            {/* H2 heading using semibold Figtree */}
            <h2 className="font-sans font-semibold text-3xl sm:text-4xl text-white tracking-tight">
              Helpful answers for your site conversion needs
            </h2>
            <p className="text-white/60 text-sm mt-3 font-sans">
              Everything you need to know about exporting, animation parity, and hosting.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.q}
                  className="squircle-2xl border border-white/10 bg-[#1a1a1a] overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between text-white hover:text-[#F65023] font-semibold text-base transition-colors font-sans"
                  >
                    <span>{item.q}</span>
                    <span className="ml-4 shrink-0 w-8 h-8 squircle-pill bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70">
                      <HugeiconsIcon icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon} size={15} className={isOpen ? "text-[#F65023]" : "text-white/70"} />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-white/60 leading-relaxed border-t border-white/5 pt-4 font-sans">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer (Matching Framer Footer 1:1) */}
      <footer className="w-full max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex flex-col gap-16">
          <div className="max-w-md flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SiteLogo className="w-7 h-7" />
              <span className="font-sans font-medium text-[30px] text-white tracking-[-0.03em]">
                Site2NextJS
              </span>
            </div>
            <p className="text-white/60 text-sm font-sans leading-relaxed">
              High-quality Framer template crafted for AI automation agencies to launch fast and scale effortlessly
            </p>
          </div>

          <div className="w-full bg-[#1a1a1a] border border-white/10 rounded-[14px] squircle p-[22px] flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="w-[250px] h-[250px] bg-[#F65023] blur-[100px] rounded-full opacity-30 absolute -top-[116px] -right-[50px] pointer-events-none" />

            <div className="flex items-center gap-2 text-xs text-white/60 font-sans z-10">
              <span>© All right reserved</span>
              <span className="w-1 h-1 rounded-full bg-white/50 inline-block" />
              <span>
                Built by{" "}
                <a
                  href="https://x.com/Suraj_kaleux"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-[#F65023] transition-colors"
                >
                  Suraj
                </a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
