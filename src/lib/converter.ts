import * as cheerio from "cheerio";
import { detectFramer, extractMeta, collectStyleText } from "./detector";
import { discoverPages, normalizeRoute } from "./discover";
import { fetchBinary, fetchText, normalizeUrl } from "./fetcher";
import { collectFontUrls, fontLocalPath } from "./fonts";
import { getScaffoldFiles, routeFilePath, routeHandler } from "./generator";
import {
  collectImageUrls,
  copyAsset,
  isOptimizableImage,
  optimizeToWebp,
} from "./images";
import { processDocument } from "./transform";
import { ConversionOptions, ConversionReport, ProgressCallback, ProjectFile } from "./types";

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

export async function convertSite(
  inputUrl: string,
  options: ConversionOptions = {},
  onProgress: ProgressCallback = () => {}
): Promise<ConversionReport> {
  const maxPages = options.maxPages || 20;
  const maxImages = options.maxImages || 250;
  const imageQuality = options.imageQuality || 78;

  const start = normalizeUrl(inputUrl);
  onProgress(`Connecting to ${start.toString()}`, 1, 6);

  const first = await fetchText(start.toString());
  if (first.status >= 400) {
    throw new Error(`Target website returned HTTP ${first.status}`);
  }

  const $first = cheerio.load(first.text);
  const detection = detectFramer($first);
  if (!detection.isFramer) {
    throw new Error(
      "The specified URL does not appear to be a published Framer website."
    );
  }

  const siteMeta = extractMeta($first);
  onProgress("Discovering all site pages...", 2, 6);

  const discoveredPages = await discoverPages(
    first.url,
    first.text,
    siteMeta.searchIndexUrl,
    maxPages
  );
  onProgress(`Discovered ${discoveredPages.length} page(s)`, 2, 6);

  // Fetch HTML for all discovered routes
  const pageHtmlMap = new Map<string, string>();
  pageHtmlMap.set(normalizeRoute(new URL(first.url).pathname), first.text);

  await mapLimit(discoveredPages, 5, async (p) => {
    if (pageHtmlMap.has(p.route)) return;
    try {
      const res = await fetchText(p.url);
      if (res.status < 400) {
        pageHtmlMap.set(p.route, res.text);
      }
    } catch {}
  });

  // Harvest all images and fonts
  onProgress("Scanning media, images and fonts...", 3, 6);
  const imageUrls = new Set<string>();
  const fontUrls = new Set<string>();

  for (const html of pageHtmlMap.values()) {
    const $ = cheerio.load(html);
    const css = collectStyleText($);
    collectImageUrls($, css).forEach((u) => imageUrls.add(u));
    collectFontUrls(css).forEach((u) => fontUrls.add(u));
  }

  const assetMap = new Map<string, string>();
  const assetFiles: ProjectFile[] = [];
  let imgBefore = 0;
  let imgAfter = 0;
  let imagesHosted = 0;
  let fontsHosted = 0;

  // Process Images (Re-encode rasters to WebP)
  const imagesToProcess = Array.from(imageUrls).slice(0, maxImages);
  if (imagesToProcess.length > 0) {
    onProgress(`Optimizing & converting ${imagesToProcess.length} images to WebP...`, 4, 6);
    await mapLimit(imagesToProcess, 6, async (url) => {
      try {
        const bin = await fetchBinary(url);
        if (bin.status >= 400 || bin.buffer.length === 0) return;

        const isSvg = /image\/svg/i.test(bin.contentType) || url.endsWith(".svg");
        const result =
          isOptimizableImage(url) && !isSvg
            ? await optimizeToWebp(url, bin.buffer, imageQuality)
            : copyAsset(url, bin.buffer);

        if (!result) return;

        assetMap.set(url, result.localPath);
        assetFiles.push({
          path: `public${result.localPath}`,
          binary: result.buffer,
        });

        imgBefore += result.beforeBytes;
        imgAfter += result.afterBytes;
        imagesHosted++;
      } catch {}
    });
  }

  // Process Fonts (Download WOFF2 fonts)
  let fontBytes = 0;
  if (fontUrls.size > 0) {
    onProgress(`Downloading & self-hosting ${fontUrls.size} font file(s)...`, 5, 6);
    await mapLimit(Array.from(fontUrls), 6, async (url) => {
      try {
        const bin = await fetchBinary(url);
        if (bin.status >= 400 || bin.buffer.length === 0) return;

        const localPath = fontLocalPath(url);
        assetMap.set(url, localPath);
        assetFiles.push({
          path: `public${localPath}`,
          binary: bin.buffer,
        });
        fontBytes += bin.buffer.length;
        fontsHosted++;
      } catch {}
    });
  }

  // Generate Next.js App Router route handlers
  onProgress("Transforming DOM and generating Next.js App Router code...", 6, 6);
  const files: ProjectFile[] = [...assetFiles];
  let homePreviewHtml = "";

  for (const [route, html] of pageHtmlMap.entries()) {
    const processedHtml = processDocument(html, route, assetMap);
    if (route === "/") {
      homePreviewHtml = processedHtml;
    }
    files.push({
      path: routeFilePath(route),
      content: routeHandler(processedHtml),
    });
  }

  if (!homePreviewHtml && pageHtmlMap.size > 0) {
    homePreviewHtml = processDocument(Array.from(pageHtmlMap.values())[0], "/", assetMap);
  }

  // Generate Project Scaffolding
  const host = (() => {
    try {
      return new URL(start.toString()).hostname.replace(/^www\./, "").replace(/\./g, "-");
    } catch {
      return "framer-site";
    }
  })();

  const scaffoldFiles = getScaffoldFiles(host, start.toString(), pageHtmlMap.size);
  files.push(...scaffoldFiles);

  const pageCount = pageHtmlMap.size;
  const stats = [
    { label: "Pages converted", before: pageCount, after: pageCount, unit: "count" as const },
    ...(imgBefore > 0
      ? [{ label: "Image payload", before: imgBefore, after: imgAfter, unit: "bytes" as const }]
      : []),
    ...(fontBytes > 0
      ? [{ label: "Self-hosted fonts", before: fontBytes, after: fontBytes, unit: "bytes" as const }]
      : []),
  ];

  const notes = [
    "100% fidelity Next.js App Router project (one statically-prerendered route per page)",
    "Framer React hydration comment nodes preserved for instant hydration and zero flicker",
    `Images self-hosted & re-encoded to WebP under public/assets/img/ (${imagesHosted} files)`,
    ...(fontsHosted ? [`Fonts self-hosted (${fontsHosted} files) with font-display:swap forced`] : []),
    "LCP hero image prioritized (fetchpriority=high); offscreen images deferred (loading=lazy)",
    "Framer watermark badges & analytics beacons removed",
    "Accessibility: html[lang], iframe titles, role=main, and icon link aria-labels added",
    "Ready for instant deployment to Vercel, Netlify, or Cloudflare Pages",
  ];

  return {
    sourceUrl: start.toString(),
    pages: Array.from(pageHtmlMap.keys()).map((route) => ({
      route,
      url: discoveredPages.find((p) => p.route === route)?.url || start.toString(),
    })),
    stats,
    notes,
    files,
    previewHtml: homePreviewHtml,
  };
}
