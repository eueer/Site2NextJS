import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { ASSETS_DIR, getCachedAsset } from "@/lib/store";
import os from "node:os";

const MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const ALLOWED_NAME_REGEX = /^[a-zA-Z0-9_\-\.]+$/;

function isPathConfined(targetPath: string, allowedRoot: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(allowedRoot);
  return (
    resolvedTarget === resolvedRoot ||
    resolvedTarget.startsWith(resolvedRoot + path.sep)
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const parts = params.path;
    if (!parts || parts.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // 1. Strict validation of all path segments
    for (const part of parts) {
      if (!part || !ALLOWED_NAME_REGEX.test(part) || part === "." || part === "..") {
        return new NextResponse("Forbidden: Invalid path segment", { status: 403 });
      }
    }

    const relPath = path.join(...parts);
    if (relPath.includes("..") || relPath.includes("\0")) {
      return new NextResponse("Forbidden: Directory traversal detected", { status: 403 });
    }

    const ext = path.extname(relPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // 2. Try in-memory asset cache (ultra-fast, zero-disk)
    const memData = getCachedAsset(`/assets/${relPath}`);
    if (memData) {
      return new Response(new Uint8Array(memData), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // 3. Try global cache ASSETS_DIR in tmp
    let target = path.join(ASSETS_DIR, relPath);
    let allowedBase = ASSETS_DIR;

    // 4. Try host app public/assets if exists
    if (!fs.existsSync(target) || !isPathConfined(target, ASSETS_DIR)) {
      const publicAssetsDir = path.join(process.cwd(), "public", "assets");
      const candidatePublic = path.join(publicAssetsDir, relPath);
      if (fs.existsSync(candidatePublic) && isPathConfined(candidatePublic, publicAssetsDir)) {
        target = candidatePublic;
        allowedBase = publicAssetsDir;
      }
    }

    // 5. Fallback: search in jobs directory in tmp
    if (!fs.existsSync(target) || !isPathConfined(target, allowedBase)) {
      const jobsDir = path.join(os.tmpdir(), "site2nextjs-cache", "jobs");
      if (fs.existsSync(jobsDir)) {
        const jobs = fs.readdirSync(jobsDir);
        for (const j of jobs) {
          // Verify job name is clean UUID
          if (!/^[0-9a-f-]{36}$/i.test(j)) continue;
          const candidate = path.join(jobsDir, j, "files", "public", "assets", relPath);
          const jobAssetsBase = path.join(jobsDir, j, "files", "public", "assets");
          if (fs.existsSync(candidate) && isPathConfined(candidate, jobAssetsBase)) {
            target = candidate;
            allowedBase = jobAssetsBase;
            break;
          }
        }
      }
    }

    // Final security boundary verification
    if (!isPathConfined(target, allowedBase)) {
      return new NextResponse("Forbidden: Access outside permitted directory", { status: 403 });
    }

    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      return new NextResponse("Asset not found", { status: 404 });
    }

    const fileExt = path.extname(target).toLowerCase();
    const resolvedContentType = MIME_TYPES[fileExt] || contentType;
    const data = fs.readFileSync(target);

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": resolvedContentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error("Asset serving error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
