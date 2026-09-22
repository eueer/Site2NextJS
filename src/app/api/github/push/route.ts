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

    // 2. Enforce request payload size limit (15MB max)
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Payload exceeds maximum allowed size (15MB)." }, { status: 413 });
    }

    // 3. Parse and validate body
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

    if (!files && incomingFiles) {
      if (!Array.isArray(incomingFiles)) {
        return NextResponse.json({ error: "Invalid files format: must be an array." }, { status: 400 });
      }
      if (incomingFiles.length > 500) {
        return NextResponse.json({ error: "Too many files in payload (max 500)." }, { status: 400 });
      }

      files = [];
      for (const f of incomingFiles) {
        if (!f || typeof f.path !== "string" || !f.path.trim()) {
          return NextResponse.json({ error: "Invalid file object in payload." }, { status: 400 });
        }
        const rawPath = f.path.trim().replace(/\\/g, "/");
        if (rawPath.includes("..") || rawPath.startsWith("/") || rawPath.includes("\0")) {
          return NextResponse.json({ error: `Path traversal detected in file: ${f.path}` }, { status: 400 });
        }
        const normalized = rawPath.replace(/^\/+/, "");
        if (
          normalized.startsWith(".github/") ||
          normalized === ".github" ||
          normalized.startsWith(".git/") ||
          normalized === ".git" ||
          normalized.includes("/.git/") ||
          normalized.includes("/.github/") ||
          normalized === ".env" ||
          normalized.startsWith(".env.")
        ) {
          return NextResponse.json(
            { error: `Forbidden file path: ${f.path}. Uploading CI workflows, git metadata, or env files is restricted for security.` },
            { status: 403 }
          );
        }

        if (f.content && typeof f.content === "string") {
          if (f.content.length > 10 * 1024 * 1024) {
            return NextResponse.json({ error: `File ${f.path} exceeds max content size (10MB).` }, { status: 413 });
          }
          files.push({ path: normalized, content: f.content });
        } else if (f.binaryBase64 && typeof f.binaryBase64 === "string") {
          if (f.binaryBase64.length > 15 * 1024 * 1024) {
            return NextResponse.json({ error: `Binary file ${f.path} exceeds max size (15MB).` }, { status: 413 });
          }
          files.push({
            path: normalized,
            binary: Buffer.from(f.binaryBase64, "base64"),
          });
        } else {
          return NextResponse.json({ error: `File ${f.path} must contain text content or binaryBase64.` }, { status: 400 });
        }
      }
    }

    if (files) {
      // Defense-in-depth: sanitize any existing file lists against dangerous paths
      files = files.filter((f) => {
        const p = f.path.replace(/\\/g, "/").replace(/^\/+/, "");
        return (
          !p.startsWith(".github/") &&
          !p.startsWith(".git/") &&
          !p.includes("..") &&
          !p.includes("/.git/") &&
          !p.includes("/.github/")
        );
      });
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
