"use client";
import { useState, useEffect, useRef } from "react";
import type React from "react";
export interface StatItem {
  label: string;
  before: number;
  after: number;
  unit: "count" | "bytes" | "ms";
}

export interface PageInfo {
  route: string;
  url: string;
}

export interface ConversionData {
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

export function useConversion() {
  const activityTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const converting = useRef(false);
  useEffect(
    () => () => {
      if (activityTimer.current) clearInterval(activityTimer.current);
    },
    [],
  );
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState("15");
  const [imageQuality, setImageQuality] = useState("78");
  const [showOptions, setShowOptions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMessage, setStepMessage] = useState("");
  const [conversionData, setConversionData] = useState<ConversionData | null>(
    null,
  );

  // Preview device mode
  const [previewDevice, setPreviewDevice] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");

  // GitHub Modal state
  const [showGitModal, setShowGitModal] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [repoName, setRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [gitPushing, setGitPushing] = useState(false);
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitSuccessUrl, setGitSuccessUrl] = useState<string | null>(null);

  // Site ownership & authorization checkmark
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

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
      // Clean up the old token even when stored job data is malformed.
      localStorage.removeItem("framer2nextjs_github_token");
      const savedJob = localStorage.getItem("framer2nextjs_active_job");
      if (savedJob) {
        const parsed = JSON.parse(savedJob);
        if (
          typeof parsed?.jobId === "string" &&
          typeof parsed.sourceUrl === "string" &&
          Array.isArray(parsed.pages) &&
          Array.isArray(parsed.stats) &&
          Array.isArray(parsed.notes)
        ) {
          setConversionData(parsed);
          if (parsed.sourceUrl) setUrl(parsed.sourceUrl);
          try {
            const host = new URL(parsed.sourceUrl).hostname
              .replace(/^www\./, "")
              .replace(/\./g, "-");
            setRepoName(`${host}-nextjs`);
          } catch {
            setRepoName("my-site-nextjs");
          }
        }
      }
      // Actively purge any legacy stored token from previous versions for security
      localStorage.removeItem("framer2nextjs_github_token");
    } catch {}
  }, []);

  const handleReset = () => {
    setConversionData(null);
    setUrl("");
    setError(null);
    setGitSuccessUrl(null);
    setIsAuthorized(false);
    setShowAuthWarning(false);
    try {
      localStorage.removeItem("framer2nextjs_active_job");
    } catch {}
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || converting.current) return;

    if (!isAuthorized) {
      setShowAuthWarning(true);
      return;
    }

    converting.current = true;
    setLoading(true);
    setError(null);
    setConversionData(null);
    setCurrentStep(1);
    setStepMessage(steps[0]);

    // Estimated activity only: this is not measured backend progress.
    let step = 1;
    const interval = setInterval(() => {
      if (step < 5) {
        step++;
        setCurrentStep(step);
        setStepMessage(steps[step - 1]);
      }
    }, 4500);
    activityTimer.current = interval;

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
        const host = new URL(url.trim()).hostname
          .replace(/^www\./, "")
          .replace(/\./g, "-");
        setRepoName(`${host}-nextjs`);
      } catch {
        setRepoName("my-site-nextjs");
      }
    } catch (err: unknown) {
      clearInterval(interval);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      converting.current = false;
      activityTimer.current = null;
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
            return new URL(conversionData.sourceUrl).hostname
              .replace(/^www\./, "")
              .replace(/\./g, "-");
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
          throw new Error(
            "Job session expired on the server. Please reconvert your site below to refresh files and push.",
          );
        }
        if (data.error && data.error.includes("Bad credentials")) {
          throw new Error(
            "GitHub token is invalid or lacks the required 'repo' scope. Please verify your token.",
          );
        }
        throw new Error(data.error || "Failed to push to GitHub.");
      }

      setGitSuccessUrl(data.repoUrl);
    } catch (err: unknown) {
      const rawMsg =
        err instanceof Error ? err.message : "Error pushing to GitHub.";
      const safeMsg = rawMsg
        .replaceAll(githubToken.trim(), "[REDACTED]")
        .replace(
          /(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})/g,
          "[REDACTED]",
        );
      setGitError(safeMsg);
    } finally {
      setGitPushing(false);
    }
  };

  return {
    url,
    setUrl,
    maxPages,
    setMaxPages,
    imageQuality,
    setImageQuality,
    showOptions,
    setShowOptions,
    loading,
    error,
    currentStep,
    stepMessage,
    conversionData,
    previewDevice,
    setPreviewDevice,
    showGitModal,
    setShowGitModal,
    githubToken,
    setGithubToken,
    repoName,
    setRepoName,
    isPrivate,
    setIsPrivate,
    gitPushing,
    gitError,
    gitSuccessUrl,
    isAuthorized,
    setIsAuthorized,
    showAuthWarning,
    setShowAuthWarning,
    handleReset,
    handleConvert,
    handleDownload,
    handlePushToGithub,
    steps,
  };
}
export type ConversionController = ReturnType<typeof useConversion>;
