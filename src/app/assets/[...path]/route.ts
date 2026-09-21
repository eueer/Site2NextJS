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

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const parts = params.path;
    if (!parts || parts.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const relPath = path.join(...parts);
    // Security check against directory traversal
    if (relPath.includes("..")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const ext = path.extname(relPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // 1. Try in-memory asset cache (ultra-fast, zero-disk)
    const memData = getCachedAsset(`/assets/${relPath}`);
    if (memData) {
      return new Response(new Uint8Array(memData), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 2. Try global cache ASSETS_DIR in tmp
    let target = path.join(ASSETS_DIR, relPath);

    // 3. Try host app public/assets if exists
    if (!fs.existsSync(target)) {
      target = path.join(process.cwd(), "public", "assets", relPath);
    }

    // 4. Fallback: search in jobs directory in tmp
    if (!fs.existsSync(target)) {
      const jobsDir = path.join(os.tmpdir(), "site2nextjs-cache", "jobs");
      if (fs.existsSync(jobsDir)) {
        const jobs = fs.readdirSync(jobsDir);
        for (const j of jobs) {
          const candidate = path.join(jobsDir, j, "files", "public", "assets", relPath);
          if (fs.existsSync(candidate)) {
            target = candidate;
            break;
          }
        }
      }
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
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Asset serving error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
