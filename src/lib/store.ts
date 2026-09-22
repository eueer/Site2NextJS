import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ConversionReport, ProjectFile } from "./types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// On Vercel / serverless, process.cwd() is read-only.
// Use os.tmpdir() which is always writable.
const CACHE_ROOT = path.join(os.tmpdir(), "site2nextjs-cache");
const JOBS_DIR = path.join(CACHE_ROOT, "jobs");
export const ASSETS_DIR = path.join(CACHE_ROOT, "assets");

// Ensure storage directories exist safely
try {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
} catch {}

// In-memory L1 cache for instant retrieval within serverless worker
const memoryCache = new Map<string, ConversionReport>();
const assetCache = new Map<string, Buffer>();

export function getCachedAsset(assetPath: string): Buffer | null {
  const normalized = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return assetCache.get(normalized) || null;
}

function isSafeFilePath(filePath: string): boolean {
  if (!filePath || filePath.startsWith("/") || filePath.startsWith("\\")) return false;
  const normalized = path.normalize(filePath);
  if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return false;
  return true;
}

export function saveJob(id: string, report: ConversionReport) {
  if (!id || !UUID_REGEX.test(id)) {
    console.error("Invalid job ID for saveJob:", id);
    return;
  }

  // 1. Save to L1 memory cache
  memoryCache.set(id, report);

  // Cache assets in memory for zero-latency serverless serving
  for (const f of report.files) {
    if (f.path.startsWith("public/assets/")) {
      const assetKey = f.path.replace(/^public/, "");
      const buf = f.binary || (typeof f.content === "string" ? Buffer.from(f.content, "utf8") : null);
      if (buf) {
        assetCache.set(assetKey, buf);
      }
    }
  }

  try {
    const jobDir = path.join(JOBS_DIR, id);
    fs.mkdirSync(jobDir, { recursive: true });

    // 2. Save metadata (previewHtml stored separately for speed & safety)
    const meta = {
      id,
      sourceUrl: report.sourceUrl,
      platform: report.platform,
      pages: report.pages,
      stats: report.stats,
      notes: report.notes,
      createdAt: Date.now(),
      filesMeta: report.files
        .filter((f) => isSafeFilePath(f.path))
        .map((f) => ({
          path: f.path,
          isBinary: Boolean(f.binary),
        })),
    };
    fs.writeFileSync(path.join(jobDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");

    // 3. Save preview.html
    if (report.previewHtml) {
      fs.writeFileSync(path.join(jobDir, "preview.html"), report.previewHtml, "utf8");
    }

    // 4. Save project files
    const filesDir = path.join(jobDir, "files");
    const canonicalFilesDir = path.resolve(filesDir);

    for (const f of report.files) {
      if (!isSafeFilePath(f.path)) {
        console.warn("Blocked potentially unsafe file path from writing:", f.path);
        continue;
      }

      const fullPath = path.resolve(filesDir, f.path);
      if (!fullPath.startsWith(canonicalFilesDir + path.sep)) {
        console.warn("Path traversal blocked:", f.path);
        continue;
      }

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      if (typeof f.content === "string") {
        fs.writeFileSync(fullPath, f.content, "utf8");
      } else if (f.binary) {
        fs.writeFileSync(fullPath, f.binary);
      }

      // If file is an asset under public/assets/, also mirror to ASSETS_DIR in tmp
      if (f.path.startsWith("public/assets/")) {
        const relAssetPath = f.path.replace(/^public\/assets\//, "");
        if (isSafeFilePath(relAssetPath)) {
          const globalAssetPath = path.resolve(ASSETS_DIR, relAssetPath);
          const canonicalAssetsDir = path.resolve(ASSETS_DIR);
          if (globalAssetPath.startsWith(canonicalAssetsDir + path.sep)) {
            fs.mkdirSync(path.dirname(globalAssetPath), { recursive: true });
            if (f.binary) {
              fs.writeFileSync(globalAssetPath, f.binary);
            } else if (typeof f.content === "string") {
              fs.writeFileSync(globalAssetPath, f.content, "utf8");
            }
          }
        }
      }
    }

    // 5. If local development (not Vercel read-only filesystem), mirror to host public/assets
    if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
      try {
        const sourceAssetsDir = path.join(filesDir, "public", "assets");
        if (fs.existsSync(sourceAssetsDir)) {
          const appPublicAssets = path.join(process.cwd(), "public", "assets");
          fs.mkdirSync(appPublicAssets, { recursive: true });
          fs.cpSync(sourceAssetsDir, appPublicAssets, { recursive: true });
        }
      } catch {}
    }
  } catch (err) {
    console.error(`Failed to persist job ${id} to disk:`, err);
  }
}

export function getJob(id: string): ConversionReport | null {
  if (!id || !UUID_REGEX.test(id)) {
    return null;
  }

  // Check L1 memory cache first
  if (memoryCache.has(id)) {
    return memoryCache.get(id)!;
  }

  const jobDir = path.join(JOBS_DIR, id);
  const metaPath = path.join(jobDir, "meta.json");

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
    const filesDir = path.join(jobDir, "files");
    const canonicalFilesDir = path.resolve(filesDir);

    // Load preview.html
    let previewHtml = meta.previewHtml || "";
    const previewPath = path.join(jobDir, "preview.html");
    if (fs.existsSync(previewPath)) {
      previewHtml = fs.readFileSync(previewPath, "utf8");
    }

    const files: ProjectFile[] = [];
    for (const fm of meta.filesMeta) {
      if (!isSafeFilePath(fm.path)) continue;
      const fullPath = path.resolve(filesDir, fm.path);
      if (!fullPath.startsWith(canonicalFilesDir + path.sep)) continue;

      if (fs.existsSync(fullPath)) {
        if (fm.isBinary) {
          files.push({
            path: fm.path,
            binary: fs.readFileSync(fullPath),
          });
        } else {
          files.push({
            path: fm.path,
            content: fs.readFileSync(fullPath, "utf8"),
          });
        }
      }
    }

    const report: ConversionReport = {
      sourceUrl: meta.sourceUrl,
      platform: meta.platform,
      pages: meta.pages,
      stats: meta.stats,
      notes: meta.notes,
      previewHtml,
      files,
    };

    // Populate L1 cache
    memoryCache.set(id, report);
    return report;
  } catch (err) {
    console.error("Failed to load job from persistent storage:", err);
    return null;
  }
}
