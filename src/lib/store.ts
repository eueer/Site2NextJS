import fs from "node:fs";
import path from "node:path";
import { ConversionReport, ProjectFile } from "./types";

const CACHE_ROOT = path.join(process.cwd(), ".framer-cache");
const JOBS_DIR = path.join(CACHE_ROOT, "jobs");
export const ASSETS_DIR = path.join(CACHE_ROOT, "assets");

// Ensure storage directories exist
try {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
} catch {}

// In-memory L1 cache for instant retrieval within process
const memoryCache = new Map<string, ConversionReport>();

export function saveJob(id: string, report: ConversionReport) {
  // 1. Save to L1 memory cache
  memoryCache.set(id, report);

  try {
    const jobDir = path.join(JOBS_DIR, id);
    fs.mkdirSync(jobDir, { recursive: true });

    // 2. Save metadata (previewHtml stored separately for speed & safety)
    const meta = {
      id,
      sourceUrl: report.sourceUrl,
      pages: report.pages,
      stats: report.stats,
      notes: report.notes,
      createdAt: Date.now(),
      filesMeta: report.files.map((f) => ({
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
    for (const f of report.files) {
      const fullPath = path.join(filesDir, f.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      if (typeof f.content === "string") {
        fs.writeFileSync(fullPath, f.content, "utf8");
      } else if (f.binary) {
        fs.writeFileSync(fullPath, f.binary);
      }

      // If file is an asset under public/assets/, also mirror to ASSETS_DIR
      if (f.path.startsWith("public/assets/")) {
        const relAssetPath = f.path.replace(/^public\/assets\//, "");
        const globalAssetPath = path.join(ASSETS_DIR, relAssetPath);
        fs.mkdirSync(path.dirname(globalAssetPath), { recursive: true });
        if (f.binary) {
          fs.writeFileSync(globalAssetPath, f.binary);
        } else if (typeof f.content === "string") {
          fs.writeFileSync(globalAssetPath, f.content, "utf8");
        }
      }
    }

    // 5. Also copy to host app's public/assets so static server has them immediately
    try {
      const sourceAssetsDir = path.join(filesDir, "public", "assets");
      if (fs.existsSync(sourceAssetsDir)) {
        const appPublicAssets = path.join(process.cwd(), "public", "assets");
        fs.mkdirSync(appPublicAssets, { recursive: true });
        fs.cpSync(sourceAssetsDir, appPublicAssets, { recursive: true });
      }
    } catch {}
  } catch (err) {
    console.error(`Failed to persist job ${id} to disk:`, err);
  }
}

export function getJob(id: string): ConversionReport | null {
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

    // Load preview.html
    let previewHtml = meta.previewHtml || "";
    const previewPath = path.join(jobDir, "preview.html");
    if (fs.existsSync(previewPath)) {
      previewHtml = fs.readFileSync(previewPath, "utf8");
    }

    const files: ProjectFile[] = [];
    for (const fm of meta.filesMeta) {
      const fullPath = path.join(filesDir, fm.path);
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
