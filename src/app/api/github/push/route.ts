import { NextRequest, NextResponse } from "next/server";
import { pushToGitHub } from "@/lib/github";
import { getJob } from "@/lib/store";
import { gitPushRateLimiter, getClientIp } from "@/lib/rateLimit";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function redactSecrets(msg: string, token?: string): string {
  let cleaned = msg;
  if (token && token.trim().length > 4) {
    cleaned = cleaned.replaceAll(token.trim(), "[REDACTED_TOKEN]");
  }
  return cleaned.replace(/(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})/g, "[REDACTED_TOKEN]");
}

export async function POST(req: NextRequest) {
  let tokenForRedaction: string | undefined;

  try {
    // 1. Rate limiting per client IP
    const clientIp = getClientIp(req);
    const rateCheck = gitPushRateLimiter.check(clientIp);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: `Too many GitHub push attempts. Please wait ${rateCheck.resetSeconds} seconds before trying again.`,
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

    // 2. Parse and validate body
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const { jobId, token, repoName, isPrivate, description, files: incomingFiles, sourceUrl } = body || {};
    tokenForRedaction = typeof token === "string" ? token : undefined;

    if ((!jobId && !incomingFiles) || !token || !repoName) {
      return NextResponse.json(
        { error: "Missing required fields (token, repoName, or project data)." },
        { status: 400 }
      );
    }

    if (typeof token !== "string" || token.trim().length === 0 || token.length > 512) {
      return NextResponse.json({ error: "Invalid GitHub token format." }, { status: 400 });
    }

    if (typeof repoName !== "string" || !/^[a-zA-Z0-9._-]{1,100}$/.test(repoName.trim())) {
      return NextResponse.json(
        { error: "Repository name must be 1-100 characters and contain only letters, numbers, dashes, underscores, and dots." },
        { status: 400 }
      );
    }

    if (jobId && (typeof jobId !== "string" || !UUID_REGEX.test(jobId))) {
      return NextResponse.json({ error: "Invalid job identifier." }, { status: 400 });
    }

    const report = jobId ? getJob(jobId) : null;
    let files = report?.files;

    if (!files && incomingFiles && Array.isArray(incomingFiles)) {
      files = incomingFiles.map((f: any) => ({
        path: f.path,
        content: f.content,
        binary: f.binaryBase64 ? Buffer.from(f.binaryBase64, "base64") : undefined,
      }));
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Job session has expired. Please reconvert your site below to refresh files and push." },
        { status: 404 }
      );
    }

    const siteSource = report?.sourceUrl || sourceUrl || "site";
    const result = await pushToGitHub({
      token: token.trim(),
      repoName: repoName.trim(),
      isPrivate: Boolean(isPrivate),
      description: description || `Next.js site converted from ${siteSource} with Site2NextJS`,
      files,
    });

    return NextResponse.json({
      success: true,
      repoUrl: result.repoUrl,
      owner: result.owner,
      name: result.name,
    });
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : "Failed to push repository to GitHub.";
    const safeError = redactSecrets(rawError, tokenForRedaction);
    console.error("GitHub push error (sanitized):", safeError);

    return NextResponse.json(
      { error: safeError },
      { status: 500 }
    );
  }
}
