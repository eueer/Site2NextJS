import * as cheerio from "cheerio";
import crypto from "node:crypto";
import sharp from "sharp";

const RASTER_EXT = /\.(png|jpe?g|webp|avif)(\?|$)/i;
const MAX_WIDTH = 1920;

export function hashName(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
}

export function collectImageUrls($: cheerio.CheerioAPI, cssText: string, baseUrl?: string): Set<string> {
  const urls = new Set<string>();
  const add = (u?: string) => {
    if (!u) return;
    const trimmed = u.trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("javascript:")) {
      return;
    }

    try {
      if (baseUrl && !/^https?:\/\//i.test(trimmed)) {
        const abs = new URL(trimmed, baseUrl).toString();
        urls.add(abs);
      } else if (/^https?:\/\//i.test(trimmed)) {
        urls.add(trimmed);
      }
    } catch {
      // Ignore malformed URLs
    }
  };

  $("img").each((_, el) => {
    add($(el).attr("src"));
    parseSrcset($(el).attr("srcset")).forEach(add);
  });

  $("source").each((_, el) => {
    parseSrcset($(el).attr("srcset")).forEach(add);
    add($(el).attr("src"));
  });

  $("video[poster]").each((_, el) => add($(el).attr("poster")));

  $("[style]").each((_, el) => {
    extractCssUrls($(el).attr("style") || "").forEach(add);
  });

  $('link[as="image"], link[rel="icon"], link[rel="apple-touch-icon"]').each((_, el) => add($(el).attr("href")));

  extractCssUrls(cssText).forEach(add);

  return urls;
}

export function parseSrcset(srcset?: string): string[] {
  if (!srcset) return [];
  return srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

export function extractCssUrls(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const raw = m[1].trim();
    if (!raw.startsWith("data:") && !raw.startsWith("blob:")) {
      out.push(raw);
    }
  }
  return out;
}

export function isOptimizableImage(url: string): boolean {
  return RASTER_EXT.test(url) && !/\.svg(\?|$)/i.test(url);
}

export async function optimizeToWebp(
  url: string,
  buffer: Buffer,
  quality = 78
): Promise<{ localPath: string; buffer: Buffer; beforeBytes: number; afterBytes: number } | null> {
  try {
    const img = sharp(buffer, { animated: true });
    const meta = await img.metadata();
    let pipeline = img;

    if (meta.width && meta.width > MAX_WIDTH) {
      pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }

    const out = await pipeline.webp({ quality, effort: 4 }).toBuffer();
    return {
      localPath: `/assets/img/${hashName(url)}.webp`,
      buffer: out,
      beforeBytes: buffer.length,
      afterBytes: out.length,
    };
  } catch {
    return null;
  }
}

export function copyAsset(
  url: string,
  buffer: Buffer
): { localPath: string; buffer: Buffer; beforeBytes: number; afterBytes: number } {
  const ext = (/\.([a-z0-9]+)(\?|$)/i.exec(url)?.[1] || "png").toLowerCase();
  return {
    localPath: `/assets/img/${hashName(url)}.${ext}`,
    buffer,
    beforeBytes: buffer.length,
    afterBytes: buffer.length,
  };
}

export function rewriteImageRefs($: cheerio.CheerioAPI, map: Map<string, string>, baseUrl?: string) {
  const remap = (u?: string) => {
    if (!u) return null;
    const trimmed = u.trim();
    if (map.has(trimmed)) return map.get(trimmed)!;
    if (baseUrl) {
      try {
        const abs = new URL(trimmed, baseUrl).toString();
        if (map.has(abs)) return map.get(abs)!;
      } catch {}
    }
    return null;
  };

  $("img").each((_, el) => {
    const $el = $(el);
    const newSrc = remap($el.attr("src"));
    if (newSrc) $el.attr("src", newSrc);
    const srcset = $el.attr("srcset");
    if (srcset) $el.attr("srcset", rewriteSrcset(srcset, map, baseUrl));
  });

  $("source").each((_, el) => {
    const $el = $(el);
    const srcset = $el.attr("srcset");
    if (srcset) $el.attr("srcset", rewriteSrcset(srcset, map, baseUrl));
    const newSrc = remap($el.attr("src"));
    if (newSrc) $el.attr("src", newSrc);
  });

  $("[style]").each((_, el) => {
    const $el = $(el);
    const style = $el.attr("style") || "";
    const next = rewriteCssUrls(style, map, baseUrl);
    if (next !== style) $el.attr("style", next);
  });

  $("video[poster]").each((_, el) => {
    const newPoster = remap($(el).attr("poster"));
    if (newPoster) $(el).attr("poster", newPoster);
  });

  $('link[as="image"], link[rel="icon"], link[rel="apple-touch-icon"]').each((_, el) => {
    const newHref = remap($(el).attr("href"));
    if (newHref) $(el).attr("href", newHref);
  });

  $("style").each((_, el) => {
    const $el = $(el);
    const css = $el.html() || "";
    const next = rewriteCssUrls(css, map, baseUrl);
    if (next !== css) $el.html(next);
  });
}

export function rewriteSrcset(srcset: string, map: Map<string, string>, baseUrl?: string): string {
  return srcset
    .split(",")
    .map((part) => {
      const seg = part.trim();
      const [url, ...descr] = seg.split(/\s+/);
      const trimmed = url.trim();
      let local = map.get(trimmed);
      if (!local && baseUrl) {
        try {
          const abs = new URL(trimmed, baseUrl).toString();
          local = map.get(abs);
        } catch {}
      }
      return local ? [local, ...descr].join(" ") : seg;
    })
    .join(", ");
}

export function rewriteCssUrls(css: string, map: Map<string, string>, baseUrl?: string): string {
  return css.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (whole, url) => {
    const raw = String(url).trim();
    let local = map.get(raw);
    if (!local && baseUrl) {
      try {
        const abs = new URL(raw, baseUrl).toString();
        local = map.get(abs);
      } catch {}
    }
    return local ? `url(${local})` : whole;
  });
}
