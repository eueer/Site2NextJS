import * as cheerio from "cheerio";
import crypto from "node:crypto";

export function collectFontUrls(css: string, baseUrl?: string): Set<string> {
  const out = new Set<string>();
  
  // 1. Match font url(...) expressions in CSS
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+?\.(?:woff2|woff|ttf|otf)(?:\?[^'")\s]*)?)['"]?\s*\)/gi)) {
    const raw = m[1].trim();
    if (raw.startsWith("data:") || raw.startsWith("blob:")) continue;
    try {
      if (/^https?:\/\//i.test(raw)) {
        out.add(raw);
      } else if (baseUrl) {
        out.add(new URL(raw, baseUrl).toString());
      }
    } catch {}
  }

  // 2. Also match direct absolute font URLs
  for (const m of css.matchAll(/https?:\/\/[^'")\s]+\.(?:woff2|woff|ttf|otf)(?:\?[^'")\s]*)?/gi)) {
    out.add(m[0]);
  }

  return out;
}

export function fontLocalPath(url: string): string {
  const ext = (/\.([a-z0-9]+)(\?|$)/i.exec(url)?.[1] || "woff2").toLowerCase();
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  return `/assets/fonts/${hash}.${ext}`;
}

export function ensureFontDisplaySwap($: cheerio.CheerioAPI): number {
  let patched = 0;
  $("style").each((_, el) => {
    const $el = $(el);
    const css = $el.html() || "";
    if (!css.includes("@font-face")) return;
    const next = css.replace(/@font-face\s*\{([^}]*)\}/gi, (whole, body) => {
      if (/font-display\s*:/i.test(body)) return whole;
      patched++;
      return `@font-face{${body.trim()};font-display:swap;}`;
    });
    if (next !== css) $el.html(next);
  });
  return patched;
}

export function removeFontPreconnects($: cheerio.CheerioAPI): number {
  let removed = 0;
  $('link[href*="fonts.gstatic.com"], link[href*="fonts.googleapis.com"]').each((_, el) => {
    $(el).remove();
    removed++;
  });
  return removed;
}
