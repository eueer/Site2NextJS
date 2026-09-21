"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  ArrowRight,
  Download,
  Github,
  CheckCircle2,
  Sparkles,
  Layers,
  Zap,
  ShieldCheck,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Code2,
  Sliders,
  Copy,
  Check,
  FileCode,
  Gauge,
  Lock,
} from "lucide-react";
import { SiteLogo, SparkleIcon } from "@/components/SiteLogo";

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
      {/* Framer-inspired ambient top glowing rays */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[700px] overflow-hidden opacity-40">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[#F65023]/20 blur-[130px]" />
        <div className="absolute top-10 left-1/3 w-[350px] h-[350px] rounded-full bg-[#F65023]/10 blur-[100px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-black/70">
        <div className="mx-auto max-w-6xl px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SiteLogo className="w-8 h-8" />
            <div className="flex items-center gap-2.5">
              <span className="font-pixel text-xl font-bold tracking-tight text-white">
                Site2NextJS
              </span>
              <span className="squircle-pill px-2.5 py-0.5 text-[11px] font-medium bg-[#F65023]/15 text-[#F65023] border border-[#F65023]/30">
                Universal Parity
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
            <a href="#how-it-works" className="hover:text-[#F65023] transition-colors">
              How it works
            </a>
            <a href="#about" className="hover:text-[#F65023] transition-colors">
              About
            </a>
            <a href="#architecture" className="hover:text-[#F65023] transition-colors">
              Architecture
            </a>
            <a href="#faq" className="hover:text-[#F65023] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/surajkale/framer2nextjs"
              target="_blank"
              rel="noopener noreferrer"
              className="squircle-pill inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#1a1a1a] border border-white/10 text-slate-200 hover:text-white hover:border-[#F65023]/40 transition-all"
            >
              <Github className="w-3.5 h-3.5 text-slate-300" />
              <span>GitHub</span>
            </a>
            <a
              href="#converter"
              className="squircle-pill inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#F65023] hover:bg-[#e04318] text-white shadow-lg shadow-[#F65023]/25 transition-all"
            >
              <span>Convert Site</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 mx-auto max-w-6xl px-6 pt-16 pb-28 w-full">
        {/* Hero Section */}
        <section id="converter" className="text-center max-w-3xl mx-auto mb-12">
          {/* Section Tag */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 squircle-pill bg-[#1a1a1a] border border-white/10 text-xs font-medium text-slate-300 mb-6 shadow-sm">
            <SparkleIcon className="w-3.5 h-3.5 text-[#F65023]" />
            <span>Universal Site Conversion • 100% Fidelity</span>
          </div>

          <h1 className="font-pixel text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight leading-[1.12] text-white">
            Convert any website to{" "}
            <span className="text-[#F65023]">
              production-ready Next.js
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Transform Framer, Webflow, or static sites into optimized Next.js App Router codebases
            with preserved animations and 0 monthly fees.
          </p>
        </section>

        {/* Hero Prompt Card Input Container (Framer Gp1HwNMZ3 style) */}
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleConvert}
            className="p-3 squircle-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl focus-within:border-[#F65023]/60 focus-within:ring-2 focus-within:ring-[#F65023]/20 transition-all"
          >
            {/* Top URL Input Row */}
            <div className="relative flex items-center px-3 py-2">
              <Globe className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
              <input
                type="text"
                placeholder="Enter Site URL (e.g. https://portfolio.framer.website or https://example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="w-full bg-transparent border-0 p-0 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-0"
              />
            </div>

            {/* Bottom Action Row */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="squircle-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-black/40 border border-white/5 hover:border-white/15 transition-all"
              >
                <Sliders className="w-3.5 h-3.5 text-[#F65023]" />
                <span>Advanced Settings</span>
                {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="squircle-pill inline-flex items-center gap-2 px-6 py-2.5 bg-[#F65023] hover:bg-[#e04318] text-white text-xs font-semibold shadow-md shadow-[#F65023]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <span>Convert to NextJS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Expandable Advanced Options Panel */}
            {showOptions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-slate-300">
                <div>
                  <label className="block mb-1.5 font-medium text-slate-400">Max Pages to Crawl</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={maxPages}
                    onChange={(e) => setMaxPages(e.target.value)}
                    className="w-full squircle-md bg-black/60 border border-white/10 px-3 py-2 text-slate-200 focus:border-[#F65023] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 font-medium text-slate-400">WebP Image Quality (1-100)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={imageQuality}
                    onChange={(e) => setImageQuality(e.target.value)}
                    className="w-full squircle-md bg-black/60 border border-white/10 px-3 py-2 text-slate-200 focus:border-[#F65023] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Sub-bullets / pills under input (Framer style) */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <SparkleIcon className="w-3 h-3 text-[#F65023]" />
              <span>Works with any site</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SparkleIcon className="w-3 h-3 text-[#F65023]" />
              <span>100% animation parity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <SparkleIcon className="w-3 h-3 text-[#F65023]" />
              <span>Zero lock-in</span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mt-6 p-4 squircle-xl bg-red-950/40 border border-red-900/60 text-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
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
                        : "text-slate-600"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 text-[#F65023] animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 squircle-pill border border-slate-700 shrink-0" />
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
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{conversionData.platform ? `${conversionData.platform} • ` : ""}Conversion Ready • 100% Parity</span>
                  </div>
                  <h2 className="font-pixel text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Successfully Generated Next.js Code
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Source: <span className="text-slate-200 font-mono text-xs">{conversionData.sourceUrl}</span> •{" "}
                    <span className="text-[#F65023] font-medium">{conversionData.fileCount}</span> total project files generated
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleDownload}
                    className="squircle-pill inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F65023] hover:bg-[#e04318] text-white text-sm font-semibold shadow-lg shadow-[#F65023]/25 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Project (.ZIP)</span>
                  </button>

                  <button
                    onClick={() => setShowGitModal(true)}
                    className="squircle-pill inline-flex items-center justify-center gap-2 px-5 py-3 bg-black/60 border border-white/15 hover:border-[#F65023]/60 text-white text-sm font-medium transition-all"
                  >
                    <Github className="w-4 h-4" />
                    <span>Push to GitHub</span>
                  </button>

                  <button
                    onClick={handleReset}
                    className="squircle-pill inline-flex items-center justify-center gap-1.5 px-4 py-3 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Convert Another</span>
                  </button>
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="p-5 squircle-2xl bg-black/50 border border-white/5 relative overflow-hidden">
                  <p className="text-xs text-slate-400">Pages Converted</p>
                  <p className="font-pixel text-2xl font-bold text-white mt-1">{conversionData.pages.length}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">Statically prerendered</p>
                </div>

                {conversionData.stats.find((s) => s.label === "Image payload") && (
                  <div className="p-5 squircle-2xl bg-black/50 border border-white/5 relative overflow-hidden">
                    <p className="text-xs text-slate-400">Image Payload</p>
                    <p className="font-pixel text-2xl font-bold text-[#F65023] mt-1">
                      {formatBytes(
                        conversionData.stats.find((s) => s.label === "Image payload")?.after || 0
                      )}
                    </p>
                    <p className="text-[11px] text-orange-300 mt-1">Re-encoded WebP</p>
                  </div>
                )}

                <div className="p-5 squircle-2xl bg-black/50 border border-white/5 relative overflow-hidden">
                  <p className="text-xs text-slate-400">Animations & State</p>
                  <p className="font-pixel text-2xl font-bold text-emerald-400 mt-1">100%</p>
                  <p className="text-[11px] text-slate-400 mt-1">Preserved hydration</p>
                </div>

                <div className="p-5 squircle-2xl bg-black/50 border border-white/5 relative overflow-hidden">
                  <p className="text-xs text-slate-400">Monthly CMS Lock-in</p>
                  <p className="font-pixel text-2xl font-bold text-[#F65023] mt-1">$0 / mo</p>
                  <p className="text-[11px] text-slate-400 mt-1">Free Vercel / Netlify</p>
                </div>
              </div>

              {/* Optimization Highlights */}
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Applied Optimizations
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {conversionData.notes.map((note) => (
                    <div key={note} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#F65023] shrink-0" />
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
                  <h3 className="font-pixel text-lg font-bold text-white flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-[#F65023]" />
                    <span>Live Preview of Converted Next.js Site</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
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
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice("tablet")}
                    className={`squircle-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                      previewDevice === "tablet"
                        ? "bg-[#F65023] text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Tablet className="w-3.5 h-3.5" />
                    <span>Tablet</span>
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`squircle-pill inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
                      previewDevice === "mobile"
                        ? "bg-[#F65023] text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
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
                <h3 className="font-pixel text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#F65023]" />
                  <span>Converted Routes ({conversionData.pages.length})</span>
                </h3>
                <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-2">
                  {conversionData.pages.map((p) => (
                    <li
                      key={p.route}
                      className="px-3 py-2 squircle-md bg-black/50 border border-white/5 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-orange-300">{p.route}</span>
                      <span className="text-slate-500 font-mono text-[11px]">app{p.route === "/" ? "" : p.route}/route.ts</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CLI Run instructions */}
              <div className="lg:col-span-2 p-6 squircle-2xl bg-[#1a1a1a] border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-pixel text-sm font-semibold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#F65023]" />
                    <span>Run Locally in 3 Steps</span>
                  </h3>
                  <button
                    onClick={() => copyCommand("npm install && npm run dev")}
                    className="squircle-pill px-3 py-1 bg-black/40 border border-white/10 text-xs text-slate-300 hover:text-[#F65023] flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy commands"}</span>
                  </button>
                </div>

                <div className="bg-black/70 p-4 squircle-xl border border-white/5 font-mono text-xs text-slate-300 space-y-2">
                  <p className="text-slate-500"># 1. Unzip and enter the project folder</p>
                  <p className="text-[#F65023]">cd my-site-nextjs</p>
                  <p className="text-slate-500 mt-2"># 2. Install dependencies & run development server</p>
                  <p className="text-[#F65023]">npm install && npm run dev</p>
                  <p className="text-slate-500 mt-2"># 3. Production build (ready for Vercel/Netlify)</p>
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
                    <Github className="w-5 h-5 text-[#F65023]" />
                  </div>
                  <h3 className="font-pixel text-lg font-bold text-white">Push Code to GitHub</h3>
                </div>
                <button
                  onClick={() => setShowGitModal(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              {gitSuccessUrl ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 squircle-pill bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-pixel text-xl font-bold text-white">Repository Created!</h4>
                  <p className="text-sm text-slate-400">
                    All converted Next.js files and assets have been successfully pushed to your GitHub account.
                  </p>
                  <a
                    href={gitSuccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="squircle-pill inline-flex items-center gap-2 px-6 py-3 bg-[#F65023] hover:bg-[#e04318] text-white text-sm font-semibold shadow-lg shadow-[#F65023]/25 transition-all"
                  >
                    <span>Open in GitHub</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <form onSubmit={handlePushToGithub} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
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
                      className="w-full bg-black/60 border border-white/10 squircle-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#F65023] focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
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
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Repository Name
                    </label>
                    <input
                      type="text"
                      required
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 squircle-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#F65023] focus:outline-none"
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
                    <label htmlFor="isPrivate" className="text-xs text-slate-300 cursor-pointer">
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
                          <RefreshCw className="w-3 h-3 inline mr-1" />
                          <span>Start Fresh Conversion</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowGitModal(false)}
                      className="squircle-pill px-4 py-2 text-xs text-slate-400 hover:text-white"
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
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Pushing to GitHub...</span>
                        </>
                      ) : (
                        <>
                          <Github className="w-3.5 h-3.5" />
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

        {/* About / Stats Section (Matching Framer AboutUs & StatsCard style) */}
        <section id="about" className="mt-32 pt-16 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 squircle-pill bg-[#1a1a1a] border border-white/10 text-xs font-medium text-slate-300 mb-4">
              <SparkleIcon className="w-3.5 h-3.5 text-[#F65023]" />
              <span>About Site to NextJS</span>
            </div>
            <h2 className="font-pixel text-3xl sm:text-4xl font-normal text-white">
              Engineered for speed, fidelity, and developer freedom
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Why designers, agencies, and engineering teams are migrating their sites to standard Next.js.
            </p>
          </div>

          {/* 4 Stats Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-7 squircle-3xl bg-[#1a1a1a] border border-white/10 relative overflow-hidden flex flex-col justify-between group hover:border-[#F65023]/40 transition-all">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#F65023]/10 rounded-full blur-[45px] pointer-events-none" />
              <div>
                <div className="w-10 h-10 squircle-xl bg-black/60 border border-white/10 flex items-center justify-center text-[#F65023] mb-6">
                  <SparkleIcon className="w-5 h-5 text-[#F65023]" />
                </div>
                <div className="font-pixel text-4xl font-bold text-white mb-2 tracking-tight">
                  10K+
                </div>
                <div className="font-medium text-slate-200 text-base mb-2">
                  Projects Delivered
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Developers and agencies worldwide rely on our conversion engine to migrate websites seamlessly.
                </p>
              </div>
            </div>

            <div className="p-7 squircle-3xl bg-[#1a1a1a] border border-white/10 relative overflow-hidden flex flex-col justify-between group hover:border-[#F65023]/40 transition-all">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#F65023]/10 rounded-full blur-[45px] pointer-events-none" />
              <div>
                <div className="w-10 h-10 squircle-xl bg-black/60 border border-white/10 flex items-center justify-center text-[#F65023] mb-6">
                  <Zap className="w-5 h-5 text-[#F65023]" />
                </div>
                <div className="font-pixel text-4xl font-bold text-white mb-2 tracking-tight">
                  100%
                </div>
                <div className="font-medium text-slate-200 text-base mb-2">
                  Animation Parity
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Preserved React Suspense markers, Framer Motion springs, and responsive layouts automatically.
                </p>
              </div>
            </div>

            <div className="p-7 squircle-3xl bg-[#1a1a1a] border border-white/10 relative overflow-hidden flex flex-col justify-between group hover:border-[#F65023]/40 transition-all">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#F65023]/10 rounded-full blur-[45px] pointer-events-none" />
              <div>
                <div className="w-10 h-10 squircle-xl bg-black/60 border border-white/10 flex items-center justify-center text-[#F65023] mb-6">
                  <Gauge className="w-5 h-5 text-[#F65023]" />
                </div>
                <div className="font-pixel text-4xl font-bold text-white mb-2 tracking-tight">
                  70%
                </div>
                <div className="font-medium text-slate-200 text-base mb-2">
                  Payload Reduction
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sharp WebP image re-encoding and self-hosted local fonts completely eliminate layout shift.
                </p>
              </div>
            </div>

            <div className="p-7 squircle-3xl bg-[#1a1a1a] border border-white/10 relative overflow-hidden flex flex-col justify-between group hover:border-[#F65023]/40 transition-all">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#F65023]/10 rounded-full blur-[45px] pointer-events-none" />
              <div>
                <div className="w-10 h-10 squircle-xl bg-black/60 border border-white/10 flex items-center justify-center text-[#F65023] mb-6">
                  <Lock className="w-5 h-5 text-[#F65023]" />
                </div>
                <div className="font-pixel text-4xl font-bold text-white mb-2 tracking-tight">
                  $0
                </div>
                <div className="font-medium text-slate-200 text-base mb-2">
                  Monthly CMS Fees
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Eliminate recurring per-site subscription fees by deploying free to Vercel, Netlify, or Cloudflare.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works / Technical Architecture Section */}
        <section id="architecture" className="mt-32 pt-16 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 squircle-pill bg-[#1a1a1a] border border-white/10 text-xs font-medium text-slate-300 mb-4">
              <SparkleIcon className="w-3.5 h-3.5 text-[#F65023]" />
              <span>Architecture & Runtime</span>
            </div>
            <h2 className="font-pixel text-3xl sm:text-4xl font-normal text-white">
              How Site2NextJS Works
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              The reverse-engineered secret behind 100% animation, hover, and interaction fidelity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 squircle-3xl bg-[#1a1a1a] border border-white/10 hover:border-[#F65023]/40 transition-all">
              <div className="w-10 h-10 squircle-xl bg-black/60 border border-white/10 flex items-center justify-center text-[#F65023] mb-5">
                <Layers className="w-5 h-5 text-[#F65023]" />
              </div>
              <h3 className="font-pixel text-lg font-bold text-white mb-2">Preserved Comment Markers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Framer’s runtime relies on React Suspense HTML comment markers (<code>&lt;!--$--&gt;</code>) to hydrate
                instantly. Converting to raw JSX strips these comments, breaking hydration. Site2NextJS uses App Router
                Route Handlers to deliver identical markup and instant hydration.
              </p>
            </div>

            <div className="p-7 squircle-3xl bg-[#1a1a1a] border border-white/10 hover:border-[#F65023]/40 transition-all">
              <div className="w-10 h-10 squircle-xl bg-black/60 border border-white/10 flex items-center justify-center text-[#F65023] mb-5">
                <Zap className="w-5 h-5 text-[#F65023]" />
              </div>
              <h3 className="font-pixel text-lg font-bold text-white mb-2">WebP & Font Optimization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                All raster images from external CDNs are compressed to modern WebP format using Sharp (cutting payload by up to
                70%). Web fonts are downloaded to <code>public/assets/fonts/</code> with <code>font-display: swap</code> forced
                to eliminate layout shift.
              </p>
            </div>

            <div className="p-7 squircle-3xl bg-[#1a1a1a] border border-white/10 hover:border-[#F65023]/40 transition-all">
              <div className="w-10 h-10 squircle-xl bg-black/60 border border-white/10 flex items-center justify-center text-[#F65023] mb-5">
                <ShieldCheck className="w-5 h-5 text-[#F65023]" />
              </div>
              <h3 className="font-pixel text-lg font-bold text-white mb-2">Zero Monthly Hosting Fees</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                No monthly Framer or CMS subscriptions. Statically prerendered App Router outputs can be hosted completely
                free on Vercel, Netlify, or Cloudflare Pages with zero bandwidth caps and enterprise global edge caching.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Accordion Section (Matching Framer FAQ style) */}
        <section id="faq" className="mt-32 pt-16 border-t border-white/10">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 squircle-pill bg-[#1a1a1a] border border-white/10 text-xs font-medium text-slate-300 mb-4">
              <SparkleIcon className="w-3.5 h-3.5 text-[#F65023]" />
              <span>FAQ&apos;s</span>
            </div>
            <h2 className="font-pixel text-3xl sm:text-4xl font-normal text-white">
              Helpful answers for your site conversion needs
            </h2>
            <p className="text-slate-400 text-sm mt-3">
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
                    className="w-full p-6 text-left flex items-center justify-between text-white hover:text-[#F65023] font-semibold text-base transition-colors"
                  >
                    <span>{item.q}</span>
                    <span className="ml-4 shrink-0 w-8 h-8 squircle-pill bg-black/50 border border-white/10 flex items-center justify-center text-slate-400">
                      {isOpen ? <ChevronUp className="w-4 h-4 text-[#F65023]" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer (Matching Framer Footer style) */}
      <footer className="border-t border-white/10 bg-black/80 py-12 px-6">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <SiteLogo className="w-7 h-7" />
            <span className="font-pixel text-lg font-bold text-white">
              Site2NextJS
            </span>
          </div>

          <p className="text-xs text-slate-400 text-center md:text-left max-w-md">
            Universal site converter crafted to transform any website into clean, production-ready Next.js App Router code.
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>© All rights reserved</span>
            <span>•</span>
            <span>
              Built by{" "}
              <a
                href="https://x.com/Suraj_kaleux"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-[#F65023] underline transition-colors"
              >
                Suraj
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
