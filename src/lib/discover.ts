import * as cheerio from "cheerio";
import { fetchText } from "./fetcher";
import { PageInfo } from "./types";

export function normalizeRoute(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function sameOrigin(urlStr: string, origin: string): boolean {
  try {
    return new URL(urlStr).origin === origin;
  } catch {
    return false;
  }
}

async function fromSitemap(origin: string): Promise<string[]> {
  try {
    const { text, status } = await fetchText(`${origin}/sitemap.xml`);
    if (status !== 200) return [];
    return [...text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  } catch {
    return [];
  }
}

async function fromSearchIndex(searchIndexUrl: string): Promise<string[]> {
  if (!searchIndexUrl) return [];
  try {
    const { text, status } = await fetchText(searchIndexUrl);
    if (status !== 200) return [];
    const json = JSON.parse(text);
    const urls: string[] = [];

    const walk = (val: unknown) => {
      if (typeof val === "string") {
        if (/^https?:\/\//i.test(val) || val.startsWith("/")) {
          urls.push(val);
        }
      } else if (Array.isArray(val)) {
        val.forEach(walk);
      } else if (val && typeof val === "object") {
        Object.values(val).forEach(walk);
      }
    };

    walk(json);
    return urls;
  } catch {
    return [];
  }
}

function fromLinks(html: string, origin: string): string[] {
  const $ = cheerio.load(html);
  const out: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      const abs = new URL(href, origin).toString();
      if (sameOrigin(abs, origin)) out.push(abs);
    } catch {}
  });
  return out;
}

export async function discoverPages(
  startUrl: string,
  startHtml: string,
  searchIndexUrl?: string,
  maxPages = 20
): Promise<PageInfo[]> {
  const start = new URL(startUrl);
  const origin = start.origin;
  const candidates = new Set<string>([startUrl]);

  const [sitemapUrls, searchUrls] = await Promise.all([
    fromSitemap(origin),
    searchIndexUrl ? fromSearchIndex(searchIndexUrl) : Promise.resolve([]),
  ]);

  [...sitemapUrls, ...searchUrls, ...fromLinks(startHtml, origin)].forEach((u) => {
    try {
      const abs = new URL(u, origin).toString();
      if (sameOrigin(abs, origin)) {
        candidates.add(abs.split("#")[0].split("?")[0]);
      }
    } catch {}
  });

  const byRoute = new Map<string, PageInfo>();
  byRoute.set(normalizeRoute(start.pathname), {
    route: normalizeRoute(start.pathname),
    url: startUrl,
  });

  for (const u of candidates) {
    const parsed = new URL(u);
    // Skip static assets
    if (/\.(xml|json|png|jpe?g|webp|svg|ico|css|js|woff2?)$/i.test(parsed.pathname)) {
      continue;
    }
    const route = normalizeRoute(parsed.pathname);
    if (!byRoute.has(route)) {
      byRoute.set(route, { route, url: u });
    }
    if (byRoute.size >= maxPages) break;
  }

  return [...byRoute.values()];
}
