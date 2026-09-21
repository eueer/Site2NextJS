import * as cheerio from "cheerio";

export type PlatformType = "framer" | "webflow" | "wordpress" | "html";

export interface PlatformDetection {
  platform: PlatformType;
  isFramer: boolean;
  label: string;
  reasons: string[];
}

export function detectPlatform($: cheerio.CheerioAPI): PlatformDetection {
  const reasons: string[] = [];
  const generator = $('meta[name="generator"]').attr("content") || "";

  // 1. Framer check
  if (/framer/i.test(generator)) reasons.push(`generator meta = ${generator}`);
  if ($('meta[name="framer-search-index"]').length) reasons.push("framer-search-index meta tag");
  if ($("script[data-framer-bundle]").length) reasons.push("data-framer-bundle script tag");
  if ($("[data-framer-appear-id]").length) reasons.push("data-framer-appear-id attributes");
  if ($("style[data-framer-css-ssr-minified]").length) reasons.push("framer SSR minified CSS");
  if ($('script[src*="events.framer.com"]').length) reasons.push("framer events telemetry script");
  if ($('script[src*="framerusercontent.com"]').length) reasons.push("framerusercontent bundle scripts");

  if (reasons.length > 0) {
    return {
      platform: "framer",
      isFramer: true,
      label: "Framer",
      reasons,
    };
  }

  // 2. Webflow check
  if ($("[data-wf-page]").length || $("[data-wf-site]").length || /webflow/i.test(generator) || $('html[data-wf-domain]').length) {
    return {
      platform: "webflow",
      isFramer: false,
      label: "Webflow",
      reasons: ["Webflow attributes or generator tag detected"],
    };
  }

  // 3. WordPress check
  if (/wordpress/i.test(generator) || $('link[href*="/wp-content/"]').length || $('script[src*="/wp-content/"]').length) {
    return {
      platform: "wordpress",
      isFramer: false,
      label: "WordPress",
      reasons: ["WordPress assets or generator tag detected"],
    };
  }

  // 4. Generic HTML / Modern Web
  return {
    platform: "html",
    isFramer: false,
    label: "Standard HTML / Web App",
    reasons: ["Standard web document"],
  };
}

export function detectFramer($: cheerio.CheerioAPI): { isFramer: boolean; reasons: string[] } {
  const result = detectPlatform($);
  return {
    isFramer: result.isFramer,
    reasons: result.reasons,
  };
}

export function extractMeta($: cheerio.CheerioAPI) {
  return {
    title: $("title").first().text().trim(),
    description: $('meta[name="description"]').attr("content") || "",
    lang: $("html").attr("lang") || "en",
    canonical: $('link[rel="canonical"]').attr("href") || "",
    viewport: $('meta[name="viewport"]').attr("content") || "width=device-width, initial-scale=1",
    favicon: $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href") || "",
    ogTitle: $('meta[property="og:title"]').attr("content") || "",
    ogDescription: $('meta[property="og:description"]').attr("content") || "",
    ogImage: $('meta[property="og:image"]').attr("content") || "",
    searchIndexUrl: $('meta[name="framer-search-index"]').attr("content") || "",
  };
}

export function collectStyleText($: cheerio.CheerioAPI): string {
  let css = "";
  $("style").each((_, el) => {
    css += "\n" + ($(el).html() || "");
  });
  return css;
}
