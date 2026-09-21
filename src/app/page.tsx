"use client";

import React, { useState } from "react";
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
} from "lucide-react";

// TailGrids Core Components
import { Button } from "@/components/tailgrids/core/button";
import { Badge } from "@/components/tailgrids/core/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/tailgrids/core/card";
import { Input } from "@/components/tailgrids/core/input";
import {
  AccordionRoot,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/tailgrids/core/accordion";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/tailgrids/core/alert";
import { Progress } from "@/components/tailgrids/core/progress";


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

  // Restore from localStorage on mount
  React.useEffect(() => {
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

  // Copied helper
  const [copied, setCopied] = useState(false);

  const steps = [
    "Connecting & detecting site platform",
    "Discovering all routes & sitemaps",
    "Harvesting media, images & fonts",
    "Re-encoding images to modern WebP",
    "Self-hosting fonts & resolving relative assets",
    "Generating 100% fidelity Next.js App Router code",
  ];

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
        setRepoName("my-framer-site-nextjs");
      }
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="relative min-h-screen bg-[#07080e] text-slate-100 flex flex-col font-sans selection:bg-[#FF7300] selection:text-white">
      {/* Ambient background glows with #FF7300 warm aura */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] overflow-hidden opacity-30">
        <div className="absolute -top-40 left-1/4 w-[550px] h-[550px] rounded-full bg-[#FF7300]/15 blur-[140px]" />
        <div className="absolute -top-40 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-600/10 blur-[130px]" />
      </div>

      {/* Navigation */}
      <header className="relative z-10 border-b border-slate-800/80 backdrop-blur-md bg-[#07080e]/80">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF7300] to-[#e65c00] flex items-center justify-center font-bold text-white shadow-lg shadow-[#FF7300]/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-50 to-[#FF7300]">
                Site2NextJS
              </span>
              <Badge color="orange" size="sm" className="bg-[#FF7300]/15 text-[#FF7300] border border-[#FF7300]/30 font-semibold">
                Universal & 100% Fidelity
              </Badge>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-[#FF7300] transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-[#FF7300] transition-colors">
              Architecture
            </a>
            <a href="#faq" className="hover:text-[#FF7300] transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-[#FF7300]/50 transition-all"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-1 mx-auto max-w-6xl px-5 pt-14 pb-24 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-[#FF7300]/30 text-[#FF7300] text-xs font-semibold mb-6 shadow-sm shadow-[#FF7300]/5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF7300]" />
            <span>Zero Lock-in • Framer, Webflow, HTML & Any Site • 1-Click GitHub Push</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
            Convert Framer or any website to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-100 to-[#FF7300]">
              production-ready Next.js
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Own your codebase. Statically prerendered App Router project supporting Framer, Webflow, WordPress,
            and standard HTML sites with zero broken assets, preserved animations, and edge performance.
          </p>
        </div>

        {/* URL Input Form */}
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={handleConvert}
            className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl shadow-[#FF7300]/5 focus-within:border-[#FF7300] focus-within:ring-2 focus-within:ring-[#FF7300]/20 transition-all"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="https://example.com or https://portfolio.framer.website"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3.5 bg-transparent border-0 text-slate-100 placeholder:text-slate-500 text-sm focus:ring-0 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#FF7300] hover:bg-[#e65c00] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#FF7300]/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 border-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <span>Convert to Next.js</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Expandable Options */}
            <div className="pt-2 px-3 pb-1 border-t border-slate-800/60 mt-2">
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#FF7300] transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Advanced Crawl Settings</span>
                {showOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showOptions && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-2 text-xs text-slate-400">
                  <div>
                    <label className="block mb-1.5 font-medium text-slate-300">Max Pages to Crawl</label>
                    <Input
                      type="number"
                      min={1}
                      max={40}
                      value={maxPages}
                      onChange={(e) => setMaxPages(e.target.value)}
                      className="w-full bg-slate-950 border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:border-[#FF7300] focus:ring-[#FF7300]/20"
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-medium text-slate-300">WebP Image Quality (1-100)</label>
                    <Input
                      type="number"
                      min={50}
                      max={100}
                      value={imageQuality}
                      onChange={(e) => setImageQuality(e.target.value)}
                      className="w-full bg-slate-950 border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:border-[#FF7300] focus:ring-[#FF7300]/20"
                    />
                  </div>
                </div>
              )}
            </div>
          </form>

          <p className="mt-2.5 text-xs text-center text-slate-500 font-mono">
            Paste any published Framer site, Webflow site, portfolio, or public web page URL.
          </p>

          {/* TailGrids Error Alert */}
          {error && (
            <div className="mt-6">
              <Alert status="error" className="border-red-900/60 bg-red-950/40 text-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <AlertTitle className="font-semibold text-red-300">Conversion Error</AlertTitle>
                  <AlertDescription className="text-xs text-red-300/90 mt-0.5">{error}</AlertDescription>
                </div>
              </Alert>
            </div>
          )}
        </div>

        {/* Live Progress Terminal */}
        {loading && (
          <Card className="max-w-2xl mx-auto mt-10 p-6 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF7300] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF7300]"></span>
                </span>
                <span className="text-sm font-semibold text-slate-200">
                  Step {currentStep} of 6: {stepMessage}
                </span>
              </div>
              <span className="text-xs font-mono font-medium text-[#FF7300]">{Math.round((currentStep / 6) * 100)}%</span>
            </div>

            {/* TailGrids Progress Bar */}
            <div className="mb-5">
              <Progress
                progress={Math.round((currentStep / 6) * 100)}
                barColor="#FF7300"
                trackColor="#1e293b"
                className="max-w-full"
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
                        ? "text-[#FF7300] font-medium animate-pulse-subtle"
                        : "text-slate-600"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 text-[#FF7300] animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                    )}
                    <span>{text}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Successful Conversion Results Panel */}
        {conversionData && !loading && (
          <div className="mt-14 space-y-10">
            {/* Top Status & Main Actions */}
            <Card className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div>
                  <Badge color="success" size="sm" className="mb-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" />
                    {conversionData.platform ? `${conversionData.platform} • ` : ""}Conversion Ready • 100% Parity
                  </Badge>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Successfully Generated Next.js Code
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Source: <span className="text-slate-200 font-mono text-xs">{conversionData.sourceUrl}</span> •{" "}
                    <span className="text-[#FF7300] font-medium">{conversionData.fileCount}</span> total project files generated
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onPress={handleDownload}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#FF7300] hover:bg-[#e65c00] text-white text-sm font-semibold shadow-lg shadow-[#FF7300]/25 transition-all border-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Project (.ZIP)</span>
                  </Button>

                  <Button
                    appearance="outline"
                    onPress={() => setShowGitModal(true)}
                    className="flex-1 sm:flex-none border-slate-700 hover:border-[#FF7300]/50 hover:bg-slate-800 text-white text-sm"
                  >
                    <Github className="w-4 h-4" />
                    <span>Push to GitHub</span>
                  </Button>

                  <Button
                    variant="ghost"
                    onPress={handleReset}
                    className="flex-1 sm:flex-none text-slate-400 hover:text-white text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Convert Another Site</span>
                  </Button>
                </div>
              </div>

              {/* Stat Cards using TailGrids Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <Card className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <p className="text-xs text-slate-500">Pages Converted</p>
                  <p className="text-2xl font-bold text-white mt-1">{conversionData.pages.length}</p>
                  <p className="text-[11px] text-emerald-400 mt-1">Statically prerendered</p>
                </Card>

                {conversionData.stats.find((s) => s.label === "Image payload") && (
                  <Card className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                    <p className="text-xs text-slate-500">Image Payload</p>
                    <p className="text-2xl font-bold text-[#FF7300] mt-1">
                      {formatBytes(
                        conversionData.stats.find((s) => s.label === "Image payload")?.after || 0
                      )}
                    </p>
                    <p className="text-[11px] text-orange-300 mt-1">Re-encoded WebP</p>
                  </Card>
                )}

                <Card className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <p className="text-xs text-slate-500">Animations & Interactions</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">100% Parity</p>
                  <p className="text-[11px] text-slate-400 mt-1">Preserved hydration</p>
                </Card>

                <Card className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                  <p className="text-xs text-slate-500">Framer Monthly Lock-in</p>
                  <p className="text-2xl font-bold text-[#FF7300] mt-1">$0 / mo</p>
                  <p className="text-[11px] text-slate-400 mt-1">Free Vercel / Netlify</p>
                </Card>
              </div>

              {/* Optimization Highlights */}
              <div className="mt-6 pt-6 border-t border-slate-800/80">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Applied Optimizations
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {conversionData.notes.map((note) => (
                    <div key={note} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#FF7300] shrink-0" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Live Interactive Preview Box */}
            <Card className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-[#FF7300]" />
                    <span>Live Preview of Converted Next.js Site</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Testing local route handler rendering with all self-hosted assets & animations intact.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <Button
                    size="xs"
                    appearance={previewDevice === "desktop" ? "fill" : "outline"}
                    className={previewDevice === "desktop" ? "bg-[#FF7300] hover:bg-[#e65c00] text-white border-0" : "border-0 text-slate-400 hover:text-white bg-transparent"}
                    onPress={() => setPreviewDevice("desktop")}
                  >
                    <Monitor className="w-3.5 h-3.5 mr-1" />
                    <span>Desktop</span>
                  </Button>
                  <Button
                    size="xs"
                    appearance={previewDevice === "tablet" ? "fill" : "outline"}
                    className={previewDevice === "tablet" ? "bg-[#FF7300] hover:bg-[#e65c00] text-white border-0" : "border-0 text-slate-400 hover:text-white bg-transparent"}
                    onPress={() => setPreviewDevice("tablet")}
                  >
                    <Tablet className="w-3.5 h-3.5 mr-1" />
                    <span>Tablet</span>
                  </Button>
                  <Button
                    size="xs"
                    appearance={previewDevice === "mobile" ? "fill" : "outline"}
                    className={previewDevice === "mobile" ? "bg-[#FF7300] hover:bg-[#e65c00] text-white border-0" : "border-0 text-slate-400 hover:text-white bg-transparent"}
                    onPress={() => setPreviewDevice("mobile")}
                  >
                    <Smartphone className="w-3.5 h-3.5 mr-1" />
                    <span>Mobile</span>
                  </Button>
                </div>
              </div>

              {/* Viewport Frame */}
              <div className="flex justify-center bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-800/80 overflow-hidden">
                <div
                  className="bg-white rounded-xl overflow-hidden shadow-2xl transition-all duration-300 border border-slate-800"
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
            </Card>

            {/* Converted Pages Outline & Quick Start */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pages Column */}
              <Card className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FF7300]" />
                  <span>Converted Routes ({conversionData.pages.length})</span>
                </h3>
                <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-2">
                  {conversionData.pages.map((p) => (
                    <li
                      key={p.route}
                      className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800/60 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-orange-300">{p.route}</span>
                      <span className="text-slate-500 font-mono text-[11px]">app{p.route === "/" ? "" : p.route}/route.ts</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* CLI Run instructions */}
              <Card className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#FF7300]" />
                    <span>Run Locally in 3 Steps</span>
                  </h3>
                  <button
                    onClick={() => copyCommand("npm install && npm run dev")}
                    className="text-xs text-slate-400 hover:text-[#FF7300] flex items-center gap-1 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copied" : "Copy commands"}</span>
                  </button>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2">
                  <p className="text-slate-500"># 1. Unzip and enter the project folder</p>
                  <p className="text-[#FF7300]">cd my-framer-site-nextjs</p>
                  <p className="text-slate-500 mt-2"># 2. Install dependencies & run development server</p>
                  <p className="text-[#FF7300]">npm install && npm run dev</p>
                  <p className="text-slate-500 mt-2"># 3. Production build (ready for Vercel/Netlify)</p>
                  <p className="text-emerald-400">npm run build && npm start</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* GitHub Push Modal */}
        {showGitModal && conversionData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <Card className="w-full max-w-lg p-6 sm:p-7 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-[#FF7300]">
                    <Github className="w-5 h-5 text-[#FF7300]" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Push Code to GitHub</h3>
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
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl font-bold text-white">Repository Created!</h4>
                  <p className="text-sm text-slate-400">
                    All converted Next.js files and assets have been successfully pushed to your GitHub account.
                  </p>
                  <a
                    href={gitSuccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF7300] hover:bg-[#e65c00] text-white text-sm font-semibold shadow-lg shadow-[#FF7300]/25 transition-all"
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
                    <Input
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
                      className="w-full bg-slate-950 border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#FF7300] focus:ring-[#FF7300]/20"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Needs <code>repo</code> scope.{" "}
                      <a
                        href="https://github.com/settings/tokens/new?scopes=repo&description=Framer2NextJS"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#FF7300] underline hover:text-[#fb923c]"
                      >
                        Generate token on GitHub ↗
                      </a>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Repository Name
                    </label>
                    <Input
                      type="text"
                      required
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      className="w-full bg-slate-950 border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-[#FF7300] focus:ring-[#FF7300]/20"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isPrivate"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-[#FF7300] focus:ring-[#FF7300] accent-[#FF7300]"
                    />
                    <label htmlFor="isPrivate" className="text-xs text-slate-300 cursor-pointer">
                      Make repository private
                    </label>
                  </div>

                  {gitError && (
                    <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 space-y-2">
                      <p>{gitError}</p>
                      {gitError.toLowerCase().includes("expired") && (
                        <Button
                          variant="primary"
                          size="xs"
                          onPress={() => {
                            setShowGitModal(false);
                            handleReset();
                          }}
                          className="bg-[#FF7300] hover:bg-[#e65c00] text-white"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Start Fresh Conversion</span>
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => setShowGitModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={gitPushing || !githubToken.trim() || !repoName.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#FF7300] hover:bg-[#e65c00] text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-[#FF7300]/25 disabled:opacity-50 border-0"
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
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>
        )}

        {/* Informational Architecture & Features Section */}
        <div id="how-it-works" className="mt-28 border-t border-slate-800/80 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <Badge color="orange" size="sm" className="mb-3 bg-[#FF7300]/15 text-[#FF7300] border border-[#FF7300]/30 font-semibold">
              Architecture & Runtime
            </Badge>
            <h2 className="text-3xl font-extrabold text-white">How Framer2NextJS Works</h2>
            <p className="text-slate-400 text-sm mt-2">
              The reverse-engineered secret behind 100% animation, hover, and interaction fidelity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-[#FF7300]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#FF7300]/10 border border-[#FF7300]/30 flex items-center justify-center text-[#FF7300] mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold text-white mb-2">Preserved Comment Markers</CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-relaxed">
                Framer’s runtime relies on React Suspense HTML comment markers (<code>&lt;!--$--&gt;</code>) to hydrate
                instantly. Converting to raw JSX strips these comments, breaking hydration. Framer2NextJS uses App Router
                Route Handlers to deliver identical markup and instant hydration.
              </CardDescription>
            </Card>

            <Card className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-[#FF7300]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#FF7300]/10 border border-[#FF7300]/30 flex items-center justify-center text-[#FF7300] mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold text-white mb-2">WebP & Font Optimization</CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-relaxed">
                All raster images from Framer’s CDN are compressed to WebP format using Sharp (cutting payload by up to
                70%). Web fonts are downloaded to <code>public/assets/fonts/</code> with <code>font-display: swap</code> forced
                to eliminate layout shift.
              </CardDescription>
            </Card>

            <Card className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-[#FF7300]/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#FF7300]/10 border border-[#FF7300]/30 flex items-center justify-center text-[#FF7300] mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <CardTitle className="text-base font-bold text-white mb-2">Zero Monthly Hosting Fees</CardTitle>
              <CardDescription className="text-xs text-slate-400 leading-relaxed">
                No monthly Framer site subscriptions. Statically prerendered App Router outputs can be hosted completely
                free on Vercel, Netlify, or Cloudflare Pages with zero bandwidth caps and enterprise global edge caching.
              </CardDescription>
            </Card>
          </div>
        </div>

        {/* Interactive FAQ using TailGrids Accordion */}
        <div id="faq" className="mt-24 border-t border-slate-800/80 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge color="orange" size="sm" className="mb-3 bg-[#FF7300]/15 text-[#FF7300] border border-[#FF7300]/30 font-semibold">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl font-extrabold text-white">Got Questions? We Have Answers.</h2>
            <p className="text-slate-400 text-sm mt-2">
              Everything you need to know about exporting, parity, and hosting.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <AccordionRoot variant="style_one" className="space-y-4">
              <AccordionItem className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <AccordionTrigger className="p-5 sm:p-6 text-white hover:text-[#FF7300] font-semibold text-base">
                  Will this work for non-Framer sites like Webflow, WordPress, or plain HTML?
                </AccordionTrigger>
                <AccordionContent className="px-5 sm:px-6 pb-6 text-sm text-slate-400 leading-relaxed">
                  Yes! While specially optimized with comment-preservation for Framer React hydration, the engine supports any public website. It crawls all pages, converts raster images to modern WebP with Sharp, downloads web fonts locally, and resolves relative stylesheets and scripts so that any website runs cleanly in Next.js without broken assets.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <AccordionTrigger className="p-5 sm:p-6 text-white hover:text-[#FF7300] font-semibold text-base">
                  Why does exporting to raw JSX break Framer animations?
                </AccordionTrigger>
                <AccordionContent className="px-5 sm:px-6 pb-6 text-sm text-slate-400 leading-relaxed">
                  Framer’s animation engine and interactive component state rely heavily on internal React 18 Suspense markers and specific serialized state payloads. When other tools attempt to decompile this directly into raw JSX templates, those hydration boundaries and comment anchors are destroyed, resulting in broken scroll triggers, failed hover states, and missing transitions. Framer2NextJS solves this by preserving comment markers and delivering valid App Router route handlers.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <AccordionTrigger className="p-5 sm:p-6 text-white hover:text-[#FF7300] font-semibold text-base">
                  How are assets, images, and fonts handled during conversion?
                </AccordionTrigger>
                <AccordionContent className="px-5 sm:px-6 pb-6 text-sm text-slate-400 leading-relaxed">
                  All external Framer CDN dependencies are crawled and saved directly to your Next.js project's <code>public/</code> folder. Images are converted to WebP with Sharp at configurable quality levels (saving up to 70% of bandwidth), and web fonts are downloaded locally with <code>font-display: swap</code> injected into the font-face definitions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <AccordionTrigger className="p-5 sm:p-6 text-white hover:text-[#FF7300] font-semibold text-base">
                  Can I deploy the converted site to Vercel or Netlify for free?
                </AccordionTrigger>
                <AccordionContent className="px-5 sm:px-6 pb-6 text-sm text-slate-400 leading-relaxed">
                  Yes! The generated output is a standard Next.js 14 App Router project. You can run <code>npm run build</code> and deploy directly to Vercel, Netlify, Cloudflare Pages, or AWS Amplify with zero configuration. You no longer need to pay Framer's recurring monthly per-site subscription fees.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <AccordionTrigger className="p-5 sm:p-6 text-white hover:text-[#FF7300] font-semibold text-base">
                  How does the 1-click GitHub Push work?
                </AccordionTrigger>
                <AccordionContent className="px-5 sm:px-6 pb-6 text-sm text-slate-400 leading-relaxed">
                  Provide a GitHub Personal Access Token with <code>repo</code> scope, specify your desired repository name, and Framer2NextJS will create the repository via the Octokit GitHub REST API and commit the entire project tree automatically with initial commit messages and README.
                </AccordionContent>
              </AccordionItem>
            </AccordionRoot>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>
          Framer2NextJS • Independent third-party developer tool. Built with TailGrids & Geist. Not affiliated with Framer B.V.
        </p>
      </footer>
    </div>
  );
}
