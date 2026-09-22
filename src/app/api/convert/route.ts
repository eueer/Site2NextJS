import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { convertSite } from "@/lib/converter";
import { saveJob } from "@/lib/store";
import { convertRateLimiter, getClientIp } from "@/lib/rateLimit";

export const maxDuration = 60; // Compatible with standard Vercel serverless functions

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce rate limiting per client IP
    const clientIp = getClientIp(req);
    const rateCheck = convertRateLimiter.check(clientIp);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before converting another site.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateCheck.resetSeconds.toString(),
            "X-RateLimit-Limit": rateCheck.limit.toString(),
            "X-RateLimit-Remaining": rateCheck.remaining.toString(),
          },
        }
      );
    }

    // 2. Enforce request payload size limit (2MB max)
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload exceeds maximum allowed size (2MB)." }, { status: 413 });
    }

    // 3. Validate request payload
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const { url, maxPages, maxImages } = body || {};

    if (!url || typeof url !== "string" || url.trim().length === 0 || url.length > 2048) {
      return NextResponse.json(
        { error: "Please provide a valid website URL (e.g. https://example.com)." },
        { status: 400 }
      );
    }

    const safeMaxPages = Math.min(Math.max(1, Number(maxPages) || 15), 25);
    const safeMaxImages = Math.min(Math.max(1, Number(maxImages) || 150), 200);

    const logs: string[] = [];
    const report = await convertSite(
      url.trim(),
      {
        maxPages: safeMaxPages,
        maxImages: safeMaxImages,
      },
      (msg) => {
        logs.push(msg);
      }
    );

    const jobId = crypto.randomUUID();
    saveJob(jobId, report);

    let zipBase64: string | undefined;
    try {
      const { createProjectZip } = await import("@/lib/zip");
      const zipBuf = await createProjectZip(report.files);
      zipBase64 = Buffer.from(zipBuf).toString("base64");
    } catch (zipErr) {
      console.warn("Could not pre-generate zip buffer:", zipErr);
    }

    return NextResponse.json({
      jobId,
      sourceUrl: report.sourceUrl,
      platform: report.platform,
      pages: report.pages,
      stats: report.stats,
      notes: report.notes,
      logs,
      fileCount: report.files.length,
      previewHtml: report.previewHtml,
      zipBase64,
      files: report.files.map((f) => ({
        path: f.path,
        content: f.content,
        binaryBase64: f.binary ? f.binary.toString("base64") : undefined,
      })),
    });
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : "An unexpected conversion error occurred.";
    console.error("Conversion error:", rawError);

    // Sanitize error messages: disclose safe validation/security errors, sanitize system/network traces
    const isSafeError =
      rawError.includes("blocked for security reasons") ||
      rawError.includes("Security violation") ||
      rawError.includes("Forbidden protocol") ||
      rawError.includes("Invalid URL") ||
      rawError.includes("Direct connection to private") ||
      rawError.includes("Rate limit");

    const safeMessage = isSafeError
      ? rawError
      : "Failed to convert site. Please ensure the target URL is reachable and publicly accessible.";

    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
